const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorhandler.middleware.js");
const connectDB = require("./config/connection.js");
const authRoutes = require("./routes/auth.js");
const app = express();
const port = 3000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

dotenv.config();
// Connect to MongoDB
connectDB();

// Allow all origins (you can customize later)
app.use(
  cors({
    origin: "http://localhost:5174",
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/meals", require("./routes/meals"));

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

// Handle errors
// app.use((error, req, res, next) => {

//   console.error("Error occurred:", error);
//   res.status(500).json({ message: "Internal Server Error" });
// });
app.use(errorHandler);

// Only listen if not running on Vercel (i.e., local development)
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`listening on http://localhost:${port}`));
}
// Remove app.listen() for Vercel compatibility
module.exports = app;
