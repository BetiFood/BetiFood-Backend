const Meal = require("../models/Meal");

// Add a new meal (only for cooks)
async function addMeal(req, res) {
  try {
    const { name, description, price, category, image } = req.body;
    const cookId = req.user._id;
    // Ensure image is always an array
    let images = [];
    if (Array.isArray(image)) {
      images = image;
    } else if (typeof image === "string") {
      images = [image];
    }
    const meal = await Meal.create({
      name,
      description,
      price,
      category,
      cookId,
      image: images,
      createdAt: new Date(),
    });
    res.status(201).json({ message: "تم إضافة الوجبة بنجاح", meal });
  } catch (err) {
    res.status(500).json({ message: "فشل إضافة الوجبة", error: err.message });
  }
}

module.exports = { addMeal };
