const express = require("express");
const router = express.Router();

const {
  addMealReview,
  getMealReviews,
  getClientMealReviews,
  getMealReviewById,
  updateMealReview,
  deleteMealReview,
  getAllMealReviews,
} = require("../controllers/mealReviewController");

const {
  protect,
  requireClientRole,
  requireAdminRole,
} = require("../middleware/authMiddleware");

// Public routes
router.get("/meal/:mealId", getMealReviews); // Get reviews for a specific meal
router.get("/:id", getMealReviewById); // Get a specific meal review

// Client routes (require authentication)
router.post("/", protect, requireClientRole, addMealReview); // Add a new meal review
router.get("/client/:clientId", protect, getClientMealReviews); // Get meal reviews by a specific client
router.put("/:id", protect, requireClientRole, updateMealReview); // Update a meal review
router.delete("/:id", protect, requireClientRole, deleteMealReview); // Delete a meal review

// Admin routes
router.get("/admin/all", protect, requireAdminRole, getAllMealReviews); // Get all meal reviews (admin only)

module.exports = router;
