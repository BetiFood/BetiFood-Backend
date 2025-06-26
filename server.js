require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");

const app = express();
const port = 3000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

mongoose
  .connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

app.use(express.json());
app.use("/api/auth", require("./routes/auth"));

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Remove app.listen() for Vercel compatibility
module.exports = app;
