// ---- Rep sign-in (Discord) & Premier sales tracking ----
// Shared by index.html (calculator) and admin.html (leaderboard).
// Reps sign in with Discord (members of our server only) and stay signed in on that device for
// 30 days; then they tap "Sign in with Discord" again, which re-checks they're still in the server.
// sales-worker/ (Cloudflare) does the Discord check and stores the sales.
// With TRACKING_API_URL = null (tracking-config.js) all of this is off and the calculator works as before.

const trackingEnabled = !!TRACKING_API_URL;
const TRACKING_API = trackingEnabled ? TRACKING_API_URL.replace(/\/$/, '') : '';
const TRACKING_SESSION_KEY = 'mmSession';
const TRACKING_QUEUE_KEY = 'mmPendingSales';
const TRACKING_RETRY_MS = 60000;

let trackingSession = null; // { token, id, name, avatar, admin, exp }
let trackingOnReady = null; // Set by admin.js; called with the session after sign-in

// The sale for the current Premier calc (cleared on New Calc)
let premierSaleId = null;
let premierSaleSoldAt = null;

const TRACKING_LOGIN_ERRORS = {
    not_member: 'You need to be a member of our Discord server to use the calculator.',
    missing_role: 'Your Discord account doesn’t have the role needed to use the calculator. Ask your manager.',
    denied: 'Discord sign-in was cancelled.',
    expired: 'That sign-in took too long. Try again.',
    failed: 'Discord sign-in didn’t work. Try again.',
    signed_out: 'Your sign-in expired. Please sign in with Discord again.'
};

// localStorage can throw (private browsing, blocked storage) — tracking still works for this visit
function readTrackingStore(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

function writeTrackingStore(key, value) {
    try {
        if (value == null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
}

function formatTrackingMoney(amount) {
    return '$' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeTrackingHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

function isTrackingAdmin() {
    return !!trackingSession?.admin;
}

// The session's middle part is the rep's profile, signed by the worker (the worker checks the signature)
function decodeTrackingSession(token) {
    try {
        const payload = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
        const data = JSON.parse(new TextDecoder().decode(bytes));
        return data.exp > Date.now() ? { token, ...data } : null;
    } catch (e) {
        return null;
    }
}

function initTracking() {
    if (!trackingEnabled) return;

    buildAuthGate();

    // Coming back from Discord: the worker puts the result in the URL #hash
    const params = new URLSearchParams(location.hash.slice(1));
    const token = params.get('session');
    const error = params.get('loginError');
    if (token || error) history.replaceState(null, '', location.pathname + location.search);

    if (token) writeTrackingStore(TRACKING_SESSION_KEY, token);
    trackingSession = decodeTrackingSession(readTrackingStore(TRACKING_SESSION_KEY) || '');

    if (!trackingSession) {
        writeTrackingStore(TRACKING_SESSION_KEY, null);
        lockTracking(error ? (TRACKING_LOGIN_ERRORS[error] || TRACKING_LOGIN_ERRORS.failed) : '');
        return;
    }
    unlockTracking();
}

function lockTracking(message) {
    trackingSession = null;
    document.body.classList.add('auth-locked');
    document.getElementById('authGate').style.display = '';
    document.getElementById('authError').textContent = message || '';
    renderTrackingBar();
}

function unlockTracking() {
    document.body.classList.remove('auth-locked');
    document.getElementById('authGate').style.display = 'none';
    renderTrackingBar();
    flushPremierSales();
    if (trackingOnReady) trackingOnReady(trackingSession);
}

function signInWithDiscord() {
    const back = location.href.split('#')[0];
    location.href = `${TRACKING_API}/login?return=${encodeURIComponent(back)}`;
}

function signOutTracking() {
    forgetPremierSale();
    writeTrackingStore(TRACKING_SESSION_KEY, null);
    lockTracking('');
}

// Calls the sales worker as the signed-in rep. A 401 means the session ran out: back to the sign-in screen.
async function trackingApi(method, path, body) {
    const res = await fetch(TRACKING_API + path, {
        method,
        headers: {
            Authorization: `Bearer ${trackingSession?.token || ''}`,
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) {
        writeTrackingStore(TRACKING_SESSION_KEY, null);
        lockTracking(TRACKING_LOGIN_ERRORS.signed_out);
    }
    return res;
}

// ---- Sign-in screen ----

function buildAuthGate() {
    const gate = document.createElement('div');
    gate.id = 'authGate';
    gate.className = 'auth-gate';
    gate.style.display = 'none';
    gate.innerHTML = `
        <div class="auth-card">
            <img src="logo.png" alt="Mosquito Mike Logo" class="auth-logo">
            <h2>Mosquito Mike Calculator</h2>
            <p class="auth-subtitle">Sign in with the Discord account you use in our server. You’ll stay signed in on this device.</p>
            <div id="authError" class="auth-error" role="alert"></div>
            <button class="btn auth-discord" onclick="signInWithDiscord()">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M20.32 4.37A19.8 19.8 0 0 0 15.39 2.8a13.9 13.9 0 0 0-.63 1.3 18.4 18.4 0 0 0-5.52 0 13 13 0 0 0-.64-1.3 19.7 19.7 0 0 0-4.93 1.53C.53 9.05-.32 13.6.1 18.1a19.9 19.9 0 0 0 6.04 3.05c.49-.66.92-1.36 1.3-2.1a12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.2 0l.5.39c-.65.39-1.33.71-2.04.98.37.74.81 1.44 1.3 2.1a19.8 19.8 0 0 0 6.04-3.05c.5-5.22-.84-9.73-3.58-13.73ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42 1.2 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.95-2.42 2.16-2.42 1.2 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"/></svg>
                Sign in with Discord
            </button>
        </div>
    `;
    document.body.appendChild(gate);
}

// ---- Signed-in bar (bottom of the page) ----

function renderTrackingBar() {
    let bar = document.getElementById('trackingBar');
    if (!trackingSession) {
        if (bar) bar.remove();
        return;
    }
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'trackingBar';
        bar.className = 'tracking-bar';
        (document.querySelector('.container') || document.body).appendChild(bar);
    }
    const onAdminPage = !!document.getElementById('adminApp');
    const link = onAdminPage
        ? '<a href="index.html">Calculator</a>'
        : (isTrackingAdmin() ? '<a href="admin.html">Leaderboard</a>' : '');
    const avatar = trackingSession.avatar
        ? `<img src="${escapeTrackingHtml(trackingSession.avatar)}" alt="" class="tracking-avatar">`
        : '&#128100;';
    bar.innerHTML = `
        <span class="tracking-bar-user">${avatar} ${escapeTrackingHtml(trackingSession.name)}</span>
        ${link}
        <a href="#" onclick="signOutTracking(); return false;">Sign out</a>
    `;
}

function showTrackingToast(msg) {
    let toast = document.getElementById('trackingToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'trackingToast';
        toast.className = 'tracking-toast';
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => toast.classList.remove('show'), 5000);
}

// ---- Premier sale logging (called from premier.js) ----
// One calc = one sale: Sold creates it, changing the add-on afterwards updates it,
// switching to Pitched removes it, and New Calc starts the next one.
// Changes wait in a queue on the device until the worker confirms them, so a sale made with
// no signal is sent once the phone is back online (even if the page was closed in between).

function buildPremierSaleRecord() {
    const s = premierState;
    const addon = getPremierAddonConfig(premierAddon);
    const addonMonthly = addon ? getPremierAddonPrice(addon.key) : 0;
    return {
        acres: s.acres,
        tier: s.tier,
        rate: s.rate,
        discounted: s.discounted,
        monthly: s.monthly,
        addon: addon ? addon.key : 'none',
        addonLabel: addon ? addon.option_label : 'None',
        addonMonthly,
        annualValue: (s.monthly + addonMonthly) * PREMIER_CONFIG.payment_months,
        commission: getPremierCommission(premierAddon),
        soldAt: premierSaleSoldAt
    };
}

function newPremierSaleId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
}

function queuePremierSale(id, change) {
    const queue = readTrackingStore(TRACKING_QUEUE_KEY) || {};
    queue[id] = { ...change, v: Date.now() + Math.random() }; // v: tells a newer change apart from the one being sent
    writeTrackingStore(TRACKING_QUEUE_KEY, queue);
    flushPremierSales();
}

let trackingFlushing = false;
let trackingFlushAgain = false;
let trackingRetryTimer = null;

async function flushPremierSales() {
    if (!trackingSession) return;
    if (trackingFlushing) {
        trackingFlushAgain = true;
        return;
    }
    trackingFlushing = true;
    clearTimeout(trackingRetryTimer);
    let retryLater = false;

    for (const [id, change] of Object.entries(readTrackingStore(TRACKING_QUEUE_KEY) || {})) {
        let res;
        try {
            res = change.op === 'delete'
                ? await trackingApi('DELETE', `/api/sales/${id}`)
                : await trackingApi('PUT', `/api/sales/${id}`, change.sale);
        } catch (err) {
            retryLater = true; // No signal — try again later
            break;
        }
        if (res.status === 401) break; // Signed out; the queue is sent after they sign back in
        if (res.status >= 500) {
            retryLater = true;
            continue;
        }
        if (!res.ok) {
            console.error('Premier sale rejected:', res.status, await res.text());
            showTrackingToast('A sale didn’t save to the leaderboard. Tell your manager.');
        }
        // Done (or rejected) — drop it, unless it was changed again while we were sending
        const queue = readTrackingStore(TRACKING_QUEUE_KEY) || {};
        if (queue[id]?.v === change.v) {
            delete queue[id];
            writeTrackingStore(TRACKING_QUEUE_KEY, queue);
        }
    }

    trackingFlushing = false;
    if (trackingFlushAgain) {
        trackingFlushAgain = false;
        flushPremierSales();
    } else if (retryLater) {
        trackingRetryTimer = setTimeout(flushPremierSales, TRACKING_RETRY_MS);
    }
}

function canTrackPremierSale() {
    return trackingEnabled && !!trackingSession && !!premierState;
}

function trackPremierSold() {
    if (!canTrackPremierSale()) return;
    // Going Back and hitting Sold again updates the same sale instead of counting it twice
    if (!premierSaleId) {
        premierSaleId = newPremierSaleId();
        premierSaleSoldAt = Date.now();
    }
    queuePremierSale(premierSaleId, { op: 'put', sale: buildPremierSaleRecord() });
}

function trackPremierAddonChange() {
    if (!premierSaleId || !canTrackPremierSale()) return;
    queuePremierSale(premierSaleId, { op: 'put', sale: buildPremierSaleRecord() });
}

// Sold was tapped, then the rep went Back and chose Pitched — it wasn't a sale after all
function trackPremierPitched() {
    if (!premierSaleId || !trackingSession) return;
    queuePremierSale(premierSaleId, { op: 'delete' });
    forgetPremierSale();
}

function forgetPremierSale() {
    premierSaleId = null;
    premierSaleSoldAt = null;
}

window.addEventListener('online', () => flushPremierSales());
initTracking();
