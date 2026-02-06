const schemes = require("./schemes.json");

/**
 * HARD ELIGIBILITY CHECK
 * Fail fast. No scoring here.
 */
function isEligible(scheme, user) {
  const e = scheme.eligibility;

  // Business type
  if (!e.business_types.includes(user.business_type)) return false;

  // GST
  if (e.gst_required && user.gst_registered !== true) return false;

  // Udyam
  if (e.udyam_required && user.udyam_registered !== true) return false;

  // Vintage
  if (user.vintage_years < e.min_vintage_years) return false;

  // Loan amount
  if (
    user.loan_amount < e.loan_amount.min ||
    user.loan_amount > e.loan_amount.max
  )
    return false;

  // Turnover
  if (
    user.turnover < e.turnover.min ||
    user.turnover > e.turnover.max
  )
    return false;

  // Purpose
  if (!e.primary_purpose.includes(user.loan_purpose))
    return false;


 // Collateral
if (e.collateral.required) {
  if (!user.collateral_type) return false;

  if (
    e.collateral.allowed_types.length > 0 &&
    !e.collateral.allowed_types.includes(user.collateral_type)
  ) {
    return false;
  }
}


  return true;
}

/**
 * SOFT RANKING (ONLY FOR ELIGIBLE SCHEMES)
 */
function rankScheme(scheme, user) {
  let score = 0;
  const p = scheme.preferences;
  const e = scheme.eligibility;

  if (p.higher_vintage_bonus && user.vintage_years > e.min_vintage_years)
    score += 1;

  if (p.higher_amount_bonus)
    score +=
      (user.loan_amount - e.loan_amount.min) /
      (e.loan_amount.max - e.loan_amount.min);

  if (p.collateral_bonus && user.collateral_type !== "None")
    score += 1;

  if (p.sector_match_bonus)
    score += 3;

  if (p.micro_loan_priority && user.loan_amount <= 100000)
    score += 2;

  if (p.manufacturing_bonus && user.business_type === "Manufacturing")
    score += 1;

  return score;
}

/**
 * MAIN ENTRY
 */
function recommendBestScheme(user) {
  const eligible = [];
  const auditLog = [];

  for (const scheme of schemes) {
    if (isEligible(scheme, user)) {
      const score = rankScheme(scheme, user);

      eligible.push({ scheme, score });

      auditLog.push({
        scheme_id: scheme.scheme_id,
        scheme_name: scheme.meta.scheme_name,
        eligible: true,
        score
      });
    } else {
      auditLog.push({
        scheme_id: scheme.scheme_id,
        scheme_name: scheme.meta.scheme_name,
        eligible: false
      });
    }
  }

  if (eligible.length === 0) {
    return {
      recommended_scheme: null,
      reason: "No eligible scheme found",
      auditLog
    };
  }

  eligible.sort((a, b) => b.score - a.score);

  return {
    recommended_scheme: eligible[0].scheme,
    auditLog
  };
}

module.exports = { recommendBestScheme };
