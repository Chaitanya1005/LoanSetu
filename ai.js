const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

// Clean and trim the API key (removes any whitespaces)
const apiKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : "";

const client = new Groq({
  apiKey: apiKey,
});

// Load the scheme document context
let schemeDocument = "";
try {
  schemeDocument = fs.readFileSync(path.join(__dirname, "scheme_document.txt"), "utf8");
} catch (e) {
  console.error("Failed to load scheme_document.txt", e);
}

const SYSTEM_PROMPT = `
You are the "Cent Loansetu" - an authoritative internal AI assistant built for employees and officials of Central Bank of India.
Your job is to answer employee queries regarding the CENT HOTEL loan scheme circular (No. 4114, 16.09.2024).

Here is the authoritative Cent Hotel scheme circular document:
=========================================
${schemeDocument}
=========================================

Instructions:
1. Speak strictly in English. Keep your tone highly professional, technical, and helpful (like a senior credit officer advising a branch manager).
2. Base your answers strictly on the provided scheme document. If the answer is not contained in the document, clearly state: "This detail is not covered by the Cent Hotel Master Circular guidelines."
3. You handle BOTH policy lookups (e.g. margins, documentation, LSR) and customer eligibility diagnostics.
4. **For Eligibility Queries**: If an employee describes a customer profile (e.g. CIBIL score, business type, collateral offered, loan amount), evaluate it strictly against the circular rules:
   * Target Group: Hospitality industry (hotels, restaurants, cafes, resorts).
   * Udyam registration is mandatory.
   * Loan size: Rs. 10 Lakh to Rs. 100 Crore.
   * CIBIL score: Minimum 700 (exceptions down to 650 with ZH/Central Office approvals).
   * Collateral security: Minimum 50% covering of loan amount (HUF/Trust require 100%; loans <= 2 Crore can be covered under CGTMSE instead).
   * Calculate and present the estimated interest rate (RBLR + Spread - Concession + Tenor Premium) clearly using the circular matrices on pages 2 and 3.
5. Keep your responses structured, clean, and concise. Use bold headers and lists for scannability. Do not output conversational filler.
`;

async function answerQnA(history, question) {
  try {
    const completion = await Promise.race([
      client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.1, // Factual and precise
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
    return "Sorry, the AI response timed out. Please try again.";
  }
}

module.exports = { answerQnA };
