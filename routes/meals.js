const express = require("express");
const router = express.Router();

const {
  addMeal,
  getMeals,
  getMealById,
  getMealsByCategory,
  updateMeal,
  deleteMeal,
} = require("../controllers/mealsController");

const { verifyToken, requireCookRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.get("/", getMeals);

router.get("/category/:category", getMealsByCategory);

router.get("/:id", getMealById);

router.post("/", verifyToken, requireCookRole, upload.array("image", 5), addMeal);

router.put("/:id", verifyToken, requireCookRole, updateMeal);

router.delete("/:id", verifyToken, requireCookRole, deleteMeal);

module.exports = router;
