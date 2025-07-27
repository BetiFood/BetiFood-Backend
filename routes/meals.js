const express = require("express");
const router = express.Router();

const {
  addMeal,
  getMeals,
  getMealById,
  getMealsByCategory,
  updateMeal,
  deleteMeal,
  getMyMeals,
  getMealsByChef
} = require("../controllers/mealsController");

const { protect, requireCookRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.get("/cook/top-rated", protect, requireCookRole, require("../controllers/mealsController").getTopRatedMealsByCook);
router.get("/cook/most-popular", protect, requireCookRole, require("../controllers/mealsController").getMostPopularMealsByCook);
router.get("/cook/categories", protect, requireCookRole, require("../controllers/mealsController").getCookMealCategories);

router.get("/", getMeals);

router.get("/myMeals", protect, requireCookRole, getMyMeals);

router.get("/:id", getMealById);

router.get("/category/:categoryId", getMealsByCategory);

router.post("/", protect, requireCookRole, upload.array("images", 5), addMeal);

router.put(
  "/:id",
  protect,
  requireCookRole,
  upload.array("images", 5),
  updateMeal
);

router.delete("/:id", protect, requireCookRole, deleteMeal);
router.get("/by-chef/:chefId", getMealsByChef);

module.exports = router;
