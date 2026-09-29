// ---- Mosquito Mike sales worker (Cloudflare Workers, free plan) ----
// 1. Discord sign-in: only members of our Discord server get in. Their server nickname is their rep name,
//    and members with an admin role (ADMIN_ROLE_IDS) can open the leaderboard.
// 2. Sales API: stores Premier sales from the calculator in a D1 database and serves the leaderboard.
//
// Settings (Cloudflare dashboard → this Worker → Settings → Variables and Secrets), see TRACKING_SETUP.md:
//   DISCORD_CLIENT_ID      Discord application's Client ID
//   DISCORD_CLIENT_SECRET  (secret) Discord application's Client Secret
//   DISCORD_GUILD_ID       Our Discord server's ID
//   ADMIN_ROLE_IDS         Role IDs that can see the leaderboard, comma-separated
//   ADMIN_USER_IDS         (optional) Discord user IDs that can see the leaderboard, comma-separated
//   REQUIRED_ROLE_IDS      (optional) Only members with one of these roles can sign in, comma-separated
//   ALLOWED_ORIGINS        Where the calculator is hosted, e.g. https://showingbills.github.io
//   SESSION_SECRET         (secret) Any long random string; signs the sign-in sessions
//   DB                     D1 database binding (tables are created automatically)

const DISCORD_API = 'https://discord.com/api/v10';
const SESSION_DAYS = 30;     // Reps sign in with Discord again after this, which re-checks they're still in the server
const REP_EDIT_HOURS = 12;   // Reps can change/remove their own sale for this long (Back → Pitched, add-on change)
const LOGIN_MINUTES = 10;    // Time allowed on Discord's sign-in screen
const ADDONS = ['none', 'insect_rodent_plan', 'insect_plan'];

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        try {
            if (url.pathname === '/login') return await handleLogin(url, env);
            if (url.pathname === '/callback') return await handleCallback(request, url, env);
            if (url.pathname.startsWith('/api/')) return await handleApi(request, url, env);
            if (url.pathname === '/') return new Response('Mosquito Mike sales worker is running.');
            return new Response('Not found', { status: 404 });
        } catch (err) {
            console.error(err);
            return url.pathname.startsWith('/api/')
                ? json(request, env, { error: 'server_error' }, 500)
                : new Response('Something went wrong. Go back to the calculator and try again.', { status: 500 });
        }
    }
};

// ---- Helpers ----

function list(value) {
    return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
}

function base64url(bytes) {
    let bin = '';
    new Uint8Array(bytes).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str) {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function hmacKey(env) {
    if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
    return crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_SECRET),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// "<payload>.<signature>". `kind` keeps a login state from ever passing as a session and vice versa.
async function signToken(env, kind, data) {
    const payload = base64url(new TextEncoder().encode(JSON.stringify(data)));
    const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(`${kind}.${payload}`));
    return `${payload}.${base64url(sig)}`;
}

async function verifyToken(env, kind, token) {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    try {
        const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), fromBase64url(sig),
            new TextEncoder().encode(`${kind}.${payload}`));
        if (!ok) return null;
        const data = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
        return data.exp && data.exp > Date.now() ? data : null;
    } catch (err) {
        return null;
    }
}

function isAllowedReturn(env, returnUrl) {
    try {
        const u = new URL(returnUrl);
        return list(env.ALLOWED_ORIGINS).includes(u.origin);
    } catch (err) {
        return false;
    }
}

function getCookie(request, name) {
    const match = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? match[1] : null;
}

function redirect(location, headers = {}) {
    return new Response(null, { status: 302, headers: { Location: location, ...headers } });
}

// ---- Discord sign-in ----

async function handleLogin(url, env) {
    const returnUrl = url.searchParams.get('return') || '';
    if (!isAllowedReturn(env, returnUrl)) {
        return new Response('This calculator address isn’t allowed. Add it to ALLOWED_ORIGINS.', { status: 400 });
    }

    // The nonce also goes in a cookie, so only the browser that started the sign-in can finish it
    const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
    const state = await signToken(env, 'state', { r: returnUrl, n: nonce, exp: Date.now() + LOGIN_MINUTES * 60000 });
    const discordUrl = 'https://discord.com/oauth2/authorize?' + new URLSearchParams({
        response_type: 'code',
        client_id: env.DISCORD_CLIENT_ID,
        scope: 'identify guilds.members.read',
        redirect_uri: `${url.origin}/callback`,
        state,
        prompt: 'none' // Skip Discord's "Authorize" screen after the first time
    });
    return redirect(discordUrl, {
        'Set-Cookie': `mm_login=${nonce}; Path=/callback; Max-Age=${LOGIN_MINUTES * 60}; HttpOnly; Secure; SameSite=Lax`
    });
}

async function handleCallback(request, url, env) {
    const state = await verifyToken(env, 'state', url.searchParams.get('state'));
    if (!state || !isAllowedReturn(env, state.r)) {
        return new Response('That sign-in link expired. Go back to the calculator and tap “Sign in with Discord” again.', { status: 400 });
    }
    const clearCookie = { 'Set-Cookie': 'mm_login=; Path=/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax' };
    const fail = code => redirect(`${state.r}#loginError=${code}`, clearCookie);

    if (getCookie(request, 'mm_login') !== state.n) return fail('expired');
    if (url.searchParams.get('error')) return fail('denied');
    const code = url.searchParams.get('code');
    if (!code) return fail('failed');

    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${url.origin}/callback`,
            client_id: env.DISCORD_CLIENT_ID,
            client_secret: env.DISCORD_CLIENT_SECRET
        })
    });
    if (!tokenRes.ok) {
        console.error('Discord token exchange failed', tokenRes.status, await tokenRes.text());
        return fail('failed');
    }
    const { access_token: accessToken } = await tokenRes.json();

    // Our server's member record for whoever signed in — 404 means they aren't in the server
    const memberRes = await fetch(`${DISCORD_API}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (memberRes.status === 404) return fail('not_member');
    if (!memberRes.ok) {
        console.error('Discord member lookup failed', memberRes.status, await memberRes.text());
        return fail('failed');
    }
    const member = await memberRes.json();
    const user = member.user;
    const roles = member.roles || [];

    const admin = roles.some(r => list(env.ADMIN_ROLE_IDS).includes(r)) || list(env.ADMIN_USER_IDS).includes(user.id);
    const requiredRoles = list(env.REQUIRED_ROLE_IDS);
    if (requiredRoles.length && !admin && !roles.some(r => requiredRoles.includes(r))) return fail('missing_role');

    const rep = {
        id: user.id,
        name: (member.nick || user.global_name || user.username || 'Rep').slice(0, 60),
        avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : null,
        admin
    };

    await ensureSchema(env);
    await env.DB.prepare(`
        INSERT INTO reps (id, name, avatar, admin, last_login) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar,
            admin = excluded.admin, last_login = excluded.last_login
    `).bind(rep.id, rep.name, rep.avatar, admin ? 1 : 0, Date.now()).run();

    const session = await signToken(env, 'session', { ...rep, exp: Date.now() + SESSION_DAYS * 86400000 });
    return redirect(`${state.r}#session=${session}`, clearCookie);
}

// ---- Database ----

let schemaReady = null;

function ensureSchema(env) {
    schemaReady = schemaReady || env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS reps (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT,
            admin INTEGER NOT NULL DEFAULT 0,
            last_login INTEGER NOT NULL
        )`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS sales (
            id TEXT PRIMARY KEY,
            rep_id TEXT NOT NULL,
            rep_name TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            acres REAL,
            tier TEXT,
            rate REAL,
            discounted REAL,
            monthly REAL NOT NULL,
            addon TEXT NOT NULL,
            addon_label TEXT,
            addon_monthly REAL NOT NULL,
            total_monthly REAL NOT NULL,
            annual_value REAL NOT NULL,
            commission REAL NOT NULL
        )`),
        env.DB.prepare('CREATE INDEX IF NOT EXISTS sales_created_at ON sales (created_at)')
    ]).catch(err => {
        schemaReady = null;
        throw err;
    });
    return schemaReady;
}

// ---- Sales API ----

function corsHeaders(request, env) {
    const origin = request.headers.get('Origin');
    if (!origin || !list(env.ALLOWED_ORIGINS).includes(origin)) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };
}

function json(request, env, data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) }
    });
}

async function handleApi(request, url, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });

    const auth = request.headers.get('Authorization') || '';
    const session = await verifyToken(env, 'session', auth.replace(/^Bearer\s+/i, ''));
    if (!session) return json(request, env, { error: 'signed_out' }, 401);

    await ensureSchema(env);

    const saleMatch = url.pathname.match(/^\/api\/sales\/([A-Za-z0-9_-]{8,64})$/);
    if (saleMatch && request.method === 'PUT') return putSale(request, env, session, saleMatch[1]);
    if (saleMatch && request.method === 'DELETE') return deleteSale(request, env, session, saleMatch[1]);
    if (url.pathname === '/api/sales' && request.method === 'GET') return listSales(request, url, env, session);
    return json(request, env, { error: 'not_found' }, 404);
}

// Checks what the calculator sent; returns null if anything is off
function readSale(body) {
    const num = (v, max) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
    const text = (v, max) => typeof v === 'string' && v.length <= max;
    if (!body || typeof body !== 'object') return null;
    if (!ADDONS.includes(body.addon)) return null;
    if (!num(body.acres, 1000) || !text(body.tier, 40) || !num(body.rate, 10000) || !num(body.discounted, 10000)) return null;
    if (!num(body.monthly, 10000) || !num(body.addonMonthly, 1000) || !num(body.annualValue, 1000000)) return null;
    if (!num(body.commission, 1000) || !text(body.addonLabel, 60)) return null;
    return {
        acres: body.acres,
        tier: body.tier,
        rate: body.rate,
        discounted: body.discounted,
        monthly: body.monthly,
        addon: body.addon,
        addonLabel: body.addonLabel,
        addonMonthly: body.addonMonthly,
        totalMonthly: body.monthly + body.addonMonthly,
        annualValue: body.annualValue,
        commission: body.commission
    };
}

// Reps can change their own sale for a while after making it; admins can change any sale
function canChangeSale(session, existing) {
    if (session.admin) return true;
    return existing.rep_id === session.id && Date.now() - existing.created_at < REP_EDIT_HOURS * 3600000;
}

// Create or update — the calculator picks the sale ID, so a sale retried after a dropped signal is saved once
async function putSale(request, env, session, id) {
    let body;
    try {
        body = await request.json();
    } catch (err) {
        return json(request, env, { error: 'bad_request' }, 400);
    }
    const sale = readSale(body);
    if (!sale) return json(request, env, { error: 'bad_request' }, 400);

    const now = Date.now();
    const existing = await env.DB.prepare('SELECT rep_id, created_at FROM sales WHERE id = ?').bind(id).first();
    const values = [sale.acres, sale.tier, sale.rate, sale.discounted, sale.monthly, sale.addon, sale.addonLabel,
        sale.addonMonthly, sale.totalMonthly, sale.annualValue, sale.commission];

    if (existing) {
        if (!canChangeSale(session, existing)) return json(request, env, { error: 'locked' }, 403);
        await env.DB.prepare(`
            UPDATE sales SET acres = ?, tier = ?, rate = ?, discounted = ?, monthly = ?, addon = ?, addon_label = ?,
                addon_monthly = ?, total_monthly = ?, annual_value = ?, commission = ?, updated_at = ?
            WHERE id = ?
        `).bind(...values, now, id).run();
        return json(request, env, { ok: true });
    }

    // When the rep tapped Sold (a sale queued with no signal keeps its real time), within the last day
    const soldAt = typeof body.soldAt === 'number' && body.soldAt <= now + 300000 && body.soldAt >= now - 86400000
        ? Math.round(body.soldAt)
        : now;
    await env.DB.prepare(`
        INSERT INTO sales (acres, tier, rate, discounted, monthly, addon, addon_label, addon_monthly, total_monthly,
            annual_value, commission, updated_at, id, rep_id, rep_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(...values, now, id, session.id, session.name, soldAt).run();
    return json(request, env, { ok: true }, 201);
}

async function deleteSale(request, env, session, id) {
    const existing = await env.DB.prepare('SELECT rep_id, created_at FROM sales WHERE id = ?').bind(id).first();
    if (!existing) return json(request, env, { ok: true }); // Already gone
    if (!canChangeSale(session, existing)) return json(request, env, { error: 'locked' }, 403);
    await env.DB.prepare('DELETE FROM sales WHERE id = ?').bind(id).run();
    return json(request, env, { ok: true });
}

// Leaderboard data (admins only): every rep, plus sales made at or after `from` (ms), newest first
async function listSales(request, url, env, session) {
    if (!session.admin) return json(request, env, { error: 'forbidden' }, 403);
    const from = Number(url.searchParams.get('from')) || 0;
    const [reps, sales] = await env.DB.batch([
        env.DB.prepare('SELECT id, name, avatar, admin FROM reps ORDER BY name'),
        env.DB.prepare(`
            SELECT id, rep_id AS repId, rep_name AS repName, created_at AS createdAt, acres, tier, rate, discounted,
                monthly, addon, addon_label AS addonLabel, addon_monthly AS addonMonthly,
                total_monthly AS totalMonthly, annual_value AS annualValue, commission
            FROM sales WHERE created_at >= ? ORDER BY created_at DESC LIMIT 5000
        `).bind(from)
    ]);
    return json(request, env, {
        reps: reps.results.map(r => ({ ...r, admin: r.admin === 1 })),
        sales: sales.results
    });
}
