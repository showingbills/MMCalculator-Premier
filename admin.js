// ---- Premier sales leaderboard (admin.html) ----
// Stat tiles, per-rep leaderboard, and the sales log for the selected period.
// Only Discord members with an admin role (ADMIN_ROLE_IDS on the sales worker) can load it.

const ADMIN_REFRESH_MS = 60000; // Auto-refresh while the page is open

let adminPeriod = 'month';
let adminSales = []; // Sales in the selected period, newest first
let adminReps = [];  // Everyone who has signed in: { id, name, avatar, admin }
let adminRefreshTimer = null;

function showAdminNotice(html) {
    const notice = document.getElementById('adminNotice');
    notice.innerHTML = html;
    notice.style.display = html ? '' : 'none';
    document.getElementById('adminDashboard').style.display = html ? 'none' : '';
}

function startAdmin() {
    if (!isTrackingAdmin()) {
        showAdminNotice(`<strong>No access.</strong> The leaderboard is for managers only. <a href="index.html">Back to the calculator</a>`);
        return;
    }
    showAdminNotice('');
    setAdminPeriod(adminPeriod);
}

// ---- Time period ----

function getAdminPeriodStart(period) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === 'today') return d.getTime();
    if (period === 'week') {
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Back to Monday
        return d.getTime();
    }
    if (period === 'month') {
        d.setDate(1);
        return d.getTime();
    }
    return 0; // All time
}

function setAdminPeriod(period) {
    adminPeriod = period;
    document.querySelectorAll('.admin-period').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });
    loadAdminSales();
}

let adminLoadCount = 0;

async function loadAdminSales() {
    clearTimeout(adminRefreshTimer);
    const load = ++adminLoadCount; // Ignore an older response that lands after a newer one
    let res;
    try {
        res = await trackingApi('GET', `/api/sales?from=${getAdminPeriodStart(adminPeriod)}`);
    } catch (err) {
        document.getElementById('adminUpdated').textContent = 'Offline — showing last update';
        adminRefreshTimer = setTimeout(loadAdminSales, ADMIN_REFRESH_MS);
        return;
    }
    if (load !== adminLoadCount || res.status === 401) return;
    if (!res.ok) {
        showAdminNotice(res.status === 403
            ? '<strong>No access.</strong> Your Discord roles changed. Sign out and back in.'
            : '<strong>Couldn’t load sales.</strong> Try Refresh in a minute.');
        return;
    }

    const data = await res.json();
    adminReps = data.reps;
    adminSales = data.sales.map(s => ({ ...s, createdAt: new Date(s.createdAt) }));
    document.getElementById('adminUpdated').textContent =
        `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    renderAdmin();
    adminRefreshTimer = setTimeout(loadAdminSales, ADMIN_REFRESH_MS);
}

// ---- Totals ----

function getAdminRep(id) {
    return adminReps.find(r => r.id === id);
}

// Latest Discord nickname if they've signed in since; otherwise the name at the time of the sale
function getAdminRepName(id, fallback) {
    return getAdminRep(id)?.name || fallback || 'Unknown rep';
}

function buildAdminLeaderboard() {
    const reps = {};
    const repFor = (id, name) => reps[id] || (reps[id] = {
        id, name: getAdminRepName(id, name), avatar: getAdminRep(id)?.avatar,
        sales: 0, premierPlus: 0, insectOnly: 0, premierOnly: 0, monthly: 0, commission: 0
    });

    // Every rep who has signed in shows up, even before their first sale (managers only once they sell)
    adminReps.filter(r => !r.admin).forEach(r => repFor(r.id, r.name));

    adminSales.forEach(sale => {
        const rep = repFor(sale.repId, sale.repName);
        rep.sales += 1;
        if (sale.addon === 'insect_rodent_plan') rep.premierPlus += 1;
        else if (sale.addon === 'insect_plan') rep.insectOnly += 1;
        else rep.premierOnly += 1;
        rep.monthly += sale.totalMonthly || 0;
        rep.commission += sale.commission || 0;
    });

    return Object.values(reps).sort((a, b) =>
        b.sales - a.sales || b.commission - a.commission || a.name.localeCompare(b.name));
}

// ---- Render ----

function renderAdmin() {
    renderAdminStats();
    renderAdminLeaderboard();
    renderAdminSales();
}

function renderAdminStats() {
    const count = adminSales.length;
    const withAddon = adminSales.filter(s => s.addon && s.addon !== 'none').length;
    const commission = adminSales.reduce((sum, s) => sum + (s.commission || 0), 0);
    const monthly = adminSales.reduce((sum, s) => sum + (s.totalMonthly || 0), 0);
    const annual = adminSales.reduce((sum, s) => sum + (s.annualValue || 0), 0);

    const tiles = [
        { label: 'Premier Sales', value: count.toLocaleString('en-US') },
        { label: 'With an Add-On', value: count ? `${Math.round(withAddon / count * 100)}%` : '—', sub: `${withAddon} of ${count}` },
        { label: 'Commission', value: formatTrackingMoney(commission) },
        { label: 'New Monthly Revenue', value: formatTrackingMoney(monthly), sub: `${formatTrackingMoney(annual)} / year` }
    ];
    document.getElementById('adminStats').innerHTML = tiles.map(t => `
        <div class="admin-stat">
            <div class="admin-stat-label">${t.label}</div>
            <div class="admin-stat-value">${t.value}</div>
            ${t.sub ? `<div class="admin-stat-sub">${t.sub}</div>` : ''}
        </div>
    `).join('');
}

function renderAdminRepCell(name, avatar) {
    const img = avatar ? `<img src="${escapeTrackingHtml(avatar)}" alt="" class="tracking-avatar">` : '';
    return `<td class="admin-rep">${img}${escapeTrackingHtml(name)}</td>`;
}

function renderAdminLeaderboard() {
    const rows = buildAdminLeaderboard();
    document.getElementById('adminLeaderboard').innerHTML = rows.length
        ? rows.map((r, i) => `
            <tr>
                <td class="admin-rank">${r.sales ? i + 1 : ''}</td>
                ${renderAdminRepCell(r.name, r.avatar)}
                <td class="num"><strong>${r.sales}</strong></td>
                <td class="num">${r.premierPlus}</td>
                <td class="num">${r.insectOnly}</td>
                <td class="num">${r.premierOnly}</td>
                <td class="num">${formatTrackingMoney(r.monthly)}</td>
                <td class="num"><strong>${formatTrackingMoney(r.commission)}</strong></td>
            </tr>
        `).join('')
        : '<tr><td colspan="8" class="admin-empty">No reps have signed in yet.</td></tr>';
}

function formatAdminWhen(date) {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function renderAdminSales() {
    document.getElementById('adminSales').innerHTML = adminSales.length
        ? adminSales.map(s => `
            <tr>
                <td class="admin-when">${formatAdminWhen(s.createdAt)}</td>
                ${renderAdminRepCell(getAdminRepName(s.repId, s.repName), getAdminRep(s.repId)?.avatar)}
                <td class="num">${s.acres ?? ''}</td>
                <td class="num">${formatTrackingMoney(s.monthly)}</td>
                <td>${escapeTrackingHtml(s.addonLabel || 'None')}</td>
                <td class="num">${formatTrackingMoney(s.totalMonthly)}</td>
                <td class="num">${formatTrackingMoney(s.commission)}</td>
                <td><button class="admin-delete" onclick="deleteAdminSale('${escapeTrackingHtml(s.id)}')" title="Delete this sale" aria-label="Delete this sale">&#10005;</button></td>
            </tr>
        `).join('')
        : '<tr><td colspan="8" class="admin-empty">No sales in this period yet.</td></tr>';
}

async function deleteAdminSale(id) {
    const sale = adminSales.find(s => s.id === id);
    if (!sale) return;
    const label = `${getAdminRepName(sale.repId, sale.repName)}, ${formatAdminWhen(sale.createdAt)}, ${formatTrackingMoney(sale.totalMonthly)}/mo`;
    if (!confirm(`Delete this sale?\n\n${label}\n\nIt comes off the leaderboard and commission totals.`)) return;
    try {
        const res = await trackingApi('DELETE', `/api/sales/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (err) {
        showTrackingToast('Couldn’t delete that sale. Try again.');
        return;
    }
    loadAdminSales();
}

// ---- CSV export (the selected period) ----

// Quoted, and text starting with = + - @ is prefixed so Excel doesn't run it as a formula
function csvCell(value) {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
}

function exportAdminCsv() {
    const header = ['Date', 'Time', 'Rep', 'Acres', 'Tier', 'Rate per App', 'Premier Rate per App', 'Premier $/mo', 'Add-on', 'Add-on $/mo', 'Total $/mo', 'Annual Value', 'Commission'];
    const rows = adminSales.slice().reverse().map(s => [
        s.createdAt.toLocaleDateString('en-US'),
        s.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        getAdminRepName(s.repId, s.repName),
        s.acres, s.tier, s.rate, s.discounted, s.monthly,
        s.addonLabel || 'None', s.addonMonthly, s.totalMonthly, s.annualValue, s.commission
    ]);
    const csv = [header, ...rows]
        .map(row => row.map(csvCell).join(','))
        .join('\r\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `premier-sales-${adminPeriod}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ---- Start ----

if (!trackingEnabled) {
    showAdminNotice('<strong>Sales tracking isn’t set up yet.</strong> Follow TRACKING_SETUP.md to connect Discord sign-in.');
} else {
    trackingOnReady = startAdmin;
    if (trackingSession) startAdmin(); // Already signed in when this script loaded
}
