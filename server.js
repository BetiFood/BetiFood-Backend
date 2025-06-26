require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = 3000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
    console.log("Connected to MongoDB");
    client.close();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

connectToMongoDB();

app.use(express.json());
app.use("/api/auth", require("./routes/auth"));

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Remove app.listen() for Vercel compatibility
module.exports = app;
