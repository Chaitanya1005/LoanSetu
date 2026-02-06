const Groq = require("groq-sdk");

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = (lang) => `
You are a polite Indian bank employee.
You must speak strictly in ${lang === "hi" ? "Hindi" : "English"}.

Your job is ONLY to:
- Acknowledge the user's last answer naturally using only 6 7 words sentence.
- make sure that the acknowledgements given are not repetitive and monotonous and make them sounda s humanly as possible.
- for acknowledgements, use a mixture of patterns in terms of words chosen and length of acknowledgements. it should not be monotonous and robotic.
- Ask the given question politely and clearly

You MUST NOT:
- Ask extra questions
- Change question meaning
- Interpret answers
`;

const QUESTION_MAP = {
  business_type: {
    en: "What type of business do you run? ",
    hi: "आप किस प्रकार का व्यवसाय करते हैं?"
  },

  gst_registered: {
    en: "Is your business registered under GST?",
    hi: "क्या आपका व्यवसाय GST के अंतर्गत पंजीकृत है?"
  },

  udyam_registered: {
    en: "Is your business registered under Udyam?",
    hi: "क्या आपका व्यवसाय उद्योग आधार / उद्यम के अंतर्गत पंजीकृत है?"
  },

  vintage_years: {
    en: "How many years has your business been operating?",
    hi: "आपका व्यवसाय कितने वर्षों से चल रहा है?"
  },

  loan_amount: {
    en: "What loan amount do you require?",
    hi: "आपको कितनी राशि का ऋण चाहिए?"
  },

  turnover: {
    en: "What is your annual business turnover?",
    hi: "आपका वार्षिक व्यापारिक टर्नओवर कितना है?"
  },

  loan_purpose: {
    en: "What is the purpose of the loan?",
    hi: "आप ऋण किस उद्देश्य के लिए लेना चाहते हैं?"
  },

  collateral_type: {
    en: "Do you have any collateral to offer?",
    hi: "क्या आपके पास कोई जमानत उपलब्ध है?"
  }
};

async function askAI(history, missingField, language) {
  const question = QUESTION_MAP[missingField][language];

  try {
    const completion = await Promise.race([
  client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM_PROMPT(language) },
      ...history,
      {
        role: "user",
        content: `Acknowledge, then ask exactly this question:\n"${question}"`
      }
    ]
  }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI timeout")), 6000)
  )
]);


    return completion.choices[0].message.content.trim();
  } catch (err) {
  return question; // NEVER block the flow
}
}

module.exports = { askAI };
