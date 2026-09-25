// ---- Premier Subscription (October 2026 promo) ----
// Separate flow: page5 (eligibility) → page6 (pricing + add-ons) → page7 (Sold: CRM note) / page8 (Not Sold: email)

let premierState = null; // Set once eligibility passes: { acres, tier, tierRate, rate, discounted, monthly, standardPif14, premierTotal, savings }
let premierAddon = 'none'; // 'none' | 'insect_plan' | 'insect_rodent_plan' — shared by page6 and page7

// Bold = the benefit the rep should land on; the rest is supporting detail
const PREMIER_KEY_POINTS = [
    '<strong>Full-season protection</strong>, April through October (up to 14 applications)',
    '<strong>5% discount</strong> on each application',
    '<strong>Low monthly payments</strong> starting November 1st',
    '<strong>Locked rate for two full years</strong> — no increases, no inflation worries',
    '<strong>No contract or cancellation fee</strong>'
];

const PREMIER_OBJECTIONS = [
    {
        q: 'I don’t like paying all year.',
        a: 'I completely understand. The reason many customers love this plan is it spreads out the cost so you avoid a big spring bill or the need to pay at every application throughout the season, while also locking in lower per-application pricing for two years. And since there’s no cancellation fee, you stay in full control the entire time.'
    },
    {
        q: 'What if I change my mind later?',
        a: 'That’s the best part — you can cancel anytime with no penalty. The plan is designed to give you flexibility, protection, and peace of mind without locking you in.'
    },
    {
        q: 'Can’t I just stay on pay-as-you-go?',
        a: 'You absolutely can — but pay-as-you-go customers don’t get the 5% savings or the 2-year price lock. The Premier Subscription is designed to give our loyal customers the same flexibility, while lowering the per-application cost and protecting against inflation. It’s really about better value for the exact same service.'
    },
    {
        q: 'What if I move / sell my house?',
        a: 'Great question — if you move, you can cancel anytime with no penalty. And if you’re still in our service area, we’ll transfer the plan to your new home so you don’t lose coverage or savings.'
    },
    {
        q: 'I don’t think I need every spray.',
        a: 'I hear you — the reason we include every spray is because it’s the most effective way to keep your yard consistently protected. Skipping sprays often ends up costing more in callbacks and gaps in protection. The subscription ensures you’re covered from the first warm days of spring right through the fall, without you needing to worry about scheduling or missing an application.'
    }
];

// ---- Eligibility ----

// Current bi-weekly per-treatment rate for a tier — the baseline Premier pricing is validated against
function getPremierTierRate(tier) {
    return PRICING_JSON.packages_by_tier[PREMIER_CONFIG.biweekly_rate_key]?.[tier];
}

// Each rule returns a failure reason (string), or null if the client passes.
// To add another eligibility requirement, add a rule object here — nothing else needs to change.
const PREMIER_ELIGIBILITY_RULES = [
    {
        id: 'acreage',
        check: ctx => ctx.acres > PRICING_JSON.max_covered_acres
            ? `Property is ${ctx.acres} acres. Properties over ${PRICING_JSON.max_covered_acres.toFixed(1)} acres require a manual quote and aren’t eligible for Premier here.`
            : null
    },
    {
        id: 'current_rate',
        check: ctx => {
            if (!ctx.tier) return null; // Acreage rule already failed — no tier to compare against
            return ctx.meetsTierRate
                ? null
                : `A ${formatPremierMoney(ctx.rate)} bi-weekly per-treatment rate is below current pricing for the ${ctx.tier} acre tier. The client is on outdated pricing.`;
        }
    }
];

function checkPremierEligibility(acres, rate) {
    const tier = acres <= PRICING_JSON.max_covered_acres ? determineTier(acres) : null;
    const tierRate = tier ? getPremierTierRate(tier) : null;
    // Whole cents so the tolerance edge is exact; paying more than the tier rate is always fine
    const meetsTierRate = tierRate != null &&
        Math.round(rate * 100) >= Math.round((tierRate - PREMIER_CONFIG.rate_tolerance) * 100);
    const ctx = { acres, rate, tier, tierRate, meetsTierRate };
    const reasons = PREMIER_ELIGIBILITY_RULES.map(rule => rule.check(ctx)).filter(Boolean);
    return { ...ctx, eligible: reasons.length === 0, reasons };
}

// ---- Pricing ----

// Integer-cent math so the round-UP on the monthly payment isn't thrown off by floating point
function calculatePremierPricing(rate) {
    const rateCents = Math.round(rate * 100);
    const keptPct = Math.round((1 - PREMIER_CONFIG.discount_rate) * 100); // 95
    const apps = PREMIER_CONFIG.applications_per_season;
    const months = PREMIER_CONFIG.payment_months;

    const monthly = Math.ceil(rateCents * keptPct * apps / (100 * 100 * months)); // from full-precision discounted rate, rounded UP

    // Savings vs. a standard PIF 14 at their rate — every treatment paid, no free spray —
    // against what Premier actually bills (monthly × 12, after rounding up)
    const standardPif14 = rateCents * apps / 100;
    const premierTotal = monthly * months;

    return {
        discounted: Math.round(rateCents * keptPct / 100) / 100, // rounded to 2 decimals for display
        monthly,
        standardPif14,
        premierTotal,
        savings: Math.round((standardPif14 - premierTotal) * 100) / 100
    };
}

function formatPremierMoney(amount) {
    const opts = Number.isInteger(amount)
        ? {}
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return '$' + amount.toLocaleString('en-US', opts);
}

function escapePremierHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getPremierAddonPrice(addonKey) {
    return ADDON_DATA[addonKey]?.monthlyPrice || 0;
}

// ---- Navigation ----

function showPremierPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openPremier() {
    clearPremierState();

    // Carry over acreage if the rep already typed it on page1
    const mainAcreage = document.getElementById('acreage').value;
    if (mainAcreage) {
        document.getElementById('premierAcreage').value = mainAcreage;
        updatePremierTier();
    }

    document.body.classList.add('premier-mode');
    showPremierPage('page5');
}

// Back from the eligibility page (before a check) — leaves the main questionnaire untouched
function exitPremier() {
    clearPremierState();
    document.body.classList.remove('premier-mode');
    showPremierPage('page1');
}

function backToPremierEligibility() {
    showPremierPage('page5');
}

function backToPremierResults() {
    renderPremierAddonOptions('premierAddonOptions', 'premier_addon');
    updatePremierAddonTotal();
    showPremierPage('page6');
}

function goToPremierSold() {
    renderPremierAddonOptions('premierSoldAddonOptions', 'premier_sold_addon');
    updatePremierCrmNote();
    showPremierPage('page7');
}

function goToPremierEmail() {
    document.getElementById('premierGeneratedEmail').style.display = 'none';
    renderPremierAddonOptions('premierPitchedAddonOptions', 'premier_pitched_addon');
    updatePremierPitchedNote();
    showPremierPage('page8');
}

// "Reset" / "New Calc" inside Premier — clears everything (Premier + main calculator)
// and starts a fresh Premier eligibility check. Back on page5 is the way out to page1.
function resetPremier() {
    resetCalculator();
    openPremier();
}

function clearPremierState() {
    premierState = null;
    premierAddon = 'none';

    const acreage = document.getElementById('premierAcreage');
    const rate = document.getElementById('premierRate');
    acreage.value = '';
    rate.value = '';
    acreage.disabled = false;
    rate.disabled = false;

    const tierDisplay = document.getElementById('premierTierDisplay');
    tierDisplay.innerHTML = '';
    tierDisplay.classList.remove('warning');

    document.getElementById('premierEligibilityResult').innerHTML = '';
    document.getElementById('premierCheckButtons').style.display = '';
    document.getElementById('premierResetButtons').style.display = 'none';

    document.getElementById('premierPackage').innerHTML = '';
    document.getElementById('premierAddonCards').innerHTML = '';
    document.getElementById('premierCrmExtra').value = '';
    document.getElementById('premierPitchedExtra').value = '';
    document.getElementById('premierClientName').value = '';
    document.getElementById('premierRepName').value = '';
    document.getElementById('premierEmailContent').innerHTML = '';
    document.getElementById('premierGeneratedEmail').style.display = 'none';
}

// ---- Page 5: Eligibility ----

function updatePremierTier() {
    const acres = parseFloat(document.getElementById('premierAcreage').value);
    const tierDisplay = document.getElementById('premierTierDisplay');

    if (!acres || acres <= 0) {
        tierDisplay.innerHTML = '';
        tierDisplay.classList.remove('warning');
        return;
    }

    if (acres > PRICING_JSON.max_covered_acres) {
        tierDisplay.innerHTML = '<strong>⚠️ Properties over 3.0 acres require a manual quote</strong>';
        tierDisplay.classList.add('warning');
        return;
    }

    tierDisplay.classList.remove('warning');
    tierDisplay.innerHTML = `<strong>Pricing Tier:</strong> ${determineTier(acres)} acre coverage`;
}

function runPremierEligibilityCheck() {
    const acreageEl = document.getElementById('premierAcreage');
    const rateEl = document.getElementById('premierRate');
    const acres = parseFloat(acreageEl.value);
    const rate = parseFloat(rateEl.value);

    // Missing/invalid input is a data-entry problem, not an eligibility failure
    if (!acres || acres <= 0) {
        alert('Please enter the treatment area in acres.');
        acreageEl.focus();
        return;
    }
    if (!rate || rate <= 0) {
        alert('Please enter the client’s 2026 bi-weekly per-treatment rate.');
        rateEl.focus();
        return;
    }

    const result = checkPremierEligibility(acres, rate);

    if (!result.eligible) {
        // Dead end: lock the inputs — the only way forward is a full Reset
        acreageEl.disabled = true;
        rateEl.disabled = true;
        document.getElementById('premierCheckButtons').style.display = 'none';
        document.getElementById('premierResetButtons').style.display = '';
        document.getElementById('premierEligibilityResult').innerHTML = `
            <div class="premier-status not-eligible">
                <div class="premier-status-title">✖ Not Eligible for Premier</div>
                <ul>${result.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
                <div class="premier-status-note">Reset to start a new calculation.</div>
            </div>
        `;
        return;
    }

    premierState = { ...result, ...calculatePremierPricing(rate) };
    premierAddon = 'none';
    renderPremierResults();
    showPremierPage('page6');
}

// ---- Page 6: Results ----

function renderPremierResults() {
    const s = premierState;
    const tierNote = s.rate > s.tierRate
        ? `is above the current ${s.tier} acre bi-weekly rate (${formatPremierMoney(s.tierRate)}). The 5% discount applies to their current rate.`
        : `meets the current ${s.tier} acre bi-weekly rate (${formatPremierMoney(s.tierRate)}).`;

    document.getElementById('premierEligibleBanner').innerHTML = `
        <div class="premier-status eligible">
            <div class="premier-status-title">✔ Eligible for Premier</div>
            <div>${formatPremierMoney(s.rate)}/app ${tierNote}</div>
        </div>
    `;

    document.getElementById('premierPackage').innerHTML = `
        <div class="package-card recommended premier-card">
            <div class="package-header">
                <h3 class="package-title">Mosquito Mike Premier Subscription</h3>
                <span class="premier-badge">October 2026 Only</span>
            </div>
            <div class="premier-breakdown">
                <div class="premier-line">
                    <span>2026 Bi-Weekly Rate (per app)</span>
                    <span class="premier-line-amount muted">${formatPremierMoney(s.rate)}</span>
                </div>
                <div class="premier-line">
                    <span>Premier Rate (5% off, per app)</span>
                    <span class="premier-line-amount savings">${formatPremierMoney(s.discounted)}</span>
                </div>
            </div>
            <div class="pricing-row">
                <div class="pricing-option">
                    <div class="pricing-label">Monthly Payment</div>
                    <div class="pricing-amount">${formatPremierMoney(s.monthly)}/mo</div>
                    <div class="premier-pricing-sub">Starting ${PREMIER_CONFIG.billing_start} · covers the 2027 season onward</div>
                </div>
            </div>
            <div class="premier-lock">
                <span class="premier-lock-icon">🔒</span>
                <div>
                    <div class="premier-lock-title">${PREMIER_CONFIG.price_lock_text}</div>
                    <div class="premier-lock-sub">2 full years of protected pricing — no increases, no inflation worries</div>
                </div>
            </div>
            <div class="premier-savings">
                <div class="premier-savings-head">
                    <span class="premier-savings-title">💰 Savings vs. Standard PIF 14</span>
                    <span class="premier-savings-badge">Save ${formatPremierMoney(s.savings)}</span>
                </div>
                <div class="premier-line">
                    <span>Standard PIF 14 (no free spray)<small>${formatPremierMoney(s.rate)} × ${PREMIER_CONFIG.applications_per_season} treatments</small></span>
                    <span class="premier-line-amount strike">${formatPremierMoney(s.standardPif14)}</span>
                </div>
                <div class="premier-line">
                    <span>Premier Subscription<small>${formatPremierMoney(s.monthly)}/mo × ${PREMIER_CONFIG.payment_months} months</small></span>
                    <span class="premier-line-amount">${formatPremierMoney(s.premierTotal)}</span>
                </div>
                <div class="premier-line">
                    <span><strong>Total savings per season</strong></span>
                    <span class="premier-line-amount savings">${formatPremierMoney(s.savings)}</span>
                </div>
            </div>
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Why Premier?</h4>
                <div class="tp-content collapsed">
                    <div class="tp-section">
                        <div class="tp-section-title">Key Points to Present</div>
                        <ul>${PREMIER_KEY_POINTS.map(p => `<li>${p}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Objection Handling</h4>
                <div class="tp-content collapsed">
                    ${PREMIER_OBJECTIONS.map(o => `
                        <div class="premier-objection">
                            <div class="premier-objection-q">“${o.q}”</div>
                            <p>${o.a}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('premierAddonCards').innerHTML = PREMIER_CONFIG.addons
        .map(a => buildAddonCard(a.key, 'Optional Add-On'))
        .join('');

    renderPremierAddonOptions('premierAddonOptions', 'premier_addon');
    updatePremierAddonTotal();
}

// Add-on picker (radio group) — rendered on page6 and page7, both backed by premierAddon
function renderPremierAddonOptions(containerId, groupName) {
    const options = [{ key: 'none', label: 'None' }].concat(
        PREMIER_CONFIG.addons.map(a => ({ key: a.key, label: `${a.option_label} +$${getPremierAddonPrice(a.key)}/mo` }))
    );

    document.getElementById(containerId).innerHTML = options.map(o => `
        <div class="radio-option">
            <input type="radio" id="${groupName}-${o.key}" name="${groupName}" value="${o.key}"
                ${o.key === premierAddon ? 'checked' : ''} onchange="setPremierAddon(this.value)">
            <label for="${groupName}-${o.key}">${o.label}</label>
        </div>
    `).join('');
}

function setPremierAddon(addonKey) {
    premierAddon = addonKey;
    updatePremierAddonTotal();
    updatePremierCrmNote();
    updatePremierPitchedNote();
}

function updatePremierAddonTotal() {
    const el = document.getElementById('premierAddonTotal');
    if (!premierState) {
        el.innerHTML = '';
        return;
    }
    const addonPrice = getPremierAddonPrice(premierAddon);
    el.innerHTML = addonPrice
        ? `<strong>Total:</strong> ${formatPremierMoney(premierState.monthly)} + $${addonPrice} = <strong>${formatPremierMoney(premierState.monthly + addonPrice)}/mo</strong>`
        : `<strong>Total:</strong> ${formatPremierMoney(premierState.monthly)}/mo (Premier only)`;
}

// ---- CRM notes (page7 Sold, page8 Pitched) ----

// "Premier Sub at $X per month ($X per app)[ + $29 per month for Foundation = $X per month]"
function buildPremierOffer() {
    const s = premierState;
    const base = `Premier Sub at ${formatPremierMoney(s.monthly)} per month (${formatPremierMoney(s.discounted)} per app)`;
    const addon = PREMIER_CONFIG.addons.find(a => a.key === premierAddon);

    if (!addon) return base;
    const addonPrice = getPremierAddonPrice(addon.key);
    return `${base} + $${addonPrice} per month for ${addon.crm_label} = ${formatPremierMoney(s.monthly + addonPrice)} per month`;
}

// Rep's optional extra notes, appended with the same " :: " separator (one segment per line typed)
function withPremierExtraNotes(note, textareaId) {
    const extra = document.getElementById(textareaId).value
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean);
    return extra.length ? `${note} :: ${extra.join(' :: ')}` : note;
}

function buildPremierCrmNote() {
    return withPremierExtraNotes(`Signed on ${buildPremierOffer()} :: ${PREMIER_CONFIG.price_lock_text}`, 'premierCrmExtra');
}

function buildPremierPitchedNote() {
    return withPremierExtraNotes(`Pitched ${buildPremierOffer()} :: Not sold - follow-up email sent`, 'premierPitchedExtra');
}

function updatePremierCrmNote() {
    if (!premierState) return;
    document.getElementById('premierCrmTitle').textContent = 'Premier 2027 - SOLD';
    document.getElementById('premierCrmNote').textContent = buildPremierCrmNote();
}

function updatePremierPitchedNote() {
    if (!premierState) return;
    document.getElementById('premierPitchedTitle').textContent = 'Premier 2027 - PITCHED';
    document.getElementById('premierPitchedNote').textContent = buildPremierPitchedNote();
}

async function copyPremierText(sourceId, btn) {
    const text = document.getElementById(sourceId).textContent;
    const originalLabel = btn.textContent;

    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        // Fallback for browsers without the async clipboard API
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }

    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
        btn.textContent = originalLabel;
        btn.classList.remove('copied');
    }, 2500);
}

// ---- Page 8: Not Sold (follow-up email + pitched CRM note) ----

function generatePremierEmail() {
    const clientNameEl = document.getElementById('premierClientName');
    const repNameEl = document.getElementById('premierRepName');
    const clientName = clientNameEl.value.trim();
    const repName = repNameEl.value.trim();

    if (!clientName) {
        alert('Please enter the client’s first name.');
        clientNameEl.focus();
        return;
    }
    if (!repName) {
        alert('Please enter your first name.');
        repNameEl.focus();
        return;
    }

    const s = premierState;
    let html = '';
    html += `<p>Hi ${escapePremierHtml(clientName)},</p>`;
    html += `<p>Thank you for your interest in our 2026 Premier Subscription Program! We’re excited to have you lock in one of our most popular and rewarding options for full-season protection heading into 2027.</p>`;
    html += `<p>Here’s a quick recap of what your Premier Subscription includes:</p>`;
    html += `<ul>`;
    html += `<li><strong>Full-Season Protection:</strong> Protected from April through October, starting with the 2027 season (up to 14 applications per season)</li>`;
    html += `<li><strong>Automatic 5% Discount:</strong> Savings applied to every visit, based on your current 2026 per-treatment rate</li>`;
    html += `<li><strong>Low Monthly Payments:</strong> Starting November 1st, 2026, spreading your cost evenly through the year</li>`;
    html += `<li><strong>Two-Year Price Guarantee:</strong> Your rate is locked through Nov 1st, 2028 — no increases, no inflation worries</li>`;
    html += `<li><strong>No Contract or Cancellation Fees:</strong> Full flexibility, full protection</li>`;
    html += `</ul>`;
    html += `<p><strong>Your Personalized Plan</strong><br>Here’s how your numbers break down based on your current 2026 rate:</p>`;
    html += `<ul>`;
    html += `<li>Your 2026 Price Per Spray: <strong>${formatPremierMoney(s.rate)}</strong></li>`;
    html += `<li>Premier Discounted Price Per Spray (5% off): <strong>${formatPremierMoney(s.discounted)}</strong></li>`;
    html += `<li>Monthly Payment: <strong>${formatPremierMoney(s.monthly)}</strong> starting November 1st, 2026</li>`;
    html += `</ul>`;
    html += `<p>To finalize your Premier Subscription, simply reply to this email confirming that you’d like to move forward. We’ll take care of everything else and ensure your account is set up for the 2027 season.</p>`;
    html += `<p>We’re thrilled to continue keeping your yard mosquito- and tick-free — and now, with even more savings and convenience!</p>`;
    html += `<p>Best regards,<br>${escapePremierHtml(repName)}<br>Mosquito Mike</p>`;

    document.getElementById('premierEmailContent').innerHTML = html;
    document.getElementById('premierGeneratedEmail').style.display = 'block';
}
