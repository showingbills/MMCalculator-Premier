const PRICING_JSON = {
    "version": "2025-08-12",
    "currency": "USD",
    "max_covered_acres": 3.0,
    "tiering": {
        "rule": "nearest_with_midpoint_ties_down",
        "notes": [
            "If measured acres ≤ 0.10 → use 0.10 tier.",
            "If > 0.10 → round to the nearest tier among [0.25..3.00] using midpoint boundaries; ties round down (customer-friendly).",
            "Above 3.00 acres requires manual quote."
        ],
        "tiers": [
            {"label": "Up to 0.10", "max_acres": 0.1},
            {"label": "Up to 0.25", "max_acres": 0.25},
            {"label": "Up to 0.33", "max_acres": 0.33},
            {"label": "Up to 0.50", "max_acres": 0.5},
            {"label": "Up to 0.75", "max_acres": 0.75},
            {"label": "Up to 1.00", "max_acres": 1.0},
            {"label": "Up to 1.25", "max_acres": 1.25},
            {"label": "Up to 1.50", "max_acres": 1.5},
            {"label": "Up to 1.75", "max_acres": 1.75},
            {"label": "Up to 2.00", "max_acres": 2.0},
            {"label": "Up to 2.50", "max_acres": 2.5},
            {"label": "Up to 3.00", "max_acres": 3.0}
        ],
        "boundaries": [
            {"tier_label": "Up to 0.10", "lower_gt": 0.0, "upper_le": 0.1, "coverage": "≤0.10"},
            {"tier_label": "Up to 0.25", "lower_gt": 0.1, "upper_le": 0.29, "coverage": ">0.10 and ≤0.29"},
            {"tier_label": "Up to 0.33", "lower_gt": 0.29, "upper_le": 0.42, "coverage": ">0.29 and ≤0.42"},
            {"tier_label": "Up to 0.50", "lower_gt": 0.42, "upper_le": 0.62, "coverage": ">0.42 and ≤0.62"},
            {"tier_label": "Up to 0.75", "lower_gt": 0.62, "upper_le": 0.88, "coverage": ">0.62 and ≤0.88"},
            {"tier_label": "Up to 1.00", "lower_gt": 0.88, "upper_le": 1.12, "coverage": ">0.88 and ≤1.12"},
            {"tier_label": "Up to 1.25", "lower_gt": 1.12, "upper_le": 1.38, "coverage": ">1.12 and ≤1.38"},
            {"tier_label": "Up to 1.50", "lower_gt": 1.38, "upper_le": 1.62, "coverage": ">1.38 and ≤1.62"},
            {"tier_label": "Up to 1.75", "lower_gt": 1.62, "upper_le": 1.88, "coverage": ">1.62 and ≤1.88"},
            {"tier_label": "Up to 2.00", "lower_gt": 1.88, "upper_le": 2.25, "coverage": ">1.88 and ≤2.25"},
            {"tier_label": "Up to 2.50", "lower_gt": 2.25, "upper_le": 2.75, "coverage": ">2.25 and ≤2.75"},
            {"tier_label": "Up to 3.00", "lower_gt": 2.75, "upper_le": 3.0, "coverage": ">2.75 and ≤3.00"}
        ]
    },
    "packages_by_tier": {
        "pps_biweekly": {
            "Up to 0.10": 59, "Up to 0.25": 69, "Up to 0.33": 79, "Up to 0.50": 89,
            "Up to 0.75": 99, "Up to 1.00": 109, "Up to 1.25": 129, "Up to 1.50": 139,
            "Up to 1.75": 149, "Up to 2.00": 179, "Up to 2.50": 199, "Up to 3.00": 229
        },
        "pps_triweekly": {
            "Up to 0.10": 74, "Up to 0.25": 84, "Up to 0.33": 94, "Up to 0.50": 104,
            "Up to 0.75": 119, "Up to 1.00": 139, "Up to 1.25": 159, "Up to 1.50": 169,
            "Up to 1.75": 179, "Up to 2.00": 209, "Up to 2.50": 229, "Up to 3.00": 259
        },
        "pps_monthly": {
            "Up to 0.10": 99, "Up to 0.25": 99, "Up to 0.33": 99, "Up to 0.50": 119,
            "Up to 0.75": 129, "Up to 1.00": 149, "Up to 1.25": 169, "Up to 1.50": 179,
            "Up to 1.75": 189, "Up to 2.00": 219, "Up to 2.50": 239, "Up to 3.00": 269
        },
        "prepaid_10_biweekly": {
            "Up to 0.10": 531, "Up to 0.25": 621, "Up to 0.33": 711, "Up to 0.50": 801,
            "Up to 0.75": 891, "Up to 1.00": 981, "Up to 1.25": 1161, "Up to 1.50": 1251,
            "Up to 1.75": 1341, "Up to 2.00": 1611, "Up to 2.50": 1791, "Up to 3.00": 2061
        },
        "prepaid_12_biweekly": {
            "Up to 0.10": 649, "Up to 0.25": 759, "Up to 0.33": 869, "Up to 0.50": 979,
            "Up to 0.75": 1089, "Up to 1.00": 1199, "Up to 1.25": 1419, "Up to 1.50": 1529,
            "Up to 1.75": 1639, "Up to 2.00": 1969, "Up to 2.50": 2189, "Up to 3.00": 2519
        },
        "prepaid_14_biweekly": {
            "Up to 0.10": 767, "Up to 0.25": 897, "Up to 0.33": 1027, "Up to 0.50": 1157,
            "Up to 0.75": 1287, "Up to 1.00": 1417, "Up to 1.25": 1677, "Up to 1.50": 1807,
            "Up to 1.75": 1937, "Up to 2.00": 2327, "Up to 2.50": 2587, "Up to 3.00": 2977
        },
        "mem_lab_6_triweekly": {
            "Up to 0.10": 449, "Up to 0.25": 499, "Up to 0.33": 599, "Up to 0.50": 649,
            "Up to 0.75": 699, "Up to 1.00": 799, "Up to 1.25": 949, "Up to 1.50": 1099,
            "Up to 1.75": 1199, "Up to 2.00": 1299, "Up to 2.50": 1499, "Up to 3.00": 1599
        },
        "budget_12mo_monthly": {
            "Up to 0.10": 59, "Up to 0.25": 69, "Up to 0.33": 79, "Up to 0.50": 89,
            "Up to 0.75": 99, "Up to 1.00": 109, "Up to 1.25": 129, "Up to 1.50": 139,
            "Up to 1.75": 149, "Up to 2.00": 179, "Up to 2.50": 199, "Up to 3.00": 229
        },
        "event_non_holiday": {
            "Up to 0.10": 129, "Up to 0.25": 149, "Up to 0.33": 179, "Up to 0.50": 199,
            "Up to 0.75": 229, "Up to 1.00": 279, "Up to 1.25": 329, "Up to 1.50": 379,
            "Up to 1.75": 399, "Up to 2.00": 499, "Up to 2.50": 499, "Up to 3.00": 499
        },
        "event_holiday": {
            "Up to 0.10": 199, "Up to 0.25": 229, "Up to 0.33": 279, "Up to 0.50": 299,
            "Up to 0.75": 329, "Up to 1.00": 399, "Up to 1.25": 399, "Up to 1.50": 379,
            "Up to 1.75": 399, "Up to 2.00": 499, "Up to 2.50": 499, "Up to 3.00": 499
        }
    },
    "surcharges": {
        "natural": {
            "pps_per_application": 5,
            "budget_per_month": 5,
            "prepaid_10_total": 50,
            "prepaid_12_total": 60,
            "prepaid_14_total": 70,
            "mem_lab_total": 30,
            "event": null
        }
    }
};

// Hardcoded lookup table: 72 combinations → [primary, fallback1, fallback2]
// Key format: "pest_concern|standing_water|kids_pets|yard_use|payment_preference"
const RECOMMENDATIONS = {
    // === MOSQUITOES ===
    "mosquitoes|yes|yes|summer|pay_go":       ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "mosquitoes|yes|yes|summer|prepay":       ["prepaid_12_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "mosquitoes|yes|yes|summer|budget":       ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "mosquitoes|yes|yes|spring_fall|pay_go":  ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "mosquitoes|yes|yes|spring_fall|prepay":  ["prepaid_12_biweekly", "prepaid_14_biweekly", "prepaid_10_biweekly"],
    "mosquitoes|yes|yes|spring_fall|budget":  ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "mosquitoes|yes|no|summer|pay_go":        ["pps_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "mosquitoes|yes|no|summer|prepay":        ["prepaid_10_biweekly", "mem_lab_6_triweekly", "pps_biweekly"],
    "mosquitoes|yes|no|summer|budget":        ["budget_12mo_monthly", "mem_lab_6_triweekly", "pps_biweekly"],
    "mosquitoes|yes|no|spring_fall|pay_go":   ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "mosquitoes|yes|no|spring_fall|prepay":   ["prepaid_14_biweekly", "prepaid_12_biweekly", "prepaid_10_biweekly"],
    "mosquitoes|yes|no|spring_fall|budget":   ["budget_12mo_monthly", "pps_biweekly", "prepaid_12_biweekly"],
    "mosquitoes|no|yes|summer|pay_go":        ["pps_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "mosquitoes|no|yes|summer|prepay":        ["prepaid_12_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "mosquitoes|no|yes|summer|budget":        ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "mosquitoes|no|yes|spring_fall|pay_go":   ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "mosquitoes|no|yes|spring_fall|prepay":   ["prepaid_14_biweekly", "prepaid_12_biweekly", "prepaid_10_biweekly"],
    "mosquitoes|no|yes|spring_fall|budget":   ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "mosquitoes|no|no|summer|pay_go":         ["pps_biweekly", "mem_lab_6_triweekly", "pps_triweekly"],
    "mosquitoes|no|no|summer|prepay":         ["prepaid_10_biweekly", "mem_lab_6_triweekly", "pps_biweekly"],
    "mosquitoes|no|no|summer|budget":         ["budget_12mo_monthly", "pps_biweekly", "mem_lab_6_triweekly"],
    "mosquitoes|no|no|spring_fall|pay_go":    ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "mosquitoes|no|no|spring_fall|prepay":    ["prepaid_12_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "mosquitoes|no|no|spring_fall|budget":    ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],

    // === TICKS ===
    "ticks|yes|yes|summer|pay_go":            ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|yes|yes|summer|prepay":            ["mem_lab_6_triweekly", "pps_triweekly", "pps_monthly"],
    "ticks|yes|yes|summer|budget":            ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],
    "ticks|yes|yes|spring_fall|pay_go":       ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|yes|yes|spring_fall|prepay":       ["prepaid_12_biweekly", "prepaid_10_biweekly", "pps_monthly"],
    "ticks|yes|yes|spring_fall|budget":       ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],
    "ticks|yes|no|summer|pay_go":             ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|yes|no|summer|prepay":             ["prepaid_10_biweekly", "mem_lab_6_triweekly", "pps_monthly"],
    "ticks|yes|no|summer|budget":             ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],
    "ticks|yes|no|spring_fall|pay_go":        ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|yes|no|spring_fall|prepay":        ["prepaid_12_biweekly", "prepaid_10_biweekly", "pps_triweekly"],
    "ticks|yes|no|spring_fall|budget":        ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],
    "ticks|no|yes|summer|pay_go":             ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|no|yes|summer|prepay":             ["prepaid_10_biweekly", "mem_lab_6_triweekly", "pps_monthly"],
    "ticks|no|yes|summer|budget":             ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],
    "ticks|no|yes|spring_fall|pay_go":        ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|no|yes|spring_fall|prepay":        ["prepaid_12_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "ticks|no|yes|spring_fall|budget":        ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],
    "ticks|no|no|summer|pay_go":              ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|no|no|summer|prepay":              ["prepaid_10_biweekly", "mem_lab_6_triweekly", "pps_triweekly"],
    "ticks|no|no|summer|budget":              ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],
    "ticks|no|no|spring_fall|pay_go":         ["pps_triweekly", "budget_12mo_monthly", "pps_monthly"],
    "ticks|no|no|spring_fall|prepay":         ["prepaid_12_biweekly", "prepaid_10_biweekly", "pps_monthly"],
    "ticks|no|no|spring_fall|budget":         ["budget_12mo_monthly", "pps_triweekly", "pps_monthly"],

    // === BOTH ===
    "both|yes|yes|summer|pay_go":             ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|yes|yes|summer|prepay":             ["prepaid_12_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "both|yes|yes|summer|budget":             ["budget_12mo_monthly", "mem_lab_6_triweekly", "pps_biweekly"],
    "both|yes|yes|spring_fall|pay_go":        ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|yes|yes|spring_fall|prepay":        ["prepaid_14_biweekly", "prepaid_12_biweekly", "prepaid_10_biweekly"],
    "both|yes|yes|spring_fall|budget":        ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "both|yes|no|summer|pay_go":              ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|yes|no|summer|prepay":              ["prepaid_12_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "both|yes|no|summer|budget":              ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "both|yes|no|spring_fall|pay_go":         ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|yes|no|spring_fall|prepay":         ["prepaid_14_biweekly", "prepaid_12_biweekly", "prepaid_10_biweekly"],
    "both|yes|no|spring_fall|budget":         ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "both|no|yes|summer|pay_go":              ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|no|yes|summer|prepay":              ["prepaid_12_biweekly", "prepaid_10_biweekly", "mem_lab_6_triweekly"],
    "both|no|yes|summer|budget":              ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "both|no|yes|spring_fall|pay_go":         ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|no|yes|spring_fall|prepay":         ["prepaid_14_biweekly", "prepaid_12_biweekly", "prepaid_10_biweekly"],
    "both|no|yes|spring_fall|budget":         ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "both|no|no|summer|pay_go":               ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|no|no|summer|prepay":               ["prepaid_10_biweekly", "mem_lab_6_triweekly", "pps_biweekly"],
    "both|no|no|summer|budget":               ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"],
    "both|no|no|spring_fall|pay_go":          ["pps_biweekly", "budget_12mo_monthly", "pps_triweekly"],
    "both|no|no|spring_fall|prepay":          ["prepaid_14_biweekly", "prepaid_12_biweekly", "prepaid_10_biweekly"],
    "both|no|no|spring_fall|budget":          ["budget_12mo_monthly", "pps_biweekly", "pps_triweekly"]
};

// Package mapping for better display names
const PACKAGE_NAMES = {
    "prepaid_10_biweekly": "Mosquito Mike Prepaid Season Plan (10)",
    "prepaid_12_biweekly": "Mosquito Mike Prepaid Season Plan (12)",
    "prepaid_14_biweekly": "Mosquito Mike Prepaid Season Plan (14)",
    "mem_lab_6_triweekly": "Mosquito Mike Summer Plan",
    "pps_biweekly": "Mosquito Mike Pay As You Go",
    "pps_triweekly": "Mosquito Mike Pay As You Go Triweekly",
    "pps_monthly": "Mosquito Mike Pay As You Go Monthly",
    "subscription_12_month": "Mosquito Mike Annual Protection Plan",
    "budget_12mo_monthly": "Mosquito Mike Annual Protection Plan",
    "event_non_holiday": "Mosquito Mike Event Protection",
    "event_holiday": "Mosquito Mike Event Protection (Holiday)"
};

// Premier Subscription promo — enroll October 2026, billing starts Nov 1, 2026, covers the 2027 season onward
const PREMIER_CONFIG = {
    "discount_rate": 0.05,
    "applications_per_season": 14,
    "payment_months": 12,
    // Premier is always priced off the bi-weekly rate, whatever plan the client was on in 2026.
    // Eligible if the entered rate is at or above the tier's current bi-weekly rate, minus this many dollars.
    // Rates above the tier (e.g. All-Natural, +$5) always pass.
    "biweekly_rate_key": "pps_biweekly",
    "rate_tolerance": 5.00,
    "billing_start": "November 1st, 2026",
    "price_lock_text": "Price locked until Nov 1st, 2028",
    // Add-ons offered with Premier — monthly prices come from ADDON_DATA in calculator.js
    "addons": [
        { "key": "insect_plan",        "option_label": "Foundation Sub",  "crm_label": "Foundation" },
        { "key": "insect_rodent_plan", "option_label": "Insect + Rodent", "crm_label": "Insect + Rodent" }
    ]
};
