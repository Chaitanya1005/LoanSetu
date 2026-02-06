function normalize(text) {
  return text.toLowerCase().trim();
}

function detectYesNo(text) {
  const t = normalize(text);

  if (/\b(yes|haan|hanji|ha|bilkul|sure)\b/.test(t)) return true;
  if (/\b(no|nahi|nahin|na|nope)\b/.test(t)) return false;

  return null;
}

function detectBusinessType(text) {
  const t = normalize(text);

  if (/manfacturing|manufactring/.test(t)) return "Manufacturing";
  if (/textile|garment|kapda|boutique/.test(t)) return "Manufacturing";
  if (/factory|manufacturing|unit|karkhana/.test(t)) return "Manufacturing";
  if (/trading|wholesale|trader/.test(t)) return "Trading";
  if (/retail|shop|dukan|store/.test(t)) return "Trading";
  if (/ca|chartered accountant|audit/.test(t)) return "Professional";
  if (/food|bakery|atta|rice mill|oil mill/.test(t)) return "FoodProcessing";
  if (/vendor|rehdi|thela|hawker/.test(t)) return "StreetVendor";
  if (/service|agency|consult/.test(t)) return "Services";

  return null;
}

function detectLoanAmount(text) {
  const t = normalize(text);

  let m = t.match(/([\d\.]+)\s*(lakh|lac)/);
  if (m) return Number(m[1]) * 100000;

  m = t.match(/([\d\.]+)\s*(crore|cr)/);
  if (m) return Number(m[1]) * 10000000;

  m = t.match(/([\d,]+)/);
  if (m) return Number(m[1].replace(/,/g, ""));

  return null;
}

function detectTurnover(text) {
  const t = normalize(text);

  let m = t.match(/([\d\.]+)\s*(crore|cr)/);
  if (m) return Number(m[1]) * 10000000;

  m = t.match(/([\d\.]+)\s*(lakh|lac|lakhs)/);
  if (m) return Number(m[1]) * 100000;

  m = t.match(/([\d,]+)/);
  if (m) return Number(m[1].replace(/,/g, ""));

  return null;
}

function detectLoanPurpose(text) {
  const t = normalize(text);

  if (/working\s*capital|wc/.test(t)) return "WorkingCapital";
  if (/term\s*loan|tl/.test(t)) return "TermLoan";
  if (/equipment|machine|machinery/.test(t)) return "Equipment";

  return null;
}

function detectVintage(text) {
  const t = normalize(text);

  let m = t.match(/(\d+)\s*(year|years|yr|yrs)/);
  if (m) return Number(m[1]);

  m = t.match(/since\s*(\d{4})/);
  if (m) return new Date().getFullYear() - Number(m[1]);

  return null;
}

module.exports = {
  detectBusinessType,
  detectLoanAmount,
  detectTurnover,
  detectLoanPurpose,
  detectVintage,
  detectYesNo
};
