// Global variables
let currentTier = null;
let debugMode = false;
let showNaturalPricing = false; // Toggle between traditional and natural pricing
let pricingOnlyMode = false; // True when user skips questions and views all pricing
let lastAnswers = null; // Store last customer answers for use across pages

// Update tier display as user types
document.getElementById('acreage').addEventListener('input', function() {
    const acres = parseFloat(this.value);
    const tierDisplay = document.getElementById('tierDisplay');
    
    const btnViewPricing = document.getElementById('btnViewPricing');

    if (!acres || acres <= 0) {
        tierDisplay.innerHTML = '';
        currentTier = null;
        btnViewPricing.style.display = 'none';
        return;
    }

    if (acres > 3.0) {
        tierDisplay.innerHTML = '<strong>⚠️ Properties over 3.0 acres require a manual quote</strong>';
        tierDisplay.classList.add('warning');
        currentTier = null;
        btnViewPricing.style.display = 'none';
        return;
    }

    currentTier = determineTier(acres);
    tierDisplay.classList.remove('warning');
    tierDisplay.innerHTML = `<strong>Pricing Tier:</strong> ${currentTier} acre coverage`;
    btnViewPricing.style.display = 'block';
});

function determineTier(acres) {
    if (acres <= 0.1) return "Up to 0.10";
    
    for (const boundary of PRICING_JSON.tiering.boundaries) {
        if (acres > boundary.lower_gt && acres <= boundary.upper_le) {
            return boundary.tier_label;
        }
    }
    
    return "Up to 3.00";
}

function calculatePackages() {
    // Validate inputs
    const acreage = parseFloat(document.getElementById('acreage').value);
    if (!acreage || acreage <= 0 || acreage > 3.0) {
        alert('Please enter a valid acreage between 0.01 and 3.00 acres');
        return;
    }
    
    const answers = {
        pest_concern: document.querySelector('input[name="pest_concern"]:checked')?.value,
        other_pests: document.querySelector('input[name="other_pests"]:checked')?.value,
        standing_water: document.querySelector('input[name="standing_water"]:checked')?.value,
        kids_pets: document.querySelector('input[name="kids_pets"]:checked')?.value,
        yard_use: document.querySelector('input[name="yard_use"]:checked')?.value,
        payment_preference: document.querySelector('input[name="payment_preference"]:checked')?.value
    };
    
    // Check all questions are answered
    for (const [key, value] of Object.entries(answers)) {
        if (!value) {
            alert('Please answer all questions before proceeding');
            return;
        }
    }
    
    pricingOnlyMode = false;
    lastAnswers = answers;
    document.getElementById('outcomeButtons').style.display = '';

    // Get recommendations from lookup table
    const recommendations = getRecommendations(answers);

    // Display results
    displayResults(recommendations, answers, acreage);

    // Add showing-results class to hide header on results page
    document.body.classList.add('showing-results');
    
    // Switch to results page
    document.getElementById('page1').classList.remove('active');
    document.getElementById('page2').classList.add('active');
    
    // Scroll to top of page to show primary recommendation
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getRecommendations(answers) {
    const key = `${answers.pest_concern}|${answers.standing_water}|${answers.kids_pets}|${answers.yard_use}|${answers.payment_preference}`;
    const packages = RECOMMENDATIONS[key];
    if (!packages) {
        console.warn("No recommendation found for:", key);
        return [
            { pkg: "pps_biweekly", score: 0 },
            { pkg: "prepaid_12_biweekly", score: 0 },
            { pkg: "mem_lab_6_triweekly", score: 0 }
        ];
    }
    return packages.map((pkg, i) => ({ pkg, score: 3 - i }));
}

function viewAllPricing() {
    const acreage = parseFloat(document.getElementById('acreage').value);
    if (!acreage || acreage <= 0 || acreage > 3.0) {
        alert('Please enter a valid acreage between 0.01 and 3.00 acres');
        return;
    }

    pricingOnlyMode = true;

    // Clear recommendations section
    document.getElementById('recommendedPackages').innerHTML = '';

    // Hide outcome buttons in pricing-only mode
    document.getElementById('outcomeButtons').style.display = 'none';

    // Show all packages directly
    const container = document.getElementById('allPackages');
    container.innerHTML = '<h3>All Package Pricing</h3>';

    const allPackages = [
        'pps_biweekly', 'pps_triweekly', 'pps_monthly',
        'prepaid_10_biweekly', 'prepaid_12_biweekly', 'prepaid_14_biweekly',
        'mem_lab_6_triweekly', 'budget_12mo_monthly',
        'event_non_holiday', 'event_holiday'
    ];

    allPackages.forEach(pkg => {
        const packageDiv = createPackageCard(pkg, currentTier, null, false, 0);
        container.appendChild(packageDiv);
    });

    container.classList.add('show');

    // Hide Show/Hide All buttons since we're already showing all
    document.getElementById('btnShowAll').style.display = 'none';
    document.getElementById('btnHideAll').style.display = 'none';

    // Switch to results page
    document.body.classList.add('showing-results');
    document.getElementById('page1').classList.remove('active');
    document.getElementById('page2').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayResults(recommendations, answers, acreage) {
    const container = document.getElementById('recommendedPackages');
    container.innerHTML = '';
    
    const badges = ['Primary Recommendation', 'Fallback Option 1', 'Fallback Option 2'];
    
    recommendations.forEach((rec, index) => {
        const packageDiv = createPackageCard(
            rec.pkg,
            currentTier,
            badges[index],
            true,
            rec.score,
            answers
        );
        container.appendChild(packageDiv);
    });
    
}

function createPackageCard(packageKey, tier, badge, isRecommended, score, answers) {
    const div = document.createElement('div');
    div.className = isRecommended ? 'package-card recommended' : 'package-card';
    
    const packageName = PACKAGE_NAMES[packageKey] || packageKey;
    const traditionalPrice = PRICING_JSON.packages_by_tier[packageKey]?.[tier] || 'N/A';
    
    let naturalPrice = 'N/A';
    let naturalDisplay = 'N/A';
    
    if (packageKey === 'pps_biweekly' || packageKey === 'pps_monthly' || packageKey === 'pps_triweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.pps_per_application;
        naturalDisplay = `$${naturalPrice}/app`;
    } else if (packageKey === 'budget_12mo_monthly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.budget_per_month;
        naturalDisplay = `$${naturalPrice}/mo`;
    } else if (packageKey === 'prepaid_10_biweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.prepaid_10_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'prepaid_12_biweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.prepaid_12_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'prepaid_14_biweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.prepaid_14_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'mem_lab_6_triweekly') {
        naturalPrice = traditionalPrice + PRICING_JSON.surcharges.natural.mem_lab_total;
        naturalDisplay = `$${naturalPrice}`;
    } else if (packageKey === 'event_non_holiday' || packageKey === 'event_holiday') {
        // Event sprays don't have a natural surcharge - show traditional price
        naturalPrice = traditionalPrice;
        naturalDisplay = traditionalPrice !== 'N/A' ? `$${traditionalPrice} (one-time)` : 'N/A';
    }
    
    let traditionalDisplay = `$${traditionalPrice}`;
    if (packageKey.includes('pps')) {
        traditionalDisplay = `$${traditionalPrice}/app`;
    } else if (packageKey === 'budget_12mo_monthly') {
        traditionalDisplay = `$${traditionalPrice}/mo`;
    } else if (packageKey.includes('event')) {
        traditionalDisplay = `$${traditionalPrice} (one-time)`;
    }
    
    // Determine which pricing to show based on toggle
    let displayPrice = traditionalDisplay;
    let displayType = 'Traditional';
    
    if (showNaturalPricing) {
        displayPrice = naturalDisplay;
        displayType = 'All Natural';
    }
    
    let html = `
        <div class="package-header">
            <h3 class="package-title">${packageName}</h3>
            ${badge ? `<span class="recommendation-badge">${badge}</span>` : ''}
        </div>
        <div class="pricing-row">
            <div class="pricing-option" style="flex: 1; max-width: none;">
                <div class="pricing-label">${displayType}</div>
                <div class="pricing-amount">${displayPrice}</div>
            </div>
        </div>
    `;
    
    // Add savings breakdown for prepaid packages
    if (packageKey === 'prepaid_10_biweekly' || packageKey === 'prepaid_12_biweekly' || packageKey === 'prepaid_14_biweekly') {
        const applicationsMap = {
            'prepaid_10_biweekly': { total: 10, paid: 9 },
            'prepaid_12_biweekly': { total: 12, paid: 11 },
            'prepaid_14_biweekly': { total: 14, paid: 13 }
        };
        const appInfo = applicationsMap[packageKey];
        const ppsBiweeklyPrice = PRICING_JSON.packages_by_tier['pps_biweekly']?.[tier] || 0;
        
        if (showNaturalPricing) {
            // Show natural pricing breakdown
            const naturalPackagePrice = naturalPrice;
            if (typeof naturalPackagePrice === 'number') {
                const naturalPPSPrice = ppsBiweeklyPrice + PRICING_JSON.surcharges.natural.pps_per_application;
                const naturalRegularTotal = naturalPPSPrice * appInfo.total;
                const naturalYouPay = naturalPPSPrice * appInfo.paid;
                const naturalSavings = naturalPPSPrice;
                
                html += `
                    <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 2px solid #86efac;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-weight: 700; color: #166534; font-size: 1.05rem;">🌿 All Natural Prepay & Save</div>
                            <div style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 16px; font-size: 0.85rem; font-weight: 700;">Save $${naturalSavings}</div>
                        </div>
                        <div style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 12px;">
                            <div style="font-size: 0.85rem; color: #166534; margin-bottom: 8px; line-height: 1.5;">
                                <strong>Compare:</strong> All Natural pay-per-spray would cost<br>
                                <span style="text-decoration: line-through; color: #991b1b; font-size: 1.05rem; font-weight: 600;">$${naturalPPSPrice} × ${appInfo.total} applications = $${naturalRegularTotal}</span>
                            </div>
                            <div style="font-size: 0.9rem; color: #15803d; font-weight: 700; padding: 8px 0; border-top: 2px solid #86efac; border-bottom: 2px solid #86efac; margin: 8px 0;">
                                <strong>You pay:</strong> $${naturalPPSPrice} × ${appInfo.paid} = $${naturalYouPay}<br>
                                <span style="color: #22c55e; font-size: 1.1rem;">+ 1 FREE APPLICATION! 🎉</span>
                            </div>
                            <div style="font-size: 1rem; color: #166534; font-weight: 700; margin-top: 8px;">
                                = ${appInfo.total} total applications for $${naturalPackagePrice}
                            </div>
                        </div>
                        <div style="font-size: 0.85rem; color: #15803d; text-align: center; font-weight: 600;">
                            ✔ Same great $${naturalPPSPrice}/application rate + FREE spray bonus!
                        </div>
                    </div>
                `;
            }
        } else {
            // Show traditional pricing breakdown
            const packagePrice = traditionalPrice;
            const regularTotal = ppsBiweeklyPrice * appInfo.total;
            const youPay = ppsBiweeklyPrice * appInfo.paid;
            const savings = ppsBiweeklyPrice;
            
            html += `
                <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; border: 2px solid #86efac;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div style="font-weight: 700; color: #166534; font-size: 1.05rem;">💰 Traditional Prepay & Save</div>
                        <div style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 16px; font-size: 0.85rem; font-weight: 700;">Save $${savings}</div>
                    </div>
                    <div style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-size: 0.85rem; color: #166534; margin-bottom: 8px; line-height: 1.5;">
                            <strong>Compare:</strong> Pay-per-spray would cost<br>
                            <span style="text-decoration: line-through; color: #991b1b; font-size: 1.05rem; font-weight: 600;">$${ppsBiweeklyPrice} × ${appInfo.total} applications = $${regularTotal}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: #15803d; font-weight: 700; padding: 8px 0; border-top: 2px solid #86efac; border-bottom: 2px solid #86efac; margin: 8px 0;">
                            <strong>You pay:</strong> $${ppsBiweeklyPrice} × ${appInfo.paid} = $${youPay}<br>
                            <span style="color: #22c55e; font-size: 1.1rem;">+ 1 FREE APPLICATION! 🎉</span>
                        </div>
                        <div style="font-size: 1rem; color: #166534; font-weight: 700; margin-top: 8px;">
                            = ${appInfo.total} total applications for $${packagePrice}
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #15803d; text-align: center; font-weight: 600;">
                        ✔ Same great $${ppsBiweeklyPrice}/application rate + FREE spray bonus!
                    </div>
                </div>
            `;
        }
    }
    
    // Add talking points for recommended packages
    if (isRecommended) {
        const tp = getTalkingPoints(packageKey, answers);
        html += `
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Why this package?</h4>
                <div class="tp-content collapsed">
                    <div class="tp-pitch">${tp.pitch}</div>
                    <div class="tp-best-for"><strong>Best For:</strong> ${tp.bestFor}</div>
                    <div class="tp-section">
                        <div class="tp-section-title">Must-Mention Details</div>
                        <ul>${tp.details.map(d => `<li>${d}</li>`).join('')}</ul>
                    </div>
                    ${tp.contextual.length > 0 ? `
                    <div class="tp-section">
                        <div class="tp-section-title">Why It Fits This Customer</div>
                        <ul>${tp.contextual.map(c => `<li>${c}</li>`).join('')}</ul>
                    </div>` : ''}
                </div>
            </div>
        `;
    }
    
    // Add debug score
    if (debugMode) {
        html += `<div class="score-debug show">Score: ${score}</div>`;
    }
    
    div.innerHTML = html;
    return div;
}

function getTalkingPoints(packageKey, answers) {
    const packageData = {
        'pps_biweekly': {
            pitch: 'It\u2019s a great flexible option, serviced on a bi-weekly basis. The treatment window is every 11\u201317 days which matches the mosquito life cycle to provide your most consistent experience. Although it\u2019s a flexible plan, we ask that you receive a minimum of 7 applications. Typically we treat until it gets cold in the fall, but if you\u2019d ever like to stop earlier, just shoot us a text or a call and we\u2019ll pause your service until the next season. Based on your property size, it would be <strong>$PRICE per application</strong>.',
            bestFor: 'Customers who want flexibility without a long-term commitment.',
            details: [
                '<strong>No contract</strong> \u2014 cancel or pause anytime with a call or text',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                'Minimum of 7 applications required',
                'Payment charged at each visit (no checks or cash)',
                'Treats until cold weather in fall',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits'
            ]
        },
        'pps_triweekly': {
            pitch: 'This is our triweekly pay-as-you-go option \u2014 same flexibility as our biweekly plan but on a 3-week schedule. It\u2019s a great fit for properties with a tick concern because the triweekly cadence targets tick lifecycles, and you still get our full guarantee for mosquitoes, ticks, and fleas. No contract, no upfront payment \u2014 we just ask for a minimum of 7 applications. Based on your property size, it would be <strong>$PRICE per application</strong>, charged at each visit.',
            bestFor: 'Customers with a tick concern who still want mosquito and flea coverage guaranteed.',
            details: [
                '<strong>No contract</strong> \u2014 cancel or pause anytime with a call or text',
                'Triweekly service (every 3 weeks)',
                'Minimum of 7 applications required',
                'Payment charged at each visit (no checks or cash)',
                'Full mosquito, tick, and flea protection with Satisfaction Guarantee',
                'Unlike our monthly plan, triweekly <strong>still guarantees</strong> mosquito and flea coverage'
            ]
        },
        'pps_monthly': {
            pitch: 'This is our monthly tick control program \u2014 designed specifically for properties where ticks are the primary concern. The monthly cadence targets the tick lifecycle. It\u2019s flexible with no contract and no upfront payment, and we ask for a minimum of 7 applications. One important thing \u2014 because of the monthly schedule, <strong>this plan does not guarantee mosquito protection, only ticks</strong>. Based on your property size, it would be <strong>$PRICE per application</strong>, charged at each visit.',
            bestFor: 'Customers with a primary tick concern on tick-heavy or wooded properties.',
            details: [
                '<strong>No contract</strong> \u2014 cancel or pause anytime',
                'Monthly applications targeting the tick lifecycle',
                'Minimum of 7 applications required',
                'Payment charged at each visit (no checks or cash)',
                'Tick protection with Satisfaction Guarantee',
                '<strong>IMPORTANT: Does NOT guarantee mosquito protection \u2014 only ticks</strong>'
            ]
        },
        'prepaid_10_biweekly': {
            pitch: 'So this plan gives you 3 coverage options \u2014 5, 6, or 7 months, and they all include a free treatment. We come out every 11\u201317 days, which lines up with the mosquito life cycle to provide your most consistent experience. Based on your property, it comes out to <strong>$PER_TREATMENT per treatment</strong>. Our most popular is the 6-month plan \u2014 would you prefer coverage for 5, 6, or 7 months?',
            bestFor: 'Homeowners who want great value for peak season \u2014 about 5 months of coverage.',
            details: [
                '<strong>Pay for 9, get 10 applications</strong> (1 FREE spray!)',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                '5 months of coverage',
                'One upfront payment processed on first service date',
                'Price is locked in \u2014 no surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Free first treatment for new clients*'
            ]
        },
        'prepaid_12_biweekly': {
            pitch: 'So this plan gives you 3 coverage options \u2014 5, 6, or 7 months, and they all include a free treatment. We come out every 11\u201317 days, which lines up with the mosquito life cycle to provide your most consistent experience. Based on your property, it comes out to <strong>$PER_TREATMENT per treatment</strong>. Our most popular is the 6-month plan \u2014 would you prefer coverage for 5, 6, or 7 months?',
            bestFor: 'Homeowners who want the best overall value and season-long peace of mind.',
            details: [
                '<strong>Pay for 11, get 12 applications</strong> (1 FREE spray!) \u2014 Most Popular',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                '6 months of full season coverage',
                'One upfront payment processed on first service date',
                'Price is locked in \u2014 no surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Free first treatment for new clients*'
            ]
        },
        'prepaid_14_biweekly': {
            pitch: 'So this plan gives you 3 coverage options \u2014 5, 6, or 7 months, and they all include a free treatment. We come out every 11\u201317 days, which lines up with the mosquito life cycle to provide your most consistent experience. Based on your property, it comes out to <strong>$PER_TREATMENT per treatment</strong>. Our most popular is the 6-month plan \u2014 would you prefer coverage for 5, 6, or 7 months?',
            bestFor: 'Homeowners who want maximum coverage from early spring through late fall \u2014 7 full months.',
            details: [
                '<strong>Pay for 13, get 14 applications</strong> (1 FREE spray!) \u2014 Maximum Coverage',
                'Biweekly service every 11\u201317 days (matches mosquito life cycle)',
                '7 months of coverage \u2014 early spring through late fall',
                'One upfront payment processed on first service date',
                'Price is locked in \u2014 no surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Free first treatment for new clients*'
            ]
        },
        'mem_lab_6_triweekly': {
            pitch: 'This is a great option to cover peak activity during summer months. We service your property every 3 weeks, starting the 3rd week of May just before Memorial Day, with the last service completed just after Labor Day. With a one-time payment billed on your first scheduled treatment, the Mosquito Mike Summer Plan is only <strong>$PRICE</strong>.',
            bestFor: 'Pool owners, BBQ hosts, and anyone who lives outdoors during summer.',
            details: [
                '6 triweekly treatments (Memorial Day through Labor Day)',
                'One upfront payment processed on first scheduled treatment',
                'No surprise charges',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Great entry-level package for summer entertaining, graduations, and pool season'
            ]
        },
        'budget_12mo_monthly': {
            pitch: 'This plan is a great alternative to paying each time we come out, or having to pay everything upfront. It allows you to get a full season of tri-weekly treatments and is split into 12 easy payments. To keep them low and predictable, this is a contract-based plan with <strong>ACH accepted as the payment method</strong>. Each payment of <strong>$PRICE</strong> is due on the first of each month, unless you\u2019d prefer a different billing date.',
            bestFor: 'Families who want reliable coverage with predictable monthly payments and no large upfront cost.',
            details: [
                '<strong>Contract-based \u2014 12-month commitment required</strong>',
                'Triweekly treatments from April through mid-October',
                '12 monthly payments via <strong>ACH only</strong> (no credit or debit cards accepted)',
                'Payment due on the 1st of each month (or their preferred billing date)',
                'Mosquito, tick, and flea protection included',
                'Satisfaction Guarantee \u2014 free retreatments if pest activity occurs between visits',
                'Early termination: $495 or cost of remaining months, whichever is less'
            ]
        },
        'event_non_holiday': {
            pitch: 'This is a one-time application designed to mitigate mosquitos, ticks and fleas from your treatment area for the duration of your event. The application comes with a payment of <strong>$PRICE</strong> due the day before your service. If you enjoy the service and want to continue, we can prorate what you paid to a package of your choosing.',
            bestFor: 'Anyone hosting a wedding, party, graduation, or backyard event.',
            details: [
                'Single one-time treatment timed for maximum effectiveness on your event date',
                'Payment due the <strong>day before</strong> service',
                'No ongoing commitment required',
                'Mosquito, tick, and flea protection included',
                'Can prorate payment toward a seasonal package if they want to continue'
            ]
        },
        'event_holiday': {
            pitch: 'This is a one-time application designed to mitigate mosquitos, ticks and fleas from your treatment area for the duration of your event. The application comes with a payment of <strong>$PRICE</strong> due the day before your service. If you enjoy the service and want to continue, we can prorate what you paid to a package of your choosing.',
            bestFor: 'Anyone hosting a holiday gathering or special occasion.',
            details: [
                'Single one-time treatment at <strong>holiday rate</strong>',
                'Payment due the <strong>day before</strong> service',
                'No ongoing commitment required',
                'Mosquito, tick, and flea protection included',
                'Can prorate payment toward a seasonal package if they want to continue'
            ]
        }
    };

    const data = packageData[packageKey] || { pitch: '', bestFor: '', details: [] };

    // Replace $PRICE and $PER_TREATMENT placeholders with actual prices
    const tier = currentTier;
    const traditionalPrice = PRICING_JSON.packages_by_tier[packageKey]?.[tier];
    let priceDisplay = traditionalPrice ? `$${traditionalPrice}` : '$XX';
    if (packageKey.includes('pps')) priceDisplay += '/app';
    else if (packageKey === 'budget_12mo_monthly') priceDisplay += '/mo';

    // Calculate per-treatment price for prepaid packages
    // Paid app counts (excludes the 1 free app)
    const paidAppCounts = { 'prepaid_10_biweekly': 9, 'prepaid_12_biweekly': 11, 'prepaid_14_biweekly': 13 };
    let perTreatmentDisplay = '$XX';
    if (paidAppCounts[packageKey] && traditionalPrice) {
        perTreatmentDisplay = `$${Math.round(traditionalPrice / paidAppCounts[packageKey])}`;
    }

    const pitch = data.pitch.replace(/\$PER_TREATMENT/g, perTreatmentDisplay).replace(/\$PRICE/g, priceDisplay);

    const contextual = [];

    // Build contextual "Why It Fits" points based on customer answers
    if (answers) {
        if (answers.standing_water === 'yes') {
            contextual.push('Targets mosquito breeding areas \u2014 includes larvicide pucks for standing water');
        }

        if (answers.kids_pets === 'yes') {
            contextual.push('Non-toxic to anything larger than a spider \u2014 safe for kids and pets');
            if (packageKey.includes('prepaid') || packageKey === 'budget_12mo_monthly') {
                contextual.push('Regular treatments keep a consistent safe zone in the yard');
            }
        }

        if (answers.pest_concern === 'both') {
            contextual.push('Dual protection against both mosquitoes AND ticks');
        }

        if (answers.pest_concern === 'ticks' && packageKey === 'pps_triweekly') {
            contextual.push('Triweekly cadence is ideal for tick lifecycle \u2014 while still guaranteeing mosquito and flea coverage');
        }

        if (answers.yard_use === 'summer' && (packageKey.includes('10') || packageKey.includes('mem_lab'))) {
            contextual.push('Lines up perfectly with their summer yard use');
        }

        if (answers.yard_use === 'spring_fall' && (packageKey.includes('12') || packageKey.includes('14') || packageKey === 'budget_12mo_monthly')) {
            contextual.push('Full coverage from early spring through late fall');
        }

        if (answers.payment_preference === 'prepay' && packageKey.includes('prepaid')) {
            contextual.push('Matches their preference for upfront payment with built-in savings');
        }

        if (answers.payment_preference === 'pay_go' && packageKey.includes('pps')) {
            contextual.push('Aligns with their pay-as-you-go preference \u2014 no commitment pressure');
        }

        if (answers.payment_preference === 'budget' && packageKey === 'budget_12mo_monthly') {
            contextual.push('Fits their preference for spreading payments over time');
        }
    }

    return { pitch, bestFor: data.bestFor, details: data.details, contextual };
}

function showAllPackages() {
    const container = document.getElementById('allPackages');
    container.innerHTML = '<h3>All Available Package Options</h3>';
    
    // Get all packages including those not in pricing JSON
    const allPackages = [
        'pps_biweekly',
        'pps_triweekly',
        'pps_monthly',
        'prepaid_10_biweekly',
        'prepaid_12_biweekly', 
        'prepaid_14_biweekly',
        'mem_lab_6_triweekly',
        'budget_12mo_monthly',
        'event_non_holiday',
        'event_holiday'
    ];
    
    allPackages.forEach(pkg => {
        const packageDiv = createPackageCard(pkg, currentTier, null, false, 0);
        container.appendChild(packageDiv);
    });
    
    container.classList.add('show');
    
    // Toggle buttons in fixed bar
    document.getElementById('btnShowAll').style.display = 'none';
    document.getElementById('btnHideAll').style.display = 'block';
}

function hideAllPackages() {
    const container = document.getElementById('allPackages');
    container.classList.remove('show');
    container.innerHTML = ''; // Clear the content
    
    // Toggle buttons in fixed bar
    document.getElementById('btnShowAll').style.display = 'block';
    document.getElementById('btnHideAll').style.display = 'none';
}

function getNaturalSurcharge(packageKey) {
    if (packageKey === 'pps_biweekly' || packageKey === 'pps_triweekly' || packageKey === 'pps_monthly') {
        return PRICING_JSON.surcharges.natural.pps_per_application;
    } else if (packageKey === 'budget_12mo_monthly') {
        return PRICING_JSON.surcharges.natural.budget_per_month;
    } else if (packageKey === 'prepaid_10_biweekly') {
        return PRICING_JSON.surcharges.natural.prepaid_10_total;
    } else if (packageKey === 'prepaid_12_biweekly') {
        return PRICING_JSON.surcharges.natural.prepaid_12_total;
    } else if (packageKey === 'prepaid_14_biweekly') {
        return PRICING_JSON.surcharges.natural.prepaid_14_total;
    } else if (packageKey === 'mem_lab_6_triweekly') {
        return PRICING_JSON.surcharges.natural.mem_lab_total;
    }
    return 0;
}

function toggleTalkingPoints(element) {
    const h4 = element;
    const ul = h4.nextElementSibling;
    h4.classList.toggle('collapsed');
    ul.classList.toggle('collapsed');
}
function resetCalculator() {
    // Remove showing-results class
    document.body.classList.remove('showing-results');

    // Reset form
    document.getElementById('acreage').value = '';
    document.getElementById('tierDisplay').innerHTML = '';
    currentTier = null;
    pricingOnlyMode = false;

    // Clear radio buttons
    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => radio.checked = false);

    // Reset pricing toggle
    showNaturalPricing = false;
    document.getElementById('pricingToggle').checked = false;
    document.getElementById('toggleLabel').style.color = '#4a5568';
    document.getElementById('toggleLabel').style.fontWeight = '600';

    // Reset all packages display
    document.getElementById('allPackages').classList.remove('show');
    document.getElementById('allPackages').innerHTML = ''; // Clear content
    document.getElementById('btnShowAll').style.display = 'block';
    document.getElementById('btnHideAll').style.display = 'none';

    // Reset pricing-only mode elements
    document.getElementById('btnViewPricing').style.display = 'none';
    document.getElementById('outcomeButtons').style.display = '';

    // Clear email generator
    const clientName = document.getElementById('clientName');
    const repName = document.getElementById('repName');
    const generatedEmail = document.getElementById('generatedEmail');
    if (clientName) clientName.value = '';
    if (repName) repName.value = '';
    if (generatedEmail) generatedEmail.style.display = 'none';
    const planBoxes = document.querySelectorAll('.plan-check-box');
    planBoxes.forEach(b => { b.checked = false; b.disabled = false; });
    const waive = document.getElementById('waiveNatural');
    if (waive) waive.checked = false;

    // Switch back to questions page
    document.getElementById('page2').classList.remove('active');
    document.getElementById('page3').classList.remove('active');
    document.getElementById('page4').classList.remove('active');
    document.getElementById('page1').classList.add('active');

    lastAnswers = null;

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Outcome flow: Sold / Not Sold ----

function goToAddons() {
    const pitchDiv = document.getElementById('addonsPitch');
    const hasOtherPests = lastAnswers?.other_pests === 'yes';

    // Opener pitch based on yes/no answer
    let openerHtml = '';
    if (hasOtherPests) {
        openerHtml = `
            <div class="pitch-block yes">
                <h3>Opener \u2014 Customer said YES to other pests</h3>
                <p><em>Pitch Example:</em></p>
                <blockquote>
                    "I know you mentioned you've been having some issues with ants/rodents around the home \u2014
                    that's actually really common this time of year, and it's something we can help with.
                    We offer a pest add-on that covers the perimeter of your home to knock down the
                    existing activity and keep them from coming back. Since we're already going to be on
                    the property for mosquito service, it's a lot more cost-effective than hiring a separate
                    pest company. <strong>Can I walk you through the options real quick so we can knock out
                    both problems in one shot?</strong>"
                </blockquote>
            </div>
        `;
    } else {
        openerHtml = `
            <div class="pitch-block no">
                <h3>Opener \u2014 Customer said NO to other pests</h3>
                <p><em>Pitch Example:</em></p>
                <blockquote>
                    "I know you said you haven't really had issues with ants or rodents \u2014 which is great,
                    and that's exactly why I wanted to mention our preventative pest add-on.
                    It's a lot easier (and cheaper) to keep them out than it is to get them out once they're inside.
                    Since we're already coming to the property for mosquito service, we can add a quick
                    perimeter treatment to protect the home year-round. <strong>Want me to run through the
                    options real quick?</strong>"
                </blockquote>
            </div>
        `;
    }

    // Build the 3 add-on cards
    const addons = [
        { key: 'insect_rodent_plan', badge: 'Primary Recommendation' },
        { key: 'insect_plan', badge: 'Alternative Option' },
        { key: 'insect_onetime', badge: 'Fallback Option' }
    ];
    let cardsHtml = '<div class="addon-cards">';
    addons.forEach(a => {
        cardsHtml += buildAddonCard(a.key, a.badge);
    });
    cardsHtml += '</div>';

    pitchDiv.innerHTML = openerHtml + cardsHtml;

    document.getElementById('page2').classList.remove('active');
    document.getElementById('page3').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildAddonCard(addonKey, badge) {
    const data = ADDON_DATA[addonKey];
    if (!data) return '';

    const isPrimary = badge === 'Primary Recommendation';
    const cardClass = isPrimary ? 'package-card recommended addon-card' : 'package-card addon-card';

    let priceBlock = '';
    if (addonKey === 'insect_rodent_plan') {
        priceBlock = `
            <div class="pricing-row">
                <div class="pricing-option" style="flex: 1;">
                    <div class="pricing-label">Bundled Monthly</div>
                    <div class="pricing-amount">$59/mo</div>
                </div>
            </div>
        `;
    } else if (addonKey === 'insect_plan') {
        priceBlock = `
            <div class="pricing-row">
                <div class="pricing-option" style="flex: 1;">
                    <div class="pricing-label">Bundled Monthly</div>
                    <div class="pricing-amount">$29/mo</div>
                </div>
            </div>
        `;
    } else if (addonKey === 'insect_onetime') {
        priceBlock = `
            <div class="pricing-row">
                <div class="pricing-option" style="flex: 1;">
                    <div class="pricing-label">Bundled One-Time</div>
                    <div class="pricing-amount">$129</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="${cardClass}">
            <div class="package-header">
                <h3 class="package-title">${data.name}</h3>
                <span class="recommendation-badge">${badge}</span>
            </div>
            ${priceBlock}
            <div class="talking-points">
                <h4 class="collapsed" onclick="toggleTalkingPoints(this)">Pitch &amp; details</h4>
                <div class="tp-content collapsed">
                    <div class="tp-pitch">${Array.isArray(data.pitch) ? data.pitch.map(p => `<p>${p}</p>`).join('') : data.pitch}</div>
                    <div class="tp-section">
                        <div class="tp-section-title">Key Details</div>
                        <ul>${data.details.map(d => `<li>${d}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

const ADDON_DATA = {
    'insect_rodent_plan': {
        name: 'Insect + Rodent Prevention Plan (NEW for 2026)',
        monthlyPrice: 59,
        pitch: [
            'Our most complete add-on \u2014 brand new for 2026. Three foundation treatments a year (spring, summer, fall) to keep ants, spiders, and 30+ other insects from getting inside, plus two rodent bait stations on the sides of the home that we check quarterly.',
            'Each station uses a dual approach: one has bait that kills active rodents, the other has birth control bait \u2014 so smarter rodents that avoid the lethal stuff still hit the birth control and can\u2019t reproduce. Keeps 2 mice from turning into 50.',
            'And if you\u2019re already seeing ants inside the home, we\u2019ll provide an ant bait you can use indoors that pairs really well with the exterior treatment \u2014 it works hand-in-hand to knock down what\u2019s inside while we keep the outside protected.',
            'All bundled into your mosquito service at <strong>$59/month on a 12-month agreement</strong>.',
            '<strong>Honestly, for the most complete protection you can get, this is the one I\u2019d recommend \u2014 want me to go ahead and add that on for you?</strong>'
        ],
        details: [
            '<strong>3 foundation treatments per year</strong> (spring, summer, fall) \u2014 90-day barrier each',
            'Targets ants, spiders, cockroaches, silverfish, centipedes, earwigs, crickets, beetles, millipedes, and more',
            '<strong>2 rodent bait stations</strong> placed on either side of the home',
            'Stations checked <strong>quarterly</strong>',
            'Dual bait: rodenticide (kills) + birth control (long-term population control)',
            '<strong>Interior ant bait included</strong>',
            '<strong>$59/month bundled</strong> \u2014 <strong>12-month agreement</strong>'
        ]
    },
    'insect_plan': {
        name: 'Insect Prevention Plan (Subscription)',
        monthlyPrice: 29,
        pitch: [
            'If rodents aren\u2019t a concern, this is our tri-annual insect prevention on its own. We treat the foundation of the home three times a year (spring, summer, fall), which creates a barrier that blocks ants, spiders, and 30+ other insects from getting inside.',
            'Each treatment lasts about 90 days, so the three visits keep it active all season long.',
            'And if you\u2019re already seeing ants inside the home, we\u2019ll provide an ant bait you can use indoors that pairs really well with the exterior treatment \u2014 it works hand-in-hand to knock down what\u2019s inside while we keep the outside protected.',
            'Bundled with your mosquito service at <strong>$29/month on a 12-month agreement</strong>.',
            '<strong>Want me to add that on so you\u2019re covered for ants, spiders, and everything else all season?</strong>'
        ],
        details: [
            '<strong>3 foundation treatments per year</strong> (spring, summer, fall)',
            '90-day barrier per treatment',
            'Targets ants, spiders, cockroaches, silverfish, centipedes, earwigs, crickets, beetles, millipedes, and more',
            '<strong>Interior ant bait included</strong>',
            'Exterior preventative service \u2014 stops insects before they enter',
            '<strong>$29/month bundled</strong> \u2014 <strong>12-month agreement</strong>'
        ]
    },
    'insect_onetime': {
        name: 'One-Time Insect Prevention Treatment',
        pitch: [
            'If you\u2019re not looking to commit to the year-round protection, we also have a one-time foundation treatment available.',
            'Normally this is <strong>$299 as a standalone service</strong>, but because you\u2019re already getting mosquito service with us, we can bundle it in for <strong>only $129</strong> \u2014 that\u2019s a huge savings.',
            'Same application as the subscription \u2014 creates a barrier at the base of the home that blocks ants, spiders, and 30+ other insects for about 90 days. No commitment, no subscription \u2014 just knocks down the activity you\u2019re seeing.',
            '<strong>Want me to tack that on so we can knock out the pest issue while we\u2019re already out there?</strong>'
        ],
        details: [
            '<strong>Single foundation treatment</strong>',
            'Lasts up to 90 days',
            'Same application as the subscription plan',
            'Targets ants, spiders, cockroaches, silverfish, centipedes, earwigs, crickets, beetles, millipedes, and more',
            'No subscription commitment',
            '<strong>$299 standalone \u2192 $129 bundled</strong> with mosquito service (save $170)'
        ]
    }
};

function goToEmail() {
    document.getElementById('page2').classList.remove('active');
    document.getElementById('page4').classList.add('active');
    document.getElementById('generatedEmail').style.display = 'none';
    initEmailPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Plan definitions for email generator ----
const EMAIL_PLANS = [
    {
        key: 'pps_biweekly',
        title: 'Pay-As-You-Go Biweekly',
        rateSuffix: '/per visit',
        bestFor: 'Customers who want flexibility without a long-term commitment.',
        bullets: [
            'Service every 11\u201317 days (aligned with mosquito life cycle)',
            'No contract, no upfront cost \u2014 pay only when treated',
            'Covers mosquitoes, ticks, and fleas',
            'Minimum of 7 applications',
            'Satisfaction Guarantee \u2014 retreatments provided if pest activity occurs between visits',
            'Charged per visit via card or ACH on autopay'
        ]
    },
    {
        key: 'pps_triweekly',
        title: 'Pay-As-You-Go Triweekly',
        rateSuffix: '/per visit',
        bestFor: 'Customers with a tick concern who still want mosquito and flea coverage guaranteed.',
        bullets: [
            'Service approximately every 3 weeks',
            'No contract, no upfront cost \u2014 pay only when treated',
            'Covers mosquitoes, ticks, and fleas',
            'Satisfaction Guarantee \u2014 retreatments provided if pest activity occurs between visits',
            'Charged per visit via card or ACH on autopay'
        ]
    },
    {
        key: 'pps_monthly',
        title: 'Pay-As-You-Go Monthly',
        rateSuffix: '/per visit',
        bestFor: 'Customers with a primary tick concern on tick-heavy or wooded properties.',
        bullets: [
            'Service approximately every 4 weeks (not guaranteed scheduling)',
            'Primarily focused on tick control, with secondary mosquito reduction',
            'No service guarantee included for mosquitoes, ticks only',
            'Charged per visit via card or ACH on autopay'
        ]
    },
    {
        key: 'prepaid',
        title: 'Prepaid Season Plans \u2014 1 FREE Spray Included',
        isPrepaid: true,
        bestFor: 'Best overall value for consistent results over the course of our full season.',
        bullets: [
            'Biweekly service (every 11\u201317 days)',
            'One upfront payment \u2014 no surprise charges',
            'Price locked in for the season',
            'Covers mosquitoes, ticks, and fleas',
            'Satisfaction Guarantee included',
            'Payment processed on first service via card or ACH'
        ]
    },
    {
        key: 'mem_lab_6_triweekly',
        title: 'Summer Plan',
        rateSuffix: '',
        bestFor: 'Pool owners, BBQ hosts, and anyone who lives outdoors during summer.',
        bullets: [
            '6 treatments (Memorial Day \u2192 Labor Day)',
            'Triweekly service (approximately every 3 weeks)',
            'Covers mosquitoes, ticks, and fleas',
            'One upfront payment',
            'Satisfaction Guarantee included'
        ]
    },
    {
        key: 'budget_12mo_monthly',
        title: 'Annual Protection Plan',
        rateSuffix: '/month',
        bestFor: 'Families who want reliable coverage with predictable monthly payments and no large upfront cost.',
        bullets: [
            'Service from April through October',
            'Billed monthly over 12 months',
            'Covers mosquitoes, ticks, and fleas',
            'No large upfront cost',
            'Satisfaction Guarantee included',
            'ACH billing only',
            '12-month commitment applies'
        ]
    },
    {
        key: 'event_non_holiday',
        title: 'Event Protection Treatment',
        rateSuffix: '',
        bullets: [
            'One-time treatment for special occasions',
            'Ideal for parties, weddings, graduations, and events',
            'Timed for maximum effectiveness',
            'Provides short-term protection for mosquitoes, ticks, and fleas',
            'No ongoing commitment'
        ]
    }
];

function initEmailPage() {
    const container = document.getElementById('planCheckboxes');
    container.innerHTML = '';
    const tier = currentTier;

    EMAIL_PLANS.forEach(plan => {
        const row = document.createElement('div');
        row.className = 'plan-check';

        if (plan.isPrepaid) {
            // Default to the PPS biweekly rate \u2014 totals calculated as rate * 9/11/13
            const ppsRate = tier ? PRICING_JSON.packages_by_tier['pps_biweekly']?.[tier] : '';
            row.innerHTML = `
                <label class="plan-check-head">
                    <input type="checkbox" class="plan-check-box" data-plan="${plan.key}" onchange="enforceMaxChecks()">
                    <span class="plan-title">${plan.title}</span>
                </label>
                <div class="plan-price-single">
                    <span class="dollar">$</span>
                    <input type="text" class="plan-price" id="price_prepaid_rate" value="${ppsRate}">
                    <span class="suffix">/per visit (5 mo totals 9\u00D7, 6 mo totals 11\u00D7, 7 mo totals 13\u00D7)</span>
                </div>
            `;
        } else {
            const price = tier ? PRICING_JSON.packages_by_tier[plan.key]?.[tier] : '';
            row.innerHTML = `
                <label class="plan-check-head">
                    <input type="checkbox" class="plan-check-box" data-plan="${plan.key}" onchange="enforceMaxChecks()">
                    <span class="plan-title">${plan.title}</span>
                </label>
                <div class="plan-price-single">
                    <span class="dollar">$</span>
                    <input type="text" class="plan-price" id="price_${plan.key}" value="${price}">
                    <span class="suffix">${plan.rateSuffix}</span>
                </div>
            `;
        }
        container.appendChild(row);
    });

    // Auto-check recommended plans if available
    if (lastAnswers) {
        const recs = getRecommendations(lastAnswers);
        const checkedKeys = new Set();
        recs.slice(0, 2).forEach(rec => {
            let key = rec.pkg;
            // Map prepaid variants to the single "prepaid" checkbox
            if (key.startsWith('prepaid_')) key = 'prepaid';
            if (key === 'event_holiday') key = 'event_non_holiday';
            if (checkedKeys.has(key)) return;
            checkedKeys.add(key);
            const box = container.querySelector(`input[data-plan="${key}"]`);
            if (box) box.checked = true;
        });
        enforceMaxChecks();
    }
}

function enforceMaxChecks() {
    const boxes = document.querySelectorAll('.plan-check-box');
    const checkedCount = Array.from(boxes).filter(b => b.checked).length;
    boxes.forEach(b => {
        b.disabled = !b.checked && checkedCount >= 2;
        b.closest('.plan-check').classList.toggle('disabled', b.disabled);
    });
}

function buildPlanEmailBlock(planKey) {
    const plan = EMAIL_PLANS.find(p => p.key === planKey);
    if (!plan) return '';

    let html = '';
    if (plan.isPrepaid) {
        const rate = parseFloat(document.getElementById('price_prepaid_rate').value) || 0;
        const p5 = Math.round(rate * 9);
        const p6 = Math.round(rate * 11);
        const p7 = Math.round(rate * 13);
        html += `<p><strong>${plan.title}</strong></p>`;
        html += `<p style="font-style:italic;">${plan.bestFor}</p>`;
        html += `<ul>`;
        html += `<li>5 Months: Pay for <strong>9</strong> applications, receive <strong>10</strong> treatments \u2014 <strong>$${p5}</strong></li>`;
        html += `<li>6 Months: Pay for <strong>11</strong> applications, receive <strong>12</strong> treatments \u2014 <strong>$${p6}</strong></li>`;
        html += `<li>7 Months: Pay for <strong>13</strong> applications, receive <strong>14</strong> treatments \u2014 <strong>$${p7}</strong></li>`;
        html += `</ul>`;
        html += `<p>All prepaid plans include:</p>`;
        html += `<ul>${plan.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
    } else {
        const price = document.getElementById(`price_${plan.key}`).value;
        const priceDisplay = plan.rateSuffix ? `$${price}${plan.rateSuffix}` : `$${price}`;
        html += `<p><strong>${plan.title} \u2013 ${priceDisplay}</strong></p>`;
        if (plan.bestFor) {
            html += `<p style="font-style:italic;">Best For: ${plan.bestFor}</p>`;
        }
        html += `<ul>${plan.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
    }
    return html;
}

function generateEmail() {
    const clientNameEl = document.getElementById('clientName');
    const repNameEl = document.getElementById('repName');
    const clientName = clientNameEl.value.trim();
    const repName = repNameEl.value.trim();

    if (!clientName) {
        alert('Please enter the client\u2019s first name.');
        clientNameEl.focus();
        return;
    }
    if (!repName) {
        alert('Please enter your first name.');
        repNameEl.focus();
        return;
    }

    const checkedBoxes = Array.from(document.querySelectorAll('.plan-check-box:checked'));
    if (checkedBoxes.length === 0) {
        alert('Please select at least one plan to include in the email.');
        return;
    }

    let html = '';
    html += `<p>Hi ${clientName},</p>`;
    html += `<p>Thanks again for taking the time to go over everything with the team here at Mosquito Mike!</p>`;
    html += `<p>I\u2019ve outlined the options we discussed below so you can review them and decide what feels like the best fit for your property.</p>`;
    html += `<hr>`;

    html += `<p><strong>Mosquito &amp; Tick Treatment Options</strong></p>`;
    checkedBoxes.forEach(box => {
        html += buildPlanEmailBlock(box.dataset.plan);
    });

    // Always included: All-Natural (with optional waiver)
    const waiveNatural = document.getElementById('waiveNatural')?.checked;
    const naturalHeading = waiveNatural
        ? 'All-Natural Treatment Option \u2014 Upcharge Waived'
        : 'All-Natural Treatment Option (+$5 per visit)';
    html += `<p>\uD83C\uDF3F <strong>${naturalHeading}</strong></p>`;
    if (waiveNatural) {
        html += `<p>As a courtesy, we\u2019re <strong>waiving the standard $5/visit upcharge</strong> for the All-Natural treatment \u2014 so you can opt for the all-natural solution at no extra cost on top of your selected plan.</p>`;
    }
    html += `<ul>`;
    html += `<li>Essential oil-based treatment (lemongrass, cedarwood, castor oil, geraniol, garlic)</li>`;
    html += `<li>Equally as effective as our traditional solution</li>`;
    html += `<li>Can be applied to any mosquito &amp; tick plan</li>`;
    html += `<li>May also help deter deer activity (results can vary)</li>`;
    html += `</ul>`;

    html += `<hr>`;

    // Always included: Add-on pitch
    html += `<p><strong>General Pest Control: Discounted Add-On Programs</strong></p>`;
    html += `<p><strong>Insect Prevention Plan</strong> \u2014 Preventative treatment around the foundation of the home targeting ants, spiders, and 35+ common insects \u2014 helping stop pests before they get inside. Tri-annual treatments serviced April\u2013October.</p>`;
    html += `<ul>`;
    html += `<li><strong>Year-Round Protection</strong> \u2013 $29/month (add rodent bait stations for $59/month)</li>`;
    html += `<li><strong>One-Time Treatment</strong> \u2013 $129 (single treatment, lasts 90 days)</li>`;
    html += `</ul>`;

    html += `<hr>`;

    // Always included: Why choose Mosquito Mike?
    html += `<p><strong>Why choose Mosquito Mike?</strong></p>`;
    html += `<p>Our service is built around a structured process known as <strong>The Mosquito Mike Way</strong>. Many companies limit their service to a simple perimeter treatment \u2014 our approach is designed to fully protect your property:</p>`;
    html += `<ul>`;
    html += `<li>We start by creating a <strong>barrier around the perimeter</strong></li>`;
    html += `<li>Then we treat <strong>bushes, trees, pool areas, decks, and around the home</strong></li>`;
    html += `<li>And finally, we treat the <strong>entire lawn</strong></li>`;
    html += `</ul>`;
    html += `<p>This ensures that even if anything breaks through one area, your <strong>entire property remains protected</strong>. All services are backed by our <strong>service guarantee \u2014 if activity occurs between treatments, we return and re-treat at no charge.</strong></p>`;

    html += `<p>We also maintain clear, consistent communication throughout the <strong>entire process</strong>:</p>`;
    html += `<ul>`;
    html += `<li>A text the <strong>night before service</strong></li>`;
    html += `<li>A second notification <strong>45 minutes prior</strong> with an ETA, giving you time to prepare before treatment begins</li>`;
    html += `<li>A <strong>completion text</strong> once the service is finished</li>`;
    html += `<li>A <strong>door hanger left on-site with the technician\u2019s name</strong>, so you know exactly who serviced your property</li>`;
    html += `</ul>`;

    html += `<p>What truly sets us apart is what we call <strong>\u201CTrust You Can See\u201D</strong>:</p>`;
    html += `<ul>`;
    html += `<li><strong>Body cameras</strong> on every technician for full accountability</li>`;
    html += `<li>A <strong>mapped view of your service</strong>, showing exactly where your property was treated</li>`;
    html += `<li>Consistent coverage that aligns with <strong>The Mosquito Mike Way</strong></li>`;
    html += `<li>A responsive team available whenever you need support</li>`;
    html += `</ul>`;

    html += `<hr>`;

    html += `<p>There\u2019s usually a way to adjust our plans to get you exactly where you want to be \u2014 whether that\u2019s dialing in frequency, coverage length, or budget. If you have any questions at all or want help narrowing this down, I\u2019m happy to walk through it with you.</p>`;
    html += `<p>I can also set your service up for the time of year that works best for you \u2014 we won\u2019t treat or charge anything until you\u2019re ready to begin. Just let me know what direction you\u2019d like to go, and I\u2019ll take care of the rest.</p>`;

    html += `<p>Best regards,<br>${repName}<br>Mosquito Mike</p>`;

    document.getElementById('emailContent').innerHTML = html;
    document.getElementById('generatedEmail').style.display = 'block';
}

async function copyEmailHTML(contentId = 'emailContent', wrapperId = 'generatedEmail') {
    const contentEl = document.getElementById(contentId);
    const html = contentEl.innerHTML;
    const text = contentEl.innerText;

    try {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText
            })
        ]);
        const btn = document.querySelector(`#${wrapperId} .btn-copy`);
        btn.textContent = 'Copied! Paste into Gmail';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = 'Copy to Gmail';
            btn.classList.remove('copied');
        }, 2500);
    } catch (err) {
        // Fallback: select and copy
        const range = document.createRange();
        range.selectNodeContents(contentEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        alert('Email copied! (Fallback method \u2014 paste into Gmail to see formatting.)');
    }
}

function backToResults() {
    document.getElementById('page3').classList.remove('active');
    document.getElementById('page4').classList.remove('active');
    document.getElementById('page2').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function toggleDebug() {
    debugMode = !debugMode;
    const debugElements = document.querySelectorAll('.score-debug');
    debugElements.forEach(el => {
        el.classList.toggle('show', debugMode);
    });
}

function togglePricingMode() {
    showNaturalPricing = document.getElementById('pricingToggle').checked;
    
    // Update the label to show which mode is active
    const label = document.getElementById('toggleLabel');
    if (showNaturalPricing) {
        label.style.color = '#a0a0a0';
        label.style.fontWeight = '500';
    } else {
        label.style.color = '#4a5568';
        label.style.fontWeight = '600';
    }
    
    if (pricingOnlyMode) {
        // In pricing-only mode, just re-render all packages
        viewAllPricing();
        return;
    }

    // Re-render the recommendations with current pricing mode
    const recommendedPackagesContainer = document.getElementById('recommendedPackages');
    if (recommendedPackagesContainer.children.length > 0) {
        const answers = getCurrentAnswers();
        const acreage = parseFloat(document.getElementById('acreage').value);

        // Get recommendations from lookup table
        const recommendations = getRecommendations(answers);

        // Re-display with new pricing mode
        displayResults(recommendations, answers, acreage);
    }

    // Re-render all packages if shown
    const allPackagesContainer = document.getElementById('allPackages');
    if (allPackagesContainer.classList.contains('show')) {
        showAllPackages();
    }
}

function getCurrentAnswers() {
    return {
        pest_concern: document.querySelector('input[name="pest_concern"]:checked')?.value,
        standing_water: document.querySelector('input[name="standing_water"]:checked')?.value,
        kids_pets: document.querySelector('input[name="kids_pets"]:checked')?.value,
        yard_use: document.querySelector('input[name="yard_use"]:checked')?.value,
        payment_preference: document.querySelector('input[name="payment_preference"]:checked')?.value
    };
}
