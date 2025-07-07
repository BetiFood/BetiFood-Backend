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
} = require("../controllers/cookReviewController");

const {
  protect,
  requireClientRole,
  requireAdminRole,
} = require("../middleware/authMiddleware");

// Public routes
router.get("/cook/:cookId", getCookReviews); // Get reviews for a specific cook
router.get("/:id", getCookReviewById); // Get a specific cook review

// Client routes (require authentication)
router.post("/", protect, requireClientRole, addCookReview); // Add a new cook review
router.get("/client/:clientId", protect, getClientReviews); // Get reviews by a specific client
router.put("/:id", protect, requireClientRole, updateCookReview); // Update a cook review
router.delete("/:id", protect, requireClientRole, deleteCookReview); // Delete a cook review

// Admin routes
router.get("/admin/all", protect, requireAdminRole, getAllCookReviews); // Get all cook reviews (admin only)

module.exports = router;
