const { askAI } = require("./ai");
const parser = require("./parser");
const { recommendBestScheme } = require("./rule_engine");

const QUESTION_MAP = {
  business_type: {
    en: "What type of business do you run? (manufacturing / trading / services)",
    hi: "आप किस प्रकार का व्यवसाय करते हैं? (मैन्युफैक्चरिंग / ट्रेडिंग / सर्विस)"
  },

  gst_registered: {
    en: "Is your business registered under GST? (yes / no)",
    hi: "क्या आपका व्यवसाय GST के अंतर्गत पंजीकृत है? (हाँ / नहीं)"
  },

  udyam_registered: {
    en: "Is your business registered under Udyam? (yes / no)",
    hi: "क्या आपका व्यवसाय उद्योग आधार / उद्यम के अंतर्गत पंजीकृत है? (हाँ / नहीं)"
  },

  vintage_years: {
    en: "How many years has your business been operating?",
    hi: "आपका व्यवसाय कितने वर्षों से चल रहा है?"
  },

  loan_amount: {
    en: "What loan amount do you require? (in lakhs or crores)",
    hi: "आपको कितनी राशि का ऋण चाहिए? (लाख या करोड़ में)"
  },

  turnover: {
    en: "What is your annual business turnover? (in lakhs or crores)",
    hi: "आपका वार्षिक व्यापारिक टर्नओवर कितना है? (लाख या करोड़ में)"
  },

  loan_purpose: {
    en: "What is the purpose of the loan? (working capital / term loan / equipment)",
    hi: "आप ऋण किस उद्देश्य के लिए लेना चाहते हैं? (वर्किंग कैपिटल / टर्म लोन / मशीनरी)"
  },

  collateral_type: {
    en: "Do you have any collateral to offer? (yes / no)",
    hi: "क्या आपके पास कोई जमानत उपलब्ध है? (हाँ / नहीं)"
  }
};

const QUESTION_ORDER = [
  "business_type",
  "gst_registered",
  "udyam_registered",
  "vintage_years",
  "loan_amount",
  "turnover",
  "loan_purpose",
  "collateral_type"
];

function createEmptySession() {
  return {
    language: null,
    stage: "choose_language",
    history: [],
    data: Object.fromEntries(QUESTION_ORDER.map(f => [f, null])),
    lastAsked: null
  };
}

function parseForField(field, text) {
  switch (field) {
    case "business_type":
      return parser.detectBusinessType(text);

    case "gst_registered":
    case "udyam_registered":
      return parser.detectYesNo(text);

    case "vintage_years":
      return parser.detectVintage(text);

    case "loan_amount": {
      const amt = parser.detectLoanAmount(text);
      return amt && amt >= 10000 ? amt : null;
    }

    case "turnover":
      return parser.detectTurnover(text);

    case "loan_purpose":
      return parser.detectLoanPurpose(text);

    case "collateral_type": {
      const yn = parser.detectYesNo(text);
      if (yn === true) return "Property";
      if (yn === false) return "None";
      return null;
    }

    default:
      return null;
  }
}

function getNextMissingField(data) {
  return QUESTION_ORDER.find(f => data[f] === null) || null;
}

async function handleUserMessage(text, session) {
  // -------- LANGUAGE SELECTION --------
  if (session.stage === "choose_language") {
    if (text.includes("1")) session.language = "en";
    else if (text.includes("2")) session.language = "hi";
    else return { reply: "Choose language: 1) English  2) हिंदी" };

    session.stage = "collecting";

    const GREETING = {
      en: `Hello! I am LoanSetu, your personal loan assistant.

I will ask a few simple questions to identify the eligible loan scheme.
I NEVER ask for Aadhaar, PAN, bank details or OTP.

What type of business do you run?`,

      hi: `नमस्ते! मैं LoanSetu हूँ, आपका व्यक्तिगत लोन सहायक।

मैं आपसे कुछ सरल प्रश्न पूछूँगा ताकि आपके लिए सही लोन योजना बताई जा सके।
मैं कभी भी आधार, पैन, बैंक विवरण या OTP नहीं पूछता।

आप किस प्रकार का व्यवसाय करते हैं?`
    };

    return { reply: GREETING[session.language] };
  }

  // -------- CORE LOGIC --------
  const d = session.data;
  const currentField = getNextMissingField(d);

  if (currentField) {
    const value = parseForField(currentField, text);

    // ❌ Garbage input → DO NOT store → DO NOT call AI
    if (value === null) {
      return {
        reply: QUESTION_MAP[currentField][session.language]
      };
    }

    // ✅ ONLY valid input is stored
    session.history.push({ role: "user", content: text });
    d[currentField] = value;
  }

  // -------- CHECK COMPLETION --------
  const nextField = getNextMissingField(d);

  if (!nextField) {
    const result = recommendBestScheme(d);
    return {
      reply: result.recommended_scheme
        ? `✅ Eligible scheme:\n➡️ ${result.recommended_scheme.meta.scheme_name}`
        : `❌ No eligible scheme found based on the details provided.`
    };
  }

  // -------- ASK NEXT QUESTION --------
  session.lastAsked = nextField;

  return {
    reply: await askAI(session.history, nextField, session.language)
  };
}

module.exports = { handleUserMessage, createEmptySession };
