const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorhandler.middleware.js");
const connectDB = require("./config/connection.js");
const authRoutes = require("./routes/auth.js");
const adminRoutes = require("./routes/admin.js");
const categoryRoutes = require("./routes/categories.js");
const wishlistRoutes = require("./routes/wishlist.js");
const cookReviewRoutes = require("./routes/cookReviews.js");
const mealReviewRoutes = require("./routes/mealReviews.js");
const userRoutes = require("./routes/users.js");
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
app.use("/api/users", userRoutes);
app.use("/api/meals", require("./routes/meals"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/cook-reviews", cookReviewRoutes);
app.use("/api/meal-reviews", mealReviewRoutes);
// Serve uploaded files (fallback for local storage)
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.use(errorHandler);

// Only listen if not running on Vercel (i.e., local development)
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`listening on http://localhost:${port}`));
}

module.exports = app;
