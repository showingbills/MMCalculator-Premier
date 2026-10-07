// ---- Premier Subscription (October 2026 promo) ----
// Separate flow: page5 (eligibility) → page6 (pricing + add-ons) → page7 (Sold: CRM note) / page8 (Pitched: email)

let premierState = null; // Set once eligibility passes: { acres, tier, tierRate, rate, discounted, monthly, standardPif14, premierTotal, savings }
let premierAddon = 'none'; // 'none' | 'insect_plan' | 'insect_rodent_plan' — shared by page6 and page7
let premierAdvanceTimer = null; // Pending move from a pop-up to the next page

// ServiceMinder tag the rep must add before leaving the eligibility pass pop-up
const PREMIER_ELIGIBLE_TAG = 'Premier 2027 - Eligible';

// How long each pop-up shows before moving on to its page
const PREMIER_SOLD_ALERT_MS = 1000;
const PREMIER_PITCHED_ALERT_MS = 2000; // Longer message, so it stays up longer

// Bold = the benefit the rep should land on; the rest is supporting detail. star = headline point, gets a ⭐ instead of a check
const PREMIER_KEY_POINTS = [
    { text: '<strong>Full-season protection</strong>, April through October (up to 14 applications)' },
    { text: '<strong>5% discount</strong> on each application' },
    { text: '<strong>Low monthly payments</strong> starting November 1st' },
    { text: '<strong>Rate guaranteed through Nov 1st, 2028</strong> — no increases, no inflation worries', star: true },
    { text: '<strong>No contract or cancellation fee</strong>' }
];

// Script the rep reads, filled in with the client's numbers — one paragraph per talking point
function buildPremierPitch(s) {
    return [
        `Because you’re already one of our clients, you qualify for our Premier Subscription. We’re only offering it through the end of October.`,
        `It covers the full season, April through October, with up to ${PREMIER_CONFIG.applications_per_season} applications starting in 2027.`,
        `You get 5% off every application, so your rate drops from ${formatPremierMoney(s.rate)} to <strong>${formatPremierMoney(s.discounted)} per application</strong>.`,
        `Instead of paying at each visit or getting a big bill in the spring, the cost is split into ${PREMIER_CONFIG.payment_months} low monthly payments of <strong>${formatPremierMoney(s.monthly)} per month</strong>, starting ${PREMIER_CONFIG.billing_start}.`,
        `Your rate is <strong>guaranteed through Nov 1st, 2028</strong>, so you won’t see any increases. And there’s no contract or cancellation fee.`,
        `<strong>Would you like me to get you set up?</strong>`
    ];
}

// Value-building talk track, one entry per benefit. The price guarantee leads — it's the main value
// (star: true, same as the key point). Filled in with the client's numbers like the pitch.
function buildPremierValuePoints(s) {
    const apps = PREMIER_CONFIG.applications_per_season;
    const exampleIncrease = 5; // $ per application, for the "what an increase costs you" example
    return [
        {
            title: 'Rate guaranteed through Nov 1st, 2028',
            star: true,
            paragraphs: [
                `Nearly every year, the cost of providing service goes up. Labor costs more, the solution we apply costs more, and inflation touches everything else. That’s why most customers see their price go up from one year to the next.`,
                `With Premier, your rate of <strong>${formatPremierMoney(s.discounted)} per application is guaranteed through Nov 1st, 2028</strong>. That covers both the 2027 and 2028 seasons. No matter what happens with costs over the next two years, your price stays the same.`,
                `Even a ${formatPremierMoney(exampleIncrease)} increase per application would add <strong>${formatPremierMoney(exampleIncrease * apps)} over a ${apps}-application season</strong>. Premier protects you from that for two full years.`
            ]
        },
        {
            title: '5% discount on each application',
            paragraphs: [
                `On top of guaranteeing your rate, we take 5% off it, so every application drops from ${formatPremierMoney(s.rate)} to <strong>${formatPremierMoney(s.discounted)}</strong>. That lower rate is the one we guarantee, so you keep the discount for both seasons.`
            ]
        },
        {
            title: 'Low monthly payments',
            paragraphs: [
                `There’s no big bill in the spring and nothing to pay at each visit. It’s <strong>${formatPremierMoney(s.monthly)} a month</strong> starting ${PREMIER_CONFIG.billing_start}, the same amount every month, so it’s easy to budget for.`
            ]
        },
        {
            title: 'Full-season protection',
            paragraphs: [
                `You’re covered April through October with up to ${apps} applications. You’re protected from the first warm days of spring right through the fall, without having to think about scheduling or missing an application.`
            ]
        },
        {
            title: 'No contract or cancellation fee',
            paragraphs: [
                `You get all of this without being tied down. There’s no contract and no cancellation fee, so you stay in full control and there’s no risk in trying it.`
            ]
        }
    ];
}

const PREMIER_OBJECTIONS = [
    {
        q: 'I don’t like paying all year.',
        a: 'I completely understand. The reason many customers love this plan is it spreads out the cost so you avoid a big spring bill or the need to pay at every application throughout the season, while also guaranteeing lower per-application pricing through Nov 1st, 2028. And since there’s no cancellation fee, you stay in full control the entire time.'
    },
    {
        q: 'What if I change my mind later?',
        a: 'That’s the best part — you can cancel anytime with no penalty. The plan is designed to give you flexibility, protection, and peace of mind without locking you in.'
    },
    {
        q: 'Can’t I just stay on pay-as-you-go?',
        a: 'You absolutely can — but pay-as-you-go customers don’t get the 5% savings or the price guarantee through Nov 1st, 2028. The Premier Subscription is designed to give our loyal customers the same flexibility, while lowering the per-application cost and protecting against inflation. It’s really about better value for the exact same service.'
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
        // Steps shown in the Math Breakdown (rounded to cents for display): discounted × apps, then ÷ months
        seasonTotal: Math.round(rateCents * keptPct * apps / 100) / 100,
        monthlyExact: Math.round(rateCents * keptPct * apps / (100 * months)) / 100,
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

function getPremierAddonConfig(addonKey) {
    return PREMIER_CONFIG.addons.find(a => a.key === addonKey);
}

// Price inside the Premier flow — the Premier-only price if one is set (Premier+), else the regular add-on price
function getPremierAddonPrice(addonKey) {
    return getPremierAddonConfig(addonKey)?.premier_price ?? ADDON_DATA[addonKey]?.monthlyPrice ?? 0;
}

function isPremierPlus(addonKey) {
    return Boolean(getPremierAddonConfig(addonKey)?.premier_plus);
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

// Sold/Pitched buttons on page6 show a pop-up first, then open their page
function sellPremier() {
    const commission = premierAddon === 'none'
        ? PREMIER_CONFIG.sale_commission
        : PREMIER_CONFIG.addon_sale_commission;
    showPremierAlertThen('sold', `
        <div class="premier-alert-icon">🎉</div>
        <div class="premier-alert-title">Premier Sold!</div>
        <div class="premier-alert-commission">+$${commission}</div>
        <p class="premier-alert-note">commission earned. Nice work!</p>
    `, PREMIER_SOLD_ALERT_MS, goToPremierSold);
}

function pitchPremier() {
    showPremierAlertThen('pitched', `
        <div class="premier-alert-icon">💪</div>
        <div class="premier-alert-title">Not a dead lead!</div>
        <p class="premier-alert-note">Most clients just need time to think it over. Send the follow-up email and check back in throughout the month.</p>
    `, PREMIER_PITCHED_ALERT_MS, goToPremierEmail);
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

    const tierDisplay = document.getElementById('premierTierDisplay');
    tierDisplay.innerHTML = '';
    tierDisplay.classList.remove('warning');

    hidePremierAlert();

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
        // Dead end: the pop-up only offers Reset, which starts a fresh check
        showPremierAlert('fail', `
            <div class="premier-alert-icon">✖</div>
            <div class="premier-alert-title">Not Eligible for Premier</div>
            <ul class="premier-alert-reasons">${result.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
            <button class="btn btn-primary premier-alert-btn" onclick="resetPremier()">Reset</button>
        `);
        return;
    }

    premierState = { ...result, ...calculatePremierPricing(rate) };
    premierAddon = 'none';
    renderPremierResults();

    // Stays up until the rep confirms the ServiceMinder tag — Continue is locked until the box is checked
    showPremierAlert('pass', `
        <div class="premier-alert-icon">✔</div>
        <div class="premier-alert-title">Eligible for Premier</div>
        <p class="premier-alert-note">${buildPremierTierNote(premierState)}</p>
        <div class="premier-alert-task">
            <p>Before continuing, tag the client&rsquo;s account on <strong>ServiceMinder</strong> with:</p>
            <span class="premier-alert-tag">${PREMIER_ELIGIBLE_TAG}</span>
        </div>
        <label class="premier-alert-confirm">
            <input type="checkbox" id="premierTagConfirm" onchange="document.getElementById('premierTagContinue').disabled = !this.checked">
            <span>I&rsquo;ve tagged the account &ldquo;${PREMIER_ELIGIBLE_TAG}&rdquo; on ServiceMinder</span>
        </label>
        <button id="premierTagContinue" class="btn btn-primary premier-alert-btn" onclick="hidePremierAlert(); showPremierPage('page6')" disabled>Continue</button>
    `);
}

// "$89/app meets the current Up to 0.50 acre bi-weekly rate ($89)." — shown in the pass pop-up
function buildPremierTierNote(s) {
    return s.rate > s.tierRate
        ? `${formatPremierMoney(s.rate)}/app is above the current ${s.tier} acre bi-weekly rate (${formatPremierMoney(s.tierRate)}). The 5% discount applies to their current rate.`
        : `${formatPremierMoney(s.rate)}/app meets the current ${s.tier} acre bi-weekly rate (${formatPremierMoney(s.tierRate)}).`;
}

function showPremierAlert(type, html) {
    const card = document.getElementById('premierAlertCard');
    card.className = `premier-alert ${type}`;
    card.innerHTML = html;
    document.getElementById('premierAlert').style.display = '';
}

// Show a pop-up for `ms`, then close it and run `next` (usually opening the next page)
function showPremierAlertThen(type, html, ms, next) {
    showPremierAlert(type, html);
    premierAdvanceTimer = setTimeout(() => {
        hidePremierAlert();
        next();
    }, ms);
}

function hidePremierAlert() {
    clearTimeout(premierAdvanceTimer);
    premierAdvanceTimer = null;
    document.getElementById('premierAlert').style.display = 'none';
    document.getElementById('premierAlertCard').innerHTML = '';
}

// ---- Page 6: Results ----

function renderPremierResults() {
    const s = premierState;

    document.getElementById('premierPackage').innerHTML = `
        <div class="package-card recommended premier-card">
            <div class="package-header">
                <h3 class="package-title">Premier Subscription</h3>
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
                    <div class="pricing-amount premier-monthly-amount">${formatPremierMoney(s.monthly)}/mo</div>
                    <div class="premier-pricing-sub">Starting ${PREMIER_CONFIG.billing_start} · covers the 2027 season onward</div>
                </div>
            </div>
            <div class="premier-guarantee">
                <span class="premier-guarantee-icon">🛡️</span>
                <div>
                    <div class="premier-guarantee-title">${PREMIER_CONFIG.price_guarantee_text}</div>
                    <div class="premier-guarantee-sub">2 full years of protected pricing — no increases, no inflation worries</div>
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
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Pitch</h4>
                <div class="tp-content collapsed">
                    <div class="premier-pitch">
                        ${buildPremierPitch(s).map(p => `<p>${p}</p>`).join('')}
                    </div>
                </div>
            </div>
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Why Premier?</h4>
                <div class="tp-content collapsed">
                    <div class="tp-section">
                        <div class="tp-section-title">Key Points to Present</div>
                        <ul>${PREMIER_KEY_POINTS.map(p => `<li${p.star ? ' class="premier-star"' : ''}>${p.text}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Value Building</h4>
                <div class="tp-content collapsed">
                    ${buildPremierValuePoints(s).map(v => `
                        <div class="premier-value">
                            <div class="premier-value-title">${v.star ? '⭐ ' : ''}${v.title}</div>
                            ${v.paragraphs.map(p => `<p>${p}</p>`).join('')}
                        </div>
                    `).join('')}
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
            <div class="talking-points premier-summer">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">☀️ Summer Plan Client? Show Their Savings</h4>
                <div class="tp-content collapsed">
                    <div class="input-group">
                        <label for="premierSummerPrice">2026 Summer Plan Price ($):</label>
                        <p class="input-hint">Enter the total the client paid for their Summer Plan this year. It&rsquo;s divided by ${PREMIER_CONFIG.summer_plan_sprays} sprays to get their per-spray rate.</p>
                        <input type="number" id="premierSummerPrice" step="0.01" min="0.01" placeholder="Summer Plan total (e.g., 594)" oninput="updatePremierSummerSavings()">
                    </div>
                    <div id="premierSummerResult"></div>
                </div>
            </div>
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Math Breakdown</h4>
                <div class="tp-content collapsed">
                    <div class="premier-breakdown">
                        <div class="premier-line">
                            <span>${formatPremierMoney(s.rate)} × ${1 - PREMIER_CONFIG.discount_rate}<small>5% off each application</small></span>
                            <span class="premier-line-amount">${formatPremierMoney(s.discounted)}/app</span>
                        </div>
                        <div class="premier-line">
                            <span>${formatPremierMoney(s.discounted)} × ${PREMIER_CONFIG.applications_per_season}<small>${PREMIER_CONFIG.applications_per_season} applications per season</small></span>
                            <span class="premier-line-amount">${formatPremierMoney(s.seasonTotal)}</span>
                        </div>
                        <div class="premier-line">
                            <span>${formatPremierMoney(s.seasonTotal)} ÷ ${PREMIER_CONFIG.payment_months}<small>${PREMIER_CONFIG.payment_months} monthly payments</small></span>
                            <span class="premier-line-amount">${formatPremierMoney(s.monthlyExact)}</span>
                        </div>
                        <div class="premier-line">
                            <span><strong>Rounded up to the next dollar</strong></span>
                            <span class="premier-line-amount premier-monthly-amount">${formatPremierMoney(s.monthly)}/mo</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('premierAddonCards').innerHTML = PREMIER_CONFIG.addons
        .map(a => a.premier_plus ? buildPremierPlusCard(a.key) : buildPremierAddonCard(a.key))
        .join('');

    renderPremierAddonOptions('premierAddonOptions', 'premier_addon');
    updatePremierAddonTotal();
}

// Summer Plan clients: their 2026 per-spray rate (plan price ÷ sprays) vs. the Premier per-treatment rate.
// Integer cents, like calculatePremierPricing, so the per-spray split and difference come out exact.
function calculatePremierSummerSavings(summerPrice) {
    const sprays = PREMIER_CONFIG.summer_plan_sprays;
    const perSprayCents = Math.round(summerPrice * 100 / sprays);
    const discountedCents = Math.round(premierState.discounted * 100);
    const savingsCents = perSprayCents - discountedCents;
    return {
        sprays,
        perSpray: perSprayCents / 100,
        savingsPerSpray: savingsCents / 100,
        savingsPct: Math.round(savingsCents / perSprayCents * 100)
    };
}

function updatePremierSummerSavings() {
    const el = document.getElementById('premierSummerResult');
    const summerPrice = parseFloat(document.getElementById('premierSummerPrice').value);
    if (!premierState || !summerPrice || summerPrice <= 0) {
        el.innerHTML = '';
        return;
    }

    const s = premierState;
    const sum = calculatePremierSummerSavings(summerPrice);
    const saves = sum.savingsPerSpray > 0;

    // Premier isn't cheaper per spray — say so plainly rather than show a negative "savings"
    const talkTrack = saves
        ? `This year your Summer Plan worked out to <strong>${formatPremierMoney(sum.perSpray)} per spray</strong>. With Premier, every treatment is just <strong>${formatPremierMoney(s.discounted)}</strong>, so you’re saving <strong>${formatPremierMoney(sum.savingsPerSpray)} on every spray</strong>, and you’re covered the full season, April through October, instead of just the summer.`
        : `Premier’s per-treatment rate isn’t lower than this client’s Summer Plan per-spray rate. Lead with full-season coverage (up to ${PREMIER_CONFIG.applications_per_season} applications vs. ${sum.sprays}), low monthly payments, and the price guarantee instead.`;

    el.innerHTML = `
        <div class="premier-savings">
            <div class="premier-savings-head">
                <span class="premier-savings-title">☀️ Summer Plan vs. Premier</span>
                ${saves ? `<span class="premier-savings-badge">Save ${formatPremierMoney(sum.savingsPerSpray)}/spray</span>` : ''}
            </div>
            <div class="premier-line">
                <span>2026 Summer Plan (per spray)<small>${formatPremierMoney(summerPrice)} ÷ ${sum.sprays} sprays</small></span>
                <span class="premier-line-amount${saves ? ' strike' : ''}">${formatPremierMoney(sum.perSpray)}</span>
            </div>
            <div class="premier-line">
                <span>Premier Rate (per treatment)<small>${formatPremierMoney(s.rate)} bi-weekly rate, 5% off</small></span>
                <span class="premier-line-amount${saves ? ' savings' : ''}">${formatPremierMoney(s.discounted)}</span>
            </div>
            ${saves ? `
            <div class="premier-line">
                <span><strong>Savings per spray</strong></span>
                <span class="premier-line-amount savings">${formatPremierMoney(sum.savingsPerSpray)} (${sum.savingsPct}% less)</span>
            </div>` : ''}
        </div>
        <div class="${saves ? 'premier-pitch' : 'premier-summer-warning'}"><p>${talkTrack}</p></div>
    `;
}

// Regular add-on card, but with Premier's terms: add-ons bundled with Premier are no contract
// (the regular calculator's add-on page keeps its 12-month agreement wording)
function buildPremierAddonCard(addonKey) {
    return buildAddonCard(addonKey, 'Optional Add-On')
        .replace(/ on a 12-month agreement/g, ', no contract')
        .replace(/12-month agreement/g, 'no contract');
}

// Premier+ talking points — numbers are filled from the client's Premier pricing
function getPremierPlusPitch(regular, price) {
    const monthlySave = regular - price;
    const yearlySave = monthlySave * PREMIER_CONFIG.payment_months;
    const totalYearlySave = premierState.savings + yearlySave;

    return {
        pitch: [
            'Since you’re going with Premier for the yard, I want to show you what makes <strong>Premier+</strong> our most complete protection — it takes that same coverage from the yard to the home itself.',
            'Premier handles mosquitoes and ticks outside, April through October. Premier+ adds <strong>three foundation treatments a year</strong> — spring, summer, and fall — that keep ants, spiders, and 30+ other insects from getting inside, plus <strong>two rodent bait stations we check every quarter, all year long</strong>. So when mosquito season ends and it gets cold — right when mice start looking for a way in — you’re already covered.',
            'And you don’t have to wait for spring to start. <strong>We’ll get your first Insect + Rodent visit done this year</strong>, so your home is protected heading into the colder months — then your mosquito and tick protection kicks off as soon as the season opens back up in April.',
            'Each station works two ways: one bait takes care of active rodents, and a birth-control bait stops the smarter ones from reproducing. That’s how 2 mice never turn into 50. And if you’re seeing ants inside, we’ll leave you an interior ant bait that works hand-in-hand with the outside treatment.',
            `Normally Insect + Rodent is $${regular} a month. Because you’re on Premier, it’s only <strong>$${price}</strong> — that’s <strong>$${monthlySave} off every month, $${yearlySave} a year</strong>. Add that to your Premier savings and you’re saving <strong>${formatPremierMoney(totalYearlySave)} a year</strong>. Just like Premier, there’s <strong>no contract</strong>, and it all starts on the same November 1st billing as your Premier payment.`,
            '<strong>Yard, home, and everything in between — Premier+ is the one I’d recommend. Want me to set you up with Premier+?</strong>'
        ],
        value: [
            '<strong>Outside and in</strong> — Premier protects the yard; Premier+ protects the home too',
            '<strong>Year-round rodent protection</strong> — stations checked quarterly, even after mosquito season ends',
            '<strong>Protection starts this year</strong> — first Insect + Rodent visit now; mosquito & tick kicks off in April',
            `<strong>$${monthlySave} off every month</strong> — $${price}/mo instead of $${regular}/mo ($${yearlySave}/yr), only with Premier`,
            `<strong>${formatPremierMoney(totalYearlySave)} total savings per year</strong> with Premier+ (${formatPremierMoney(premierState.savings)} Premier + $${yearlySave} add-on)`,
            '<strong>No contract</strong> — same flexibility as Premier, billed together starting November 1st',
            '<strong>Stops 2 mice from becoming 50</strong> — dual bait kills active rodents and stops reproduction',
            '<strong>Interior ant bait included</strong> for anything already inside'
        ],
        objection: {
            q: 'I don’t really have a rodent or ant problem.',
            a: `That’s great — and it’s actually the best time to start. It’s a lot easier (and cheaper) to keep pests out than to get them out once they’re inside. Premier+ keeps that barrier up before anything shows up, and with Premier you’re getting it for $${price} a month instead of $${regular}.`
        },
        // Premier+ service terms
        details: [
            '<strong>3 foundation treatments per year</strong> (spring, summer, fall) — 90-day barrier each',
            '<strong>First Insect + Rodent visit this year (2026)</strong> — mosquito & tick service starts when the season opens in April 2027',
            'Targets ants, spiders, cockroaches, silverfish, centipedes, earwigs, crickets, beetles, millipedes, and more',
            '<strong>2 rodent bait stations</strong> placed on either side of the home',
            'Stations checked <strong>quarterly</strong>',
            'Dual bait: rodenticide (kills) + birth control (long-term population control)',
            '<strong>Interior ant bait included</strong>',
            `<strong>$${price}/month bundled</strong> with Premier (regularly $${regular}/month) — <strong>no contract</strong>, billing starts ${PREMIER_CONFIG.billing_start}`
        ]
    };
}

// Premier+ upsell card: its own pitch, value points, and service details
function buildPremierPlusCard(addonKey) {
    const regular = ADDON_DATA[addonKey].monthlyPrice;
    const price = getPremierAddonPrice(addonKey);
    const tp = getPremierPlusPitch(regular, price);

    return `
        <div class="package-card addon-card premier-plus-card">
            <div class="package-header">
                <h3 class="package-title">Premier+ — Insect + Rodent Prevention</h3>
                <span class="premier-badge">Premier+ Exclusive</span>
            </div>
            <div class="pricing-row">
                <div class="pricing-option">
                    <div class="pricing-label">Premier+ Bundled Monthly</div>
                    <div class="pricing-amount"><span class="premier-was">$${regular}</span> $${price}/mo</div>
                    <div class="premier-pricing-sub">Save $${regular - price}/mo ($${(regular - price) * PREMIER_CONFIG.payment_months}/yr) — only with Premier</div>
                </div>
            </div>
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Why Premier+?</h4>
                <div class="tp-content collapsed">
                    <div class="tp-pitch">${tp.pitch.map(p => `<p>${p}</p>`).join('')}</div>
                    <div class="tp-section">
                        <div class="tp-section-title">Value to Highlight</div>
                        <ul>${tp.value.map(v => `<li>${v}</li>`).join('')}</ul>
                    </div>
                    <div class="tp-section">
                        <div class="tp-section-title">If They Push Back</div>
                        <div class="premier-objection">
                            <div class="premier-objection-q">“${tp.objection.q}”</div>
                            <p>${tp.objection.a}</p>
                        </div>
                    </div>
                    <div class="tp-section">
                        <div class="tp-section-title">Key Details</div>
                        <ul>${tp.details.map(d => `<li>${d}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
        </div>
    `;
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
    refreshPremierEmailIfShown();
}

function updatePremierAddonTotal() {
    const el = document.getElementById('premierAddonTotal');
    if (!premierState) {
        el.innerHTML = '';
        return;
    }
    const addonPrice = premierAddon === 'none' ? 0 : getPremierAddonPrice(premierAddon);
    const label = isPremierPlus(premierAddon) ? 'Premier+ total' : 'Total';
    el.innerHTML = addonPrice
        ? `<strong>${label}:</strong> ${formatPremierMoney(premierState.monthly)} + $${addonPrice} = <strong>${formatPremierMoney(premierState.monthly + addonPrice)}/mo</strong>`
        : `<strong>${label}:</strong> ${formatPremierMoney(premierState.monthly)}/mo (Premier only)`;
}

// ---- CRM notes (page7 Sold, page8 Pitched) ----

// "Premier Sub: $121/mo ($103.55 per app)"
// "Premier+ Sub: $121/mo Premier ($103.55 per app) + $39/mo Insect & Rodent (reg. $59) = $160/mo total"
function buildPremierOffer() {
    const s = premierState;
    const addon = getPremierAddonConfig(premierAddon);
    const program = addon?.premier_plus ? 'Premier+ Sub' : 'Premier Sub';
    const perApp = `(${formatPremierMoney(s.discounted)} per app)`;

    if (!addon) return `${program}: ${formatPremierMoney(s.monthly)}/mo ${perApp}`;

    const price = getPremierAddonPrice(addon.key);
    const regular = ADDON_DATA[addon.key].monthlyPrice;
    const regNote = price < regular ? ` (reg. $${regular})` : '';
    return `${program}: ${formatPremierMoney(s.monthly)}/mo Premier ${perApp} + $${price}/mo ${addon.crm_label}${regNote} = ${formatPremierMoney(s.monthly + price)}/mo total`;
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
    return withPremierExtraNotes(`Signed on ${buildPremierOffer()} :: ${PREMIER_CONFIG.price_guarantee_text}`, 'premierCrmExtra');
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

// ---- Page 8: Pitched (follow-up email + pitched CRM note) ----

// Email quote block for the pitched add-on — client-facing wording, prices filled in at build time
const PREMIER_EMAIL_ADDONS = {
    'insect_rodent_plan': {
        heading: 'Premier+ Upgrade: Insect & Rodent Protection',
        bullets: (price, regular) => [
            '<strong>3 foundation treatments a year</strong> (spring, summer, and fall) to keep ants, spiders, and 30+ other insects from getting inside',
            '<strong>2 rodent bait stations</strong>, checked quarterly all year long',
            '<strong>Interior ant bait included</strong> for anything already inside',
            '<strong>First Insect & Rodent visit this year</strong> — your home is protected heading into the colder months',
            `<strong>Only $${price}/month with Premier</strong> (regularly $${regular}/month) — no contract`
        ]
    },
    'insect_plan': {
        heading: 'Add-On: Insect Only Protection',
        bullets: price => [
            '<strong>3 foundation treatments a year</strong> (spring, summer, and fall) to keep ants, spiders, and 30+ other insects from getting inside',
            '<strong>Interior ant bait included</strong> for anything already inside',
            `<strong>$${price}/month</strong> bundled with Premier — no contract`
        ]
    }
};

function buildPremierEmailAddon() {
    const addon = getPremierAddonConfig(premierAddon);
    const content = addon && PREMIER_EMAIL_ADDONS[addon.key];
    if (!content) return '';

    const s = premierState;
    const price = getPremierAddonPrice(addon.key);
    const regular = ADDON_DATA[addon.key].monthlyPrice;
    const shortName = addon.premier_plus ? 'Premier+' : addon.crm_label;

    let html = `<p><strong>${content.heading}</strong></p>`;
    html += `<ul>${content.bullets(price, regular).map(b => `<li>${b}</li>`).join('')}</ul>`;
    html += `<p><strong>Your total: ${formatPremierMoney(s.monthly + price)}/month</strong> starting ${PREMIER_CONFIG.billing_start} (${formatPremierMoney(s.monthly)} Premier + $${price} ${shortName})</p>`;
    return html;
}

// Keep an already-generated email in sync when the rep changes the add-on
function refreshPremierEmailIfShown() {
    const shown = document.getElementById('premierGeneratedEmail').style.display === 'block';
    const hasNames = document.getElementById('premierClientName').value.trim() && document.getElementById('premierRepName').value.trim();
    if (shown && hasNames) generatePremierEmail();
}

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
    html += `<p>Thank you for your interest in our 2026 Premier Subscription Program! We’re excited to have you join one of our most popular and rewarding options for full-season protection heading into 2027.</p>`;
    html += `<p>Here’s a quick recap of what your Premier Subscription includes:</p>`;
    html += `<ul>`;
    html += `<li><strong>Full-Season Protection:</strong> Protected from April through October, starting with the 2027 season (up to 14 applications per season)</li>`;
    html += `<li><strong>Automatic 5% Discount:</strong> Savings applied to every visit, based on your current 2026 per-treatment rate</li>`;
    html += `<li><strong>Low Monthly Payments:</strong> Starting November 1st, 2026, spreading your cost evenly through the year</li>`;
    html += `<li><strong>Two-Year Price Guarantee:</strong> Your rate is guaranteed through Nov 1st, 2028 — no increases, no inflation worries</li>`;
    html += `<li><strong>No Contract or Cancellation Fees:</strong> Full flexibility, full protection</li>`;
    html += `</ul>`;
    html += `<p><strong>Your Personalized Plan</strong><br>Here’s how your numbers break down based on your current 2026 rate:</p>`;
    html += `<ul>`;
    html += `<li>Your 2026 Price Per Spray: <strong>${formatPremierMoney(s.rate)}</strong></li>`;
    html += `<li>Premier Discounted Price Per Spray (5% off): <strong>${formatPremierMoney(s.discounted)}</strong></li>`;
    html += `<li>Monthly Payment: <strong>${formatPremierMoney(s.monthly)}</strong> starting November 1st, 2026</li>`;
    html += `</ul>`;
    html += buildPremierEmailAddon();
    html += `<p>To finalize your Premier Subscription, simply reply to this email confirming that you’d like to move forward. We’ll take care of everything else and ensure your account is set up for the 2027 season.</p>`;
    html += `<p>We’re thrilled to continue keeping your yard mosquito- and tick-free — and now, with even more savings and convenience!</p>`;
    html += `<p>Best regards,<br>${escapePremierHtml(repName)}<br>Mosquito Mike</p>`;

    document.getElementById('premierEmailContent').innerHTML = html;
    document.getElementById('premierGeneratedEmail').style.display = 'block';
}
