const Meal = require("../models/Meal");
const Category = require("../models/Category");

async function addMeal(req, res) {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const { name, description, price, categoryName, quantity } = req.body;
    const cookId = req.user._id;

    // Validate required fields and numbers
    if (
      name === undefined ||
      name.trim() === "" ||
      description === undefined ||
      description.trim() === "" ||
      price === undefined ||
      price === "" ||
      categoryName === undefined ||
      categoryName.trim() === "" ||
      quantity === undefined ||
      quantity === ""
    ) {
      return res
        .status(400)
        .json({ message: "يجب إدخال جميع الحقول المطلوبة" });
    }

    const priceNum = Number(price);
    const quantityNum = Number(quantity);
    if (isNaN(priceNum) || isNaN(quantityNum)) {
      return res
        .status(400)
        .json({ message: "السعر والكمية يجب أن يكونا أرقامًا صحيحة" });
    }

    // Validate category exists and is active by name (case-insensitive, whitespace-tolerant)
    const category = await Category.findOne({
      name: { $regex: `^${categoryName.trim()}$`, $options: "i" },
    });
    if (!category) {
      return res.status(404).json({ message: "التصنيف غير موجود" });
    }
    if (!category.isActive) {
      return res.status(400).json({ message: "التصنيف غير نشط" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "يجب رفع صورة واحدة على الأقل" });
    }

    const images = req.files.map((file) => {
      // If using Cloudinary, file.path will be the URL
      // If using local storage, file.filename will be the filename
      return file.path || file.filename;
    });

    const cook = {
      cookId: req.user._id,
      name: req.user.name,
    };

    const meal = await Meal.create({
      name,
      description,
      price: priceNum,
      category: {
        categoryId: category._id,
        categoryName: category.name,
      },
      quantity: quantityNum,
      cook,
      images: images,
    });

    res.status(201).json({ message: "تم إضافة الوجبة بنجاح", meal });
  } catch (err) {
    console.error("Error adding meal:", err);
    res.status(500).json({
      success: false,
      message: "فشل إضافة الوجبة",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

async function getMeals(req, res) {
  try {
    const { categoryId, maxPrice } = req.query;
    const filter = {};

    if (categoryId) filter["category.categoryId"] = categoryId;
    if (maxPrice) filter.price = { $lte: Number(maxPrice) };

    const meals = await Meal.find(filter);

    // Reorder fields to ensure proper order in response
    const orderedMeals = meals.map((meal) => {
      const mealObj = meal.toObject();
      return {
        _id: mealObj._id,
        name: mealObj.name,
        description: mealObj.description,
        price: mealObj.price,
        category: mealObj.category,
        cook: mealObj.cook,
        quantity: mealObj.quantity,
        rate: mealObj.rate,
        images: mealObj.images,
        createdAt: mealObj.createdAt,
        popularity: mealObj.popularity,
        __v: mealObj.__v,
      };
    });

    res.status(200).json(orderedMeals);
  } catch (err) {
    console.error("Error getting meals:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب الوجبات",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

async function getMealById(req, res) {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: "الوجبة غير موجودة" });
    }
    res.status(200).json(meal);
  } catch (err) {
    console.error("Error getting meal by ID:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب الوجبة",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

async function getMealsByCategory(req, res) {
  try {
    const categoryId = req.params.categoryId;

    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "التصنيف غير موجود" });
    }

    const meals = await Meal.find({ "category.categoryId": categoryId });

    if (meals.length === 0) {
      return res.status(404).json({ message: "لا توجد وجبات في هذا التصنيف" });
    }

    res.status(200).json(meals);
  } catch (err) {
    res.status(500).json({
      message: "فشل في جلب الوجبات حسب التصنيف",
      error: err.message,
    });
  }
}

async function updateMeal(req, res) {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ message: "الوجبة غير موجودة" });

    if (
      !meal.cook ||
      !meal.cook.cookId ||
      meal.cook.cookId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "غير مصرح لك بتعديل هذه الوجبة" });
    }

    // If category is being updated, validate it
    if (req.body.categoryId) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        return res.status(404).json({ message: "التصنيف غير موجود" });
      }
      if (!category.isActive) {
        return res.status(400).json({ message: "التصنيف غير نشط" });
      }

      // Update category information
      req.body.category = {
        categoryId: category._id,
        categoryName: category.name,
      };
      delete req.body.categoryId; // Remove the original field
    }

    // In updateMeal, if updating cook, update both cookId and name
    if (req.body.cookId) {
      meal.cook = {
        cookId: req.body.cookId,
        name: req.user.name, // or fetch from DB if needed
      };
      delete req.body.cookId;
    }

    Object.assign(meal, req.body);
    await meal.save();

    res.status(200).json({ message: " تم تحديث الوجبة", meal });
  } catch (err) {
    res.status(500).json({ message: " فشل في التحديث", error: err.message });
  }
}

async function deleteMeal(req, res) {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ message: " الوجبة غير موجودة" });

    if (
      !meal.cook ||
      !meal.cook.cookId ||
      meal.cook.cookId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذه الوجبة" });
    }

    await meal.deleteOne();
    res.status(200).json({ message: " تم حذف الوجبة" });
  } catch (err) {
    res.status(500).json({ message: " فشل في الحذف", error: err.message });
  }
}

// Get all meals for the authenticated cook
async function getMyMeals(req, res) {
  try {
    if (req.user.role !== "cook") {
      return res
        .status(403)
        .json({ message: "غير مصرح لك بالوصول إلى هذا المورد" });
    }
    const meals = await Meal.find({ "cook.cookId": req.user._id });
    res.status(200).json(meals);
  } catch (err) {
    res
      .status(500)
      .json({ message: " فشل في جلب الوجبات الخاصة بك", error: err.message });
  }
}

module.exports = {
  addMeal,
  getMeals,
  getMealById,
  getMealsByCategory,
  updateMeal,
  deleteMeal,
  getMyMeals,
};
