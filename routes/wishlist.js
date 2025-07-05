const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  checkWishlistStatus,
  clearWishlist,
} = require("../controllers/wishlistController");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Add meal to wishlist
router.post("/", addToWishlist);

// Get user's wishlist
router.get("/", getWishlist);

// Check if meal is in wishlist
router.get("/check/:mealId", checkWishlistStatus);

// Remove meal from wishlist
router.delete("/:mealId", removeFromWishlist);

// Clear entire wishlist
router.delete("/", clearWishlist);

module.exports = router;
