const { askAI, answerQnA } = require("./ai");
const parser = require("./parser");
const { evaluateEligibility, calculateInterestRate } = require("./rule_engine");

const QUESTION_MAP = {
  is_hospitality: {
    en: "Is the customer's business associated with the Hospitality industry (hotels, restaurants, cafes, etc.)? (yes / no)",
    hi: "क्या ग्राहक का व्यवसाय हॉस्पिटैलिटी उद्योग (होटल, रेस्तरां, कैफे, आदि) से जुड़ा है? (हाँ / नहीं)"
  },
  udyam_registered: {
    en: "Does the customer have a mandatory Udyam Registration Certificate? (yes / no)",
    hi: "क्या ग्राहक के पास अनिवार्य उद्यम पंजीकरण प्रमाणपत्र (Udyam Registration) है? (हाँ / नहीं)"
  },
  loan_amount: {
    en: "What is the required loan amount? (e.g., 50 lakhs, 2 crores, or in numbers)",
    hi: "आवश्यक ऋण राशि कितनी है? (जैसे: 50 लाख, 2 करोड़, या संख्या में)"
  },
  cibil_score: {
    en: "What is the applicant's CIBIL / CIC score? (Please enter a score between 300 and 900)",
    hi: "आवेदक का CIBIL / CIC स्कोर क्या है? (कृपया 300 और 900 के बीच का स्कोर दर्ज करें)"
  },
  is_huf_or_trust: {
    en: "Is the borrower a HUF (Hindu Undivided Family) or a Trust? (yes / no)",
    hi: "क्या उधारकर्ता HUF (हिंदू अविभाजित परिवार) या ट्रस्ट है? (हाँ / नहीं)"
  },
  collateral_value_pct: {
    en: "What is the market value of the collateral security as a percentage of the loan amount? (e.g., 60%, 100%, or 'none' if under CGTMSE)",
    hi: "ऋण राशि के प्रतिशत के रूप में संपार्श्विक सुरक्षा (collateral security) का बाजार मूल्य कितना है? (जैसे: 60%, 100%, या CGTMSE के लिए 'none')"
  }
};

const QUESTION_ORDER = [
  "is_hospitality",
  "udyam_registered",
  "loan_amount",
  "cibil_score",
  "is_huf_or_trust",
  "collateral_value_pct"
];

function createEmptySession() {
  return {
    language: null,
    stage: "choose_language", // stages: choose_language, choose_mode, diagnostic, qna
    history: [],
    data: Object.fromEntries(QUESTION_ORDER.map(f => [f, null])),
    lastAsked: null
  };
}

function parseForField(field, text) {
  switch (field) {
    case "is_hospitality":
      return parser.detectYesNo(text);
    case "udyam_registered":
      return parser.detectYesNo(text);
    case "loan_amount":
      return parser.detectLoanAmount(text);
    case "cibil_score":
      return parser.detectCibilScore(text);
    case "is_huf_or_trust":
      return parser.detectYesNo(text);
    case "collateral_value_pct":
      return parser.detectCollateralPct(text);
    default:
      return null;
  }
}

function getNextMissingField(data) {
  return QUESTION_ORDER.find(f => data[f] === null) || null;
}

async function handleUserMessage(text, session) {
  const normText = text.toLowerCase().trim();

  // -------- EXIT / RESET COMMAND --------
  if (normText === "menu" || normText === "exit" || normText === "reset" || normText === "main menu") {
    session.stage = "choose_mode";
    session.history = [];
    session.lastAsked = null;
    session.data = Object.fromEntries(QUESTION_ORDER.map(f => [f, null]));

    const MENU_TEXT = {
      en: `📂 **Main Menu - Cent Hotel Staff Portal**\n\nHow can I help you today?\n\n1️⃣ Type **1** to run an **Eligibility Diagnostic** on a customer profile.\n2️⃣ Type **2** or **ask any query** regarding the policy rules, documentation, margins, or deviations.`,
      hi: `📂 **मुख्य मेनू - सेंट होटल स्टाफ पोर्टल**\n\nमैं आज आपकी किस प्रकार सहायता कर सकता हूँ?\n\n1️⃣ ग्राहक प्रोफाइल पर **पात्रता निदान (Eligibility Diagnostic)** चलाने के लिए **1** टाइप करें।\n2️⃣ पॉलिसी नियमों, दस्तावेज़ों, मार्जिन या विचलनों के बारे में **प्रश्न पूछें** या **2** टाइप करें।`
    };
    return { reply: MENU_TEXT[session.language || "en"] };
  }

  // -------- STAGE: CHOOSE LANGUAGE --------
  if (session.stage === "choose_language") {
    if (text.includes("1")) session.language = "en";
    else if (text.includes("2")) session.language = "hi";
    else return { reply: "Choose language / भाषा चुनें:\n1) English\n2) हिंदी" };

    session.stage = "choose_mode";

    const GREETING = {
      en: `👋 Hello! I am the **Cent Hotel Internal AI Assistant**, designed for Central Bank of India staff.\n\nI am trained on the **Cent Hotel Master Circular (No. 4114, 16.09.2024)**.\n\nHow would you like to proceed?\n1️⃣ Type **1** to run a customer **Eligibility Diagnostic**.\n2️⃣ Type **2** (or just ask a question) to query policy rules, interest rates, documentation, or charges.`,
      hi: `👋 नमस्ते! मैं **सेंट होटल आंतरिक एआई सहायक** हूँ, जिसे सेंट्रल बैंक ऑफ इंडिया के कर्मचारियों के लिए डिज़ाइन किया गया है।\n\nमैं **सेंट होटल मास्टर सर्कुलर (नंबर 4114, 16.09.2024)** पर प्रशिक्षित हूँ।\n\nआप कैसे आगे बढ़ना चाहेंगे?\n1️⃣ ग्राहक की **पात्रता निदान (Eligibility Diagnostic)** करने के लिए **1** टाइप करें।\n2️⃣ पॉलिसी नियमों, ब्याज दरों, दस्तावेज़ों या शुल्कों के बारे में पूछने के लिए **2** टाइप करें (या सीधे अपना प्रश्न पूछें)।`
    };

    return { reply: GREETING[session.language] };
  }

  // -------- STAGE: CHOOSE MODE --------
  if (session.stage === "choose_mode") {
    if (normText === "1" || normText.includes("diagnostic") || normText.includes("check")) {
      session.stage = "diagnostic";
      session.data = Object.fromEntries(QUESTION_ORDER.map(f => [f, null]));
      session.history = [];
      
      const START_DIAGNOSTIC = {
        en: `🚀 **Starting Customer Eligibility Diagnostic for CENT HOTEL Scheme**\n\nI will ask a few parameters to calculate eligibility and the estimated interest rate matrix.\n\n*Question 1:*\nIs the customer's business associated with the Hospitality industry (hotels, restaurants, cafes, resorts, etc.)? (yes / no)`,
        hi: `🚀 **सेंट होटल योजना के लिए ग्राहक पात्रता निदान शुरू किया जा रहा है**\n\nपात्रता और अनुमानित ब्याज दर मैट्रिक्स की गणना करने के लिए मैं कुछ मापदंड पूछूँगा।\n\n*प्रश्न 1:*\nक्या ग्राहक का व्यवसाय हॉस्पिटैलिटी उद्योग (होटल, रेस्तरां, कैफे, रिसॉर्ट, आदि) से संबंधित है? (हाँ / नहीं)`
      };
      session.lastAsked = "is_hospitality";
      return { reply: START_DIAGNOSTIC[session.language] };
    } else {
      // Default to Q&A mode if they didn't choose Option 1 explicitly
      session.stage = "qna";
      // Fall through to Q&A handling below
    }
  }

  // -------- STAGE: DIAGNOSTIC (QUESTIONNAIRE) --------
  if (session.stage === "diagnostic") {
    const d = session.data;
    const currentField = getNextMissingField(d);

    if (currentField) {
      const value = parseForField(currentField, text);

      // ❌ Invalid Input -> Repeat question with guidance helper
      if (value === null) {
        let helpTip = "";
        if (currentField === "loan_amount") {
          helpTip = session.language === "hi" 
            ? "\n*(कृपया राशि को शब्दों या संख्या में स्पष्ट लिखें, जैसे: 50 लाख, 2 करोड़, या 2500000)*"
            : "\n*(Please specify the amount clearly, e.g., '50 lakhs', '2 crores', or '2500000')*";
        } else if (currentField === "cibil_score") {
          helpTip = session.language === "hi" 
            ? "\n*(कृपया 300 और 900 के बीच का 3-अंकीय स्कोर लिखें, जैसे: 720)*"
            : "\n*(Please enter a valid 3-digit score between 300 and 900, e.g., '720')*";
        } else if (currentField === "collateral_value_pct") {
          helpTip = session.language === "hi" 
            ? "\n*(कृपया प्रतिशत दर्ज करें जैसे: 60%, 100% या CGTMSE के लिए 'none' या '0')*"
            : "\n*(Please enter a percentage like '60%', '100%' or type 'none' / '0' if under CGTMSE cover)*";
        }
        return {
          reply: QUESTION_MAP[currentField][session.language] + helpTip
        };
      }

      // ✅ Valid Input -> Store in session
      session.history.push({ role: "user", content: text });
      d[currentField] = value;
    }

    // Check if there is another missing field
    const nextField = getNextMissingField(d);

    if (!nextField) {
      // Diagnostic complete! Evaluate rules
      const result = evaluateEligibility(d);
      const isCGTMSE = d.collateral_value_pct < 50 && d.loan_amount <= 20000000 && d.is_huf_or_trust !== true;
      const rateResult = calculateInterestRate(d.loan_amount, d.collateral_value_pct, isCGTMSE);

      let reply = "";
      if (session.language === "hi") {
        if (result.isEligible) {
          reply = `✅ **ग्राहक सेंट होटल योजना के लिए पात्र (ELIGIBLE) है**\n\n`;
          reply += `• **ऋण राशि**: ₹${(d.loan_amount / 100000).toFixed(2)} लाख\n`;
          reply += `• **CIBIL स्कोर**: ${d.cibil_score} (${result.cibilStatus})\n`;
          reply += `• **संपार्श्विक (Collateral)**: ${d.collateral_value_pct}% (${result.collateralStatus})\n\n`;
          reply += `📊 **अनुमानित ब्याज दर मैट्रिक्स (RBLR + Spread)**:\n`;
          
          if (d.loan_amount === 1000000) {
            reply += `  - **ब्याज दर**: RBLR + 0.95% वार्षिक (ठीक 10 लाख के ऋण के लिए निर्धारित दर)\n`;
          } else {
            rateResult.results.forEach(r => {
              reply += `  - *${r.rating}* | *अवधि: ${r.tenor}* ➡️ **${r.rate}**\n`;
            });
          }
          reply += `\n*नोट: अंतिम ब्याज दर मंजूरी प्राधिकारी के अधीन है और यह RBLR से कम नहीं हो सकती। संपार्श्विक मूल्य के आधार पर 0.75% तक की रियायत शामिल की गई है।*`;
        } else {
          reply = `❌ **ग्राहक सेंट होटल योजना के लिए पात्र नहीं है**\n\n**अस्वीकृति के कारण:**\n`;
          result.errors.forEach(e => {
            reply += `• ${e}\n`;
          });
        }
        reply += `\n\nमुख्य मेनू पर लौटने या पात्रता पुनः जांचने के लिए **menu** टाइप करें।`;
      } else {
        if (result.isEligible) {
          reply = `✅ **CUSTOMER IS ELIGIBLE FOR CENT HOTEL SCHEME**\n\n`;
          reply += `• **Loan Amount**: Rs. ${(d.loan_amount / 100000).toFixed(2)} Lakhs\n`;
          reply += `• **CIBIL Score**: ${d.cibil_score} (${result.cibilStatus})\n`;
          reply += `• **Collateral**: ${d.collateral_value_pct}% (${result.collateralStatus})\n\n`;
          reply += `📊 **Estimated Interest Rate Matrix (RBLR + Spread)**:\n`;
          
          if (d.loan_amount === 1000000) {
            reply += `  - **Interest Rate**: RBLR + 0.95% p.a. (Fixed rate for exactly Rs. 10 Lakh)\n`;
          } else {
            rateResult.results.forEach(r => {
              reply += `  - *${r.rating}* | *Tenor: ${r.tenor}* ➡️ **${r.rate}**\n`;
            });
          }
          reply += `\n*Note: Final rate is subject to sanctioning authority and cannot go below RBLR. Concessions of up to 0.75% are applied based on collateral value.*`;
        } else {
          reply = `❌ **CUSTOMER IS NOT ELIGIBLE**\n\n**Reasons for rejection:**\n`;
          result.errors.forEach(e => {
            reply += `• ${e}\n`;
          });
        }
        reply += `\n\nType **menu** to return to the main options or restart the diagnostic.`;
      }

      // Reset to choose_mode so they can continue querying or restart
      session.stage = "choose_mode";
      return { reply };
    }

    // Ask next question via LLM to make it sound human
    session.lastAsked = nextField;
    const aiReply = await askAI(session.history, nextField, session.language);
    return { reply: aiReply };
  }

  // -------- STAGE: Q&A (POLICY QUERIES) --------
  if (session.stage === "qna") {
    session.history.push({ role: "user", content: text });
    const reply = await answerQnA(session.history, text, session.language);
    session.history.push({ role: "assistant", content: reply });
    
    // Add small hint to switch back
    const hint = session.language === "hi"
      ? "\n\n*(मुख्य मेनू पर जाने या पात्रता चेक करने के लिए **menu** लिखें)*"
      : "\n\n*(Type **menu** to return to the options or start an eligibility check)*";

    return { reply: reply + hint };
  }

  return { reply: "Invalid stage. Please type **menu** to restart." };
}

module.exports = { handleUserMessage, createEmptySession };
