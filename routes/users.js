const express = require("express");
const router = express.Router();
const {
  getAllCooks,
  getTopRatedCooks,
  getMostPopularCooks,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getCookById,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// Public routes (no authentication required)
router.get("/cooks", getAllCooks);
router.get("/cooks/top-rated", getTopRatedCooks);
router.get("/cooks/most-popular", getMostPopularCooks);
router.get("/cooks/:cookId", getCookById);

// Protected routes (authentication required)
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.delete("/profile", protect, deleteUserProfile);

module.exports = router;
