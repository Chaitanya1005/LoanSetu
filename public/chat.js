const messages = document.getElementById("messages");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" style="width:22px; height:22px;"><path fill="currentColor" d="M106.056 66.085a1.746 1.746 0 0 0-2.04.715A31.016 31.016 0 1 1 61.2 23.984a1.749 1.749 0 0 0-1.1-3.218 43.413 43.413 0 1 0 47.13 47.13 1.749 1.749 0 0 0-1.174-1.811zM64 103.917A39.925 39.925 0 0 1 53.791 25.4a34.52 34.52 0 1 0 48.814 48.813A39.662 39.662 0 0 1 64 103.917z"/></svg>`;

const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:22px; height:22px;"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>`;

let userId = "user123";
let userId = localStorage.getItem("loansetu_user_id");

if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("loansetu_user_id", userId);
}
fetch("/message", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId,
    text: message
  })
});

// Add message bubble
function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// Typing animation
function showTyping() {
  const t = document.createElement("div");
  t.className = "typing msg bot";
  t.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  messages.appendChild(t);
  messages.scrollTop = messages.scrollHeight;
  return t;
}

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
// Send message function
async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  // 1. Start the animation
  document.body.classList.add("chat-active");

  // 2. Remove the welcome container ONLY after the animation finishes (0.8s)
  const welcome = document.querySelector(".welcome-container");
  if (welcome) {
    setTimeout(() => {
      welcome.remove();
    }, 800); 
  }

  addMessage(text, "user");
  input.value = "";

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

  } catch (e) {
    if(typing) typing.remove();
    addMessage("Server not responding ⚠", "bot");
  }
}

// Click send
sendBtn.onclick = sendMessage;

// Enter key send
input.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

// Set initial icon on page load
window.addEventListener('DOMContentLoaded', () => {
    const iconContainer = document.querySelector('.theme-toggle');
    if (document.body.classList.contains('dark-mode')) {
        iconContainer.innerHTML = sunSVG;
    } else {
        iconContainer.innerHTML = moonSVG;
    }
});
// This runs as soon as the page loads to show the first icon
function initTheme() {
    const iconContainer = document.querySelector('.theme-toggle');
    if (document.body.classList.contains('dark-mode')) {
        iconContainer.innerHTML = sunSVG;
    } else {
        iconContainer.innerHTML = moonSVG;
    }
}
initTheme();
