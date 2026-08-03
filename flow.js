const { answerQnA } = require("./ai");

function createEmptySession() {
  return {
    history: []
  };
}

async function handleUserMessage(text, session) {
  const normText = text.toLowerCase().trim();

  // Reset command
  if (normText === "menu" || normText === "exit" || normText === "reset" || normText === "main menu") {
    session.history = [];
    return {
      reply: "🔄 Session has been reset. How can I help you with the Cent Hotel scheme guidelines or customer eligibility check?"
    };
  }

  // Push user message to context history
  session.history.push({ role: "user", content: text });

  // Get answer directly from LLM
  const reply = await answerQnA(session.history, text);

  // Push assistant response to history
  session.history.push({ role: "assistant", content: reply });

  // Limit session history size to prevent context blowing up
  if (session.history.length > 16) {
    session.history = session.history.slice(-16);
  }

  return { reply };
}

module.exports = { handleUserMessage, createEmptySession };