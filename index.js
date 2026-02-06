require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { handleUserMessage, createEmptySession } = require("./flow");
const path = require("path");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

app.post("/message", async (req, res) => {
  const { userId, text } = req.body;

  if (!sessions.has(userId)) sessions.set(userId, createEmptySession());

  const session = sessions.get(userId);
  const result = await handleUserMessage(text, session);

  res.send({ reply: result.reply });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/chat.html"));
});

app.listen(3000, () => console.log("LoanSetu running at http://localhost:3000/"));

