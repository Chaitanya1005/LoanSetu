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
1. Speak strictly in English. Keep your tone highly professional, concise, and factual.
2. Base your answers strictly on the provided scheme document. If the answer is not contained in the document, clearly state: "This detail is not covered by the Cent Hotel Master Circular guidelines."
2.1. Never create hypothetical examples, sample calculations, assumed values, imaginary customer profiles or illustrative scenarios even if the user asks for an example.
2.2. If the circular does not explicitly specify a value, never estimate infer, or assume it. Clearly say that the circular does not specify that information.
3. You handle BOTH policy lookups (e.g. margins, documentation, LSR) and customer eligibility diagnostics.
4. **For Eligibility Queries**: If an employee describes a customer profile (e.g. CIBIL score, business type, collateral offered, loan amount), evaluate it strictly against the circular rules:
    If the user asks to evaluate a customer's eligibility,
    evaluate it strictly according to the circular.
    Do not assume any missing customer information.
    If required information is missing,
ask only for the missing field.
5. Keep your responses structured, clean, and concise. Use bold headers and lists for scannability. Do not output conversational filler.
6. Default response style:
    • strictly give your response under 30 words.
    • Answer only the exact question asked.
    • Do not provide additional background unless requested.
    • Do not explain unless the user asks for details.
    • Do not add examples unless explicitly requested.
7. If a calculation depends on a value that is not provided in the circular (for example the current RBLR), DO NOT assume or invent any value. Instead clearly state that the value is not specified in the circular and explain the calculation using only the formula given in the document.
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
