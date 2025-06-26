require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = 3000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

app.use(express.json());
app.use("/api/auth", require("./routes/auth"));

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});
const cors = require("cors");

// Allow all origins (you can customize later)
app.use(
  cors({
    origin: "http://localhost:5174",
  })
);

// Remove app.listen() for Vercel compatibility
module.exports = app;
