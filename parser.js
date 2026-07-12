function normalize(text) {
  return text.toLowerCase().trim();
}

function detectYesNo(text) {
  const t = normalize(text);

  if (/\b(yes|haan|hanji|ha|bilkul|sure|y|ya|h)\b/.test(t)) return true;
  if (/\b(no|nahi|nahin|na|nope|n)\b/.test(t)) return false;

  return null;
}

function detectLoanAmount(text) {
  const t = normalize(text);

  let m = t.match(/([\d\.]+)\s*(lakh|lac|lakhs|lacs|l)/);
  if (m) return Number(m[1]) * 100000;

  m = t.match(/([\d\.]+)\s*(crore|cr|crores)/);
  if (m) return Number(m[1]) * 10000000;

  m = t.match(/([\d,]+)/);
  if (m) return Number(m[1].replace(/,/g, ""));

  return null;
}

function detectCibilScore(text) {
  const t = normalize(text);
  // Match any 3 digit number between 300 and 900
  const m = t.match(/\b([3-9]\d{2})\b/);
  if (m) {
    const score = Number(m[1]);
    if (score >= 300 && score <= 900) return score;
  }
  return null;
}

function detectCollateralPct(text) {
  const t = normalize(text);

  if (/\b(none|no collateral|cgtmse|zero|0)\b/.test(t)) {
    return 0;
  }

  // Match any number followed by % or word "percent" or just the number
  const m = t.match(/(\d+)\s*%?/) || t.match(/(\d+)\s*(percent|percentage)/);
  if (m) {
    const val = Number(m[1]);
    if (val >= 0 && val <= 1000) return val; // allow up to 1000% just in case, though normally <= 100%
  }

  return null;
}

module.exports = {
  detectYesNo,
  detectLoanAmount,
  detectCibilScore,
  detectCollateralPct
};
