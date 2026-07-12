const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Load the scheme document context
let schemeDocument = "";
try {
  schemeDocument = fs.readFileSync(path.join(__dirname, "scheme_document.txt"), "utf8");
} catch (e) {
  console.error("Failed to load scheme_document.txt", e);
}

const SYSTEM_PROMPT = (lang) => `
You are the "Cent Hotel Scheme Expert" - an internal AI workflow assistant built for employees and officials of Central Bank of India.
Your job is to answer employee queries regarding the CENT HOTEL loan scheme circular.

Here is the authoritative Cent Hotel scheme document:
=========================================
${schemeDocument}
=========================================

Instructions:
1. Speak strictly in ${lang === "hi" ? "Hindi (using clear Devanagari or simple Hinglish terms if standard in banking)" : "English"}.
2. Since you are talking to a BANK EMPLOYEE, maintain a highly professional, technical, and helpful internal tone.
3. Base your answers strictly on the provided scheme document. If something is not in the document, state that it is not covered by the Cent Hotel Master Circular guidelines.
4. When acknowledging a diagnostic step, make sure to sound human, professional, and helpful. Frame your acknowledgement within 10-12 words, and then ask the exact question.
5. Do not hallucinate values. If asked about rates or rules, refer exactly to the clauses in the document.
`;

const QUESTION_MAP = {
  is_hospitality: {
    en: "Is the customer's business in the Hospitality industry (hotels, restaurants, cafes, etc.)?",
    hi: "क्या ग्राहक का व्यवसाय हॉस्पिटैलिटी उद्योग (होटल, रेस्तरां, कैफे, आदि) में है?"
  },
  udyam_registered: {
    en: "Does the customer have a mandatory Udyam Registration Certificate?",
    hi: "क्या ग्राहक के पास अनिवार्य उद्यम पंजीकरण प्रमाणपत्र (Udyam Registration Certificate) है?"
  },
  loan_amount: {
    en: "What is the required loan amount?",
    hi: "आवश्यक ऋण राशि कितनी है?"
  },
  cibil_score: {
    en: "What is the applicant's CIBIL / CIC score?",
    hi: "आवेदक का CIBIL / CIC स्कोर क्या है?"
  },
  is_huf_or_trust: {
    en: "Is the borrower a HUF (Hindu Undivided Family) or a Trust?",
    hi: "क्या उधारकर्ता HUF (हिंदू अविभाजित परिवार) या ट्रस्ट है?"
  },
  collateral_value_pct: {
    en: "What is the market value of the collateral security as a percentage of the loan amount?",
    hi: "ऋण राशि के प्रतिशत के रूप में संपार्श्विक सुरक्षा (collateral security) का बाजार मूल्य क्या है?"
  }
};

async function askAI(history, missingField, language) {
  const question = QUESTION_MAP[missingField][language];

  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.2, // Low temperature for high accuracy Q&A
        messages: [
          { role: "system", content: SYSTEM_PROMPT(language) },
          ...history,
          {
            role: "user",
            content: `Acknowledge the user's last input, then ask exactly this question:\n"${question}"`
          }
        ]
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), 30000)
      )
    ]);

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI call error: ", err);
    return question; // Fallback to raw question on failure
  }
}

async function answerQnA(history, question, language) {
  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Even lower temperature for factual accuracy
        messages: [
          { role: "system", content: SYSTEM_PROMPT(language) },
          ...history,
          {
            role: "user",
            content: question
          }
        ]
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), 30000)
      )
    ]);

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI QnA error: ", err);
    return language === "hi" 
      ? "क्षमा करें, AI प्रतिक्रिया प्राप्त करने में समय समाप्त हो गया। कृपया पुन: प्रयास करें।"
      : "Sorry, the AI response timed out. Please try again.";
  }
}

module.exports = { askAI, answerQnA };
