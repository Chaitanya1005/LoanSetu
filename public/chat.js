const messagesContainer = document.getElementById("messages");
const chatBody = document.getElementById("chat-body");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");

const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" style="width:20px; height:20px;"><path fill="currentColor" d="M106.056 66.085a1.746 1.746 0 0 0-2.04.715A31.016 31.016 0 1 1 61.2 23.984a1.749 1.749 0 0 0-1.1-3.218 43.413 43.413 0 1 0 47.13 47.13 1.749 1.749 0 0 0-1.174-1.811zM64 103.917A39.925 39.925 0 0 1 53.791 25.4a34.52 34.52 0 1 0 48.814 48.813A39.662 39.662 0 0 1 64 103.917z"/></svg>`;
const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:20px; height:20px;"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>`;
const doubleTicksSVG = `<svg viewBox="0 0 16 15" width="16" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="msg-ticks"><path d="M1.5 7.5L4.5 10.5L12.5 2.5M5.5 10.5L8.5 13.5L14.5 7.5"/></svg>`;

const userId = crypto.randomUUID();

// Format time as hh:mm AM/PM
function getCurrentFormattedTime() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

// Escape HTML helper
function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Format bold text
function formatMarkdown(text) {
  const escaped = escapeHTML(text);
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// Add message bubble styled as WhatsApp
function addMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg-wrapper ${sender}-wrapper`;

  const timeStr = getCurrentFormattedTime();

  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender}`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "msg-content";
  if (sender === "bot") {
    contentDiv.innerHTML = formatMarkdown(text);
  } else {
    contentDiv.textContent = text;
  }
  msgDiv.appendChild(contentDiv);

  // WhatsApp time & ticks badge
  const metaDiv = document.createElement("div");
  metaDiv.className = "msg-meta";
  
  const timeSpan = document.createElement("span");
  timeSpan.className = "msg-time";
  timeSpan.textContent = timeStr;
  metaDiv.appendChild(timeSpan);

  if (sender === "user") {
    const ticksSpan = document.createElement("span");
    ticksSpan.className = "msg-ticks";
    ticksSpan.innerHTML = doubleTicksSVG;
    metaDiv.appendChild(ticksSpan);
  }

  msgDiv.appendChild(metaDiv);
  wrapper.appendChild(msgDiv);
  messagesContainer.appendChild(wrapper);

  // Scroll to bottom
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Typing animation styled as WhatsApp
function showTyping() {
  const t = document.createElement("div");
  t.className = "typing-bubble";
  t.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  messagesContainer.appendChild(t);
  chatBody.scrollTop = chatBody.scrollHeight;
  return t;
}

// Send message function
async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";
  sendBtn.disabled = true;
  const typing = showTyping();

  try {
    const res = await fetch("/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, text })
    });

    const data = await res.json();
    typing.remove();
    addMessage(data.reply, "bot");
    sendBtn.disabled = false;
  } catch (e) {
    sendBtn.disabled = false;
    if (typing) typing.remove();
    addMessage("Server not responding ⚠", "bot");
  }
}

// Click send
sendBtn.onclick = sendMessage;

// Enter key send
input.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

// Theme switcher
function toggleTheme() {
  const body = document.body;
  const iconContainer = document.querySelector('.theme-toggle');
  
  body.classList.toggle('dark-mode');
  
  if (body.classList.contains('dark-mode')) {
    iconContainer.innerHTML = sunSVG;
  } else {
    iconContainer.innerHTML = moonSVG;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Force Light Mode on startup
  document.body.classList.remove('dark-mode');

  const iconContainer = document.querySelector('.theme-toggle');
  iconContainer.innerHTML = moonSVG;

  // Pre-load the welcome message
  addMessage(`👋 Hello! I am the **Cent Loansetu AI Assistant** for Central Bank of India staff.

I am trained on the **Cent Hotel Master Circular (No. 4114, 16.09.2024)**.

You can ask me any question about the policy guidelines, margins, interest rates, documentation, or run a customer eligibility evaluation directly.
`, "bot");
});

function startNewChat() {
  window.location.reload();
}
