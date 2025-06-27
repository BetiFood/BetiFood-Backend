const express = require("express");
const router = express.Router();
const {
  addMeal,
  getMeals,
  updateMeal,
  deleteMeal,
} = require("../controllers/mealsController");

const { verifyToken, requireCookRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/", verifyToken, requireCookRole, upload.array("image", 5), addMeal);

router.get("/", getMeals);

router.put("/:id", verifyToken, requireCookRole, updateMeal);

router.delete("/:id", verifyToken, requireCookRole, deleteMeal);

module.exports = router;
