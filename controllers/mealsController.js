const Meal = require("../models/Meal");

async function addMeal(req, res) {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const { name, description, price, category, quantity } = req.body;
    const cookId = req.user._id;

    if (!name || !description || !price || !category || !quantity) {
      return res.status(400).json({
        message: "❌ يجب إدخال جميع الحقول المطلوبة",
        body: req.body,
        files: req.files,
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "❌ يجب رفع صورة واحدة على الأقل" });
    }

    const images = req.files.map((file) => file.filename);

    const meal = await Meal.create({
      name,
      description,
      price,
      category,
      quantity,
      cookId,
      image: images,
    });

    res.status(201).json({ message: "✅ تم إضافة الوجبة بنجاح", meal });
  } catch (err) {
    res.status(500).json({ message: "❌ فشل إضافة الوجبة", error: err.message });
  }
}

async function getMeals(req, res) {
  try {
    const { category, maxPrice } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (maxPrice) filter.price = { $lte: Number(maxPrice) };

    const meals = await Meal.find(filter).populate("cookId", "name email");
    res.status(200).json(meals);
  } catch (err) {
    res.status(500).json({ message: "❌ فشل في جلب الوجبات", error: err.message });
  }
}

async function getMealById(req, res) {
  try {
    const meal = await Meal.findById(req.params.id).populate("cookId", "name email");
    if (!meal) {
      return res.status(404).json({ message: "❌ الوجبة غير موجودة" });
    }
    res.status(200).json(meal);
  } catch (err) {
    res.status(500).json({ message: "❌ فشل في جلب الوجبة", error: err.message });
  }
}

async function getMealsByCategory(req, res) {
  try {
    const category = req.params.category;
    const meals = await Meal.find({ category }).populate("cookId", "name email");

    if (meals.length === 0) {
      return res.status(404).json({ message: "❌ لا توجد وجبات في هذا التصنيف" });
    }

    res.status(200).json(meals);
  } catch (err) {
    res.status(500).json({ message: "❌ فشل في جلب الوجبات حسب التصنيف", error: err.message });
  }
}

async function updateMeal(req, res) {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ message: "❌ الوجبة غير موجودة" });

    if (meal.cookId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "❌ غير مصرح لك بتعديل هذه الوجبة" });
    }

    Object.assign(meal, req.body);
    await meal.save();

    res.status(200).json({ message: "✅ تم تحديث الوجبة", meal });
  } catch (err) {
    res.status(500).json({ message: "❌ فشل في التحديث", error: err.message });
  }
}

async function deleteMeal(req, res) {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ message: "❌ الوجبة غير موجودة" });

    if (meal.cookId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "❌ غير مصرح لك بحذف هذه الوجبة" });
    }

    await meal.deleteOne();
    res.status(200).json({ message: "✅ تم حذف الوجبة" });
  } catch (err) {
    res.status(500).json({ message: "❌ فشل في الحذف", error: err.message });
  }
}

module.exports = {
  addMeal,
  getMeals,
  getMealById,
  getMealsByCategory,
  updateMeal,
  deleteMeal,
};