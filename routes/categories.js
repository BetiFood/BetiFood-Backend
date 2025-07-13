const express = require("express");
const { protect, notDelivery } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { requireCookRole } = require("../middleware/authMiddleware");
const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} = require("../controllers/categoryController");

const router = express.Router();

// Require authentication and block delivery role for getting categories
router.get("/", protect, notDelivery, getAllCategories);

// All other routes require authentication
router.use(protect);

// Admin
router.post("/", admin, createCategory);
router.put("/:id", admin, updateCategory);

// Admin only - delete category
router.delete("/:id", admin, deleteCategory);

// Protected route - block delivery role for getting categories by id
router.get("/:id", notDelivery, getCategoryById);

module.exports = router;
