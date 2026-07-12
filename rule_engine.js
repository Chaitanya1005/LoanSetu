/**
 * DETERMINISTIC ELIGIBILITY CHECK FOR CENT HOTEL SCHEME
 */
function evaluateEligibility(user) {
  const auditLog = [];
  const errors = [];
  let isEligible = true;

  // 1. Hospitality Industry Check
  if (user.is_hospitality !== true) {
    isEligible = false;
    errors.push("Customer business is not in the Hospitality industry. The Cent Hotel scheme is strictly for services associated with Hospitality (Hotels, Restaurants, Cafes, Resorts, etc.).");
    auditLog.push({ check: "Hospitality Industry", pass: false });
  } else {
    auditLog.push({ check: "Hospitality Industry", pass: true });
  }

  // 2. Udyam Registration Check
  if (user.udyam_registered !== true) {
    isEligible = false;
    errors.push("Mandatory UDYAM Registration Certificate is missing. Under circular guidelines, Udyam registration is mandatory for all borrower units.");
    auditLog.push({ check: "Udyam Registration", pass: false });
  } else {
    auditLog.push({ check: "Udyam Registration", pass: true });
  }

  // 3. Loan Amount Limits
  const amt = user.loan_amount;
  if (amt < 1000000 || amt > 1000000000) { // 10 Lakh to 100 Crore
    isEligible = false;
    errors.push(`Requested loan amount (Rs. ${(amt / 100000).toFixed(2)} Lakhs) is outside the permitted limits of Rs. 10 Lakh to Rs. 100 Crore.`);
    auditLog.push({ check: "Loan Amount Limits", pass: false });
  } else {
    auditLog.push({ check: "Loan Amount Limits", pass: true });
  }

  // 4. CIBIL/CIC Score Check
  const score = user.cibil_score;
  let cibilStatus = "Normal";
  if (score < 650) {
    isEligible = false;
    errors.push(`CIBIL score is too low (${score}). Under guidelines, the minimum acceptable CIBIL score is 650 with approvals, and 700 normally.`);
    auditLog.push({ check: "CIBIL Score Check", pass: false });
  } else if (score >= 650 && score < 675) {
    cibilStatus = "Requires Vertical Head (GM) at Central Office approval (CIC Score 650-674)";
    auditLog.push({ check: "CIBIL Score Check", pass: true, note: cibilStatus });
  } else if (score >= 675 && score < 700) {
    cibilStatus = "Requires Zonal Head (ZH) (GM/DGM) approval (CIC Score 675-699)";
    auditLog.push({ check: "CIBIL Score Check", pass: true, note: cibilStatus });
  } else {
    auditLog.push({ check: "CIBIL Score Check", pass: true });
  }

  // 5. HUF / Trust Collateral Requirements
  const colVal = user.collateral_value_pct;
  let collateralStatus = "Eligible";
  if (user.is_huf_or_trust === true) {
    if (colVal < 100) {
      isEligible = false;
      errors.push(`Borrower is a HUF/Trust. HUF and Trusts must offer 100% collateral security. Provided: ${colVal}%.`);
      auditLog.push({ check: "HUF/Trust Collateral", pass: false });
    } else {
      auditLog.push({ check: "HUF/Trust Collateral", pass: true });
    }
  } else {
    // Regular units
    if (colVal < 50) {
      if (amt <= 20000000) { // Up to 2 Crore
        collateralStatus = "Eligible under CGTMSE cover (Collateral < 50% permitted for loans up to Rs. 2 Crore)";
        auditLog.push({ check: "Collateral Coverage", pass: true, note: collateralStatus });
      } else {
        isEligible = false;
        errors.push(`Collateral coverage is ${colVal}%. A minimum of 50% collateral security is required for loans exceeding Rs. 2 Crore.`);
        auditLog.push({ check: "Collateral Coverage", pass: false });
      }
    } else {
      auditLog.push({ check: "Collateral Coverage", pass: true });
    }
  }

  return {
    isEligible,
    errors,
    auditLog,
    cibilStatus,
    collateralStatus
  };
}

/**
 * CALCULATE ESTIMATED INTEREST RATES
 */
function calculateInterestRate(loanAmount, collateralPct, isCGTMSE) {
  // RBLR is a benchmark rate. Let's represent formulas in terms of "RBLR".
  
  // 1. For exact Rs. 10 Lakh loan
  if (loanAmount === 1000000) {
    return {
      formula: "RBLR + 0.95%",
      notes: "Fixed circular rate for exactly Rs. 10 Lakh exposure."
    };
  }

  // Helper to calculate rate for rating and tenor
  const getRate = (ratingGroup, tenorYears) => {
    let baseSpread = 0;
    
    // Base spread based on rating group & collateral
    if (ratingGroup === "CBI-1_3") {
      if (collateralPct >= 75) baseSpread = 0.00;
      else if (collateralPct >= 50) baseSpread = 0.10;
      else baseSpread = 0.20; // less than 50% / CGTMSE
    } else { // CBI-4_6
      if (collateralPct >= 75) baseSpread = 0.10;
      else if (collateralPct >= 50) baseSpread = 0.20;
      else baseSpread = 0.30; // less than 50% / CGTMSE
    }

    // Apply collateral concession
    let concession = 0;
    if (!isCGTMSE && collateralPct >= 50) {
      if (collateralPct >= 50 && collateralPct <= 60) concession = 0.50;
      else if (collateralPct > 60 && collateralPct <= 75) concession = 0.60;
      else if (collateralPct > 75) concession = 0.75;
    }

    // Final base spread after concession (cannot go below RBLR, i.e. spread cannot go below 0%)
    let finalSpread = baseSpread - concession;
    if (finalSpread < 0) finalSpread = 0;

    // Add Tenor Premium
    let tenorPremium = 0;
    if (tenorYears > 3 && tenorYears <= 5) tenorPremium = 0.20;
    else if (tenorYears > 5 && tenorYears <= 7) tenorPremium = 0.30;
    else if (tenorYears > 7) tenorPremium = 0.50;

    const totalSpread = finalSpread + tenorPremium;
    return `RBLR + ${totalSpread.toFixed(2)}%`;
  };

  const results = [];
  const ratings = [
    { id: "CBI-1_3", label: "CBI-1 to CBI-3 (Higher Rating)" },
    { id: "CBI-4_6", label: "CBI-4 to CBI-6 (Standard Rating)" }
  ];
  const tenors = [
    { years: 3, label: "Up to 3 years" },
    { years: 5, label: "3 to 5 years" },
    { years: 7, label: "5 to 7 years" },
    { years: 10, label: "Above 7 years" }
  ];

  for (const r of ratings) {
    for (const t of tenors) {
      results.push({
        rating: r.label,
        tenor: t.label,
        rate: getRate(r.id, t.years)
      });
    }
  }

  return {
    isCGTMSE,
    results
  };
}

module.exports = {
  evaluateEligibility,
  calculateInterestRate
};
