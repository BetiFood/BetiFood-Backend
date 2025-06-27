const express = require("express");
const router = express.Router();
const {
  verifyToken,
  requireCookRole,
} = require("../middleware/authMiddleware");
const { addMeal } = require("../controllers/mealsController");

// Placeholder controller
router.post("/add", verifyToken, requireCookRole, addMeal);

module.exports = router;
