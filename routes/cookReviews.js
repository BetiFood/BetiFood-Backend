const express = require("express");
const router = express.Router();

const {
  addCookReview,
  getCookReviews,
  getClientReviews,
  getCookReviewById,
  updateCookReview,
  deleteCookReview,
  getAllCookReviews,
  getTopRatedCookReviews,
} = require("../controllers/cookReviewController");

const {
  protect,
  requireClientRole,
  requireAdminRole,
} = require("../middleware/authMiddleware");

// Client route to get top-rated cook reviews
router.get("/top-rated", protect, requireClientRole, getTopRatedCookReviews);

// Public routes
//router.get("/cook/:cookId", getCookReviews); // Get reviews for a specific cook
router.get("/cook/:cookId", protect, getCookReviews);
router.get("/:id", getCookReviewById); // Get a specific cook review

// Client routes (require authentication)
router.post("/", protect, requireClientRole, addCookReview); // Add a new cook review
router.get("/client/:clientId", protect, getClientReviews); // Get reviews by a specific client
router.put("/:id", protect, requireClientRole, updateCookReview); // Update a cook review
router.delete("/:id", protect, requireClientRole, deleteCookReview); // Delete a cook review

// Admin routes
router.get("/admin/all", protect, requireAdminRole, getAllCookReviews); // Get all cook reviews (admin only)

module.exports = router;
