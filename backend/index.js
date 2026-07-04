// backend/index.js
require("dotenv").config();
require("./db");

const express = require("express");
const cors = require("cors");

const chatRouter = require("./routes/chat");
const logsRouter = require("./routes/admin/logs");
const categoriesRouter = require("./routes/admin/categories");
const intentsRouter = require("./routes/admin/intents");
const questionsRouter = require("./routes/admin/questions");
const transferRouter = require("./routes/admin/transfer");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Backend chatbot running 🚀"));

app.use("/chat", chatRouter);
app.use("/admin/logs", logsRouter);
app.use("/admin/categories", categoriesRouter);
app.use("/admin/intents", intentsRouter);
app.use("/admin/questions", questionsRouter);
app.use("/admin", transferRouter);

app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));