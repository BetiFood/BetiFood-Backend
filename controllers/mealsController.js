const Meal = require("../models/Meal");
const Category = require("../models/Category");
const cloudinary = require("cloudinary").v2;
const User = require("../models/User");

async function addMeal(req, res) {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const { name, description, price, categoryName, quantity } = req.body;
    let { ingredients } = req.body;
    const cookId = req.user._id;

    // Handle ingredients: accept array or comma-separated string
    if (Array.isArray(ingredients)) {
      // Already an array (from frontend)
      ingredients = ingredients.map((i) => i.trim()).filter((i) => i);
    } else if (typeof ingredients === "string") {
      // Comma-separated string (from Postman)
      ingredients = ingredients
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i);
    } else {
      ingredients = [];
    }

    // Validate required fields
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
      quantity === "" ||
      !ingredients ||
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return res
        .status(400)
        .json({
          message: "يجب إدخال جميع الحقول المطلوبة بما في ذلك المكونات",
        });
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

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      // Check if using Cloudinary (files have path) or memory storage (files have buffer)
      if (req.files[0].path) {
        // Cloudinary storage - files already uploaded
        images = req.files.map((file) => file.path);
      } else {
        // Memory storage - need to upload to Cloudinary
        try {
          const uploadPromises = req.files.map(async (file) => {
            const result = await cloudinary.uploader.upload(
              `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
              {
                folder: "meals",
                transformation: [{ width: 500, height: 500, crop: "limit" }],
              }
            );
            return result.secure_url;
          });
          images = await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error("Error uploading to Cloudinary:", uploadError);
          return res.status(500).json({
            message: "فشل في رفع الصور",
            error: "Cloudinary upload failed",
          });
        }
      }
    }

    const cook = {
      cookId: req.user._id,
      name: req.user.name,
    };

    const meal = await Meal.create({
      name,
      description,
      ingredients, // <-- Save ingredients
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
    const {
      category,
      sort,
      page = 1,
      limit = 10,
      query, // for search
    } = req.query;

    const filter = {};

    // Search by name or description
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    // Filter by category name (case-insensitive)
    if (category) {
      filter["category.categoryName"] = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    // Sorting
    let sortOption = {};
    switch (sort) {
      case "price_asc":
        sortOption.price = 1;
        break;
      case "price_desc":
        sortOption.price = -1;
        break;
      case "rating_desc":
        sortOption.rate = -1;
        break;
      case "popularity_desc":
        sortOption.popularity = -1;
        break;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Only show meals for cooks who are verified and isIdentityVerified (public/client)
    const meals = await Meal.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    // Filter meals by cook's verification status
    const cookIds = meals.map((meal) => meal.cook.cookId);
    const cooks = await User.find({
      _id: { $in: cookIds },
      isVerified: true,
      isIdentityVerified: true,
    }).select("_id");
    const allowedCookIds = new Set(cooks.map((c) => c._id.toString()));
    const filteredMeals = meals.filter((meal) =>
      allowedCookIds.has(meal.cook.cookId.toString())
    );

    res.status(200).json(filteredMeals);
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

    // Filter meals by cook's verification status
    const cookIds = meals.map((meal) => meal.cook.cookId);
    const cooks = await User.find({
      _id: { $in: cookIds },
      isVerified: true,
      isIdentityVerified: true,
    }).select("_id");
    const allowedCookIds = new Set(cooks.map((c) => c._id.toString()));
    const filteredMeals = meals.filter((meal) =>
      allowedCookIds.has(meal.cook.cookId.toString())
    );

    if (filteredMeals.length === 0) {
      return res.status(404).json({ message: "لا توجد وجبات في هذا التصنيف" });
    }

    res.status(200).json(filteredMeals);
  } catch (err) {
    res.status(500).json({
      message: "فشل في جلب الوجبات حسب التصنيف",
      error: err.message,
    });
  }
}

async function updateMeal(req, res) {
  try {
    console.log("UPDATE BODY:", req.body);
    console.log("UPDATE FILES:", req.files);

    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ message: "الوجبة غير موجودة" });

    // More robust cook authorization check
    const isAuthorized =
      meal.cook &&
      meal.cook.cookId &&
      meal.cook.cookId.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return res.status(403).json({ message: "غير مصرح لك بتعديل هذه الوجبة" });
    }

    if (req.files && req.files.length > 0) {
      let images = [];
      if (req.files[0].path) {
        images = req.files.map((file) => file.path);
      } else {
        try {
          const uploadPromises = req.files.map(async (file) => {
            const result = await cloudinary.uploader.upload(
              `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
              {
                folder: "meals",
                transformation: [{ width: 500, height: 500, crop: "limit" }],
              }
            );
            return result.secure_url;
          });
          images = await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error("Error uploading to Cloudinary:", uploadError);
          return res.status(500).json({
            message: "فشل في رفع الصور",
            error: "Cloudinary upload failed",
          });
        }
      }
      req.body.images = images;
    }

    if (req.body.categoryName) {
      const category = await Category.findOne({
        name: { $regex: `^${req.body.categoryName.trim()}$`, $options: "i" },
      });
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
      delete req.body.categoryName; // Remove the original field
    }

    // Validate numbers if provided
    if (req.body.price !== undefined) {
      const priceNum = Number(req.body.price);
      if (isNaN(priceNum)) {
        return res
          .status(400)
          .json({ message: "السعر يجب أن يكون رقمًا صحيحًا" });
      }
      req.body.price = priceNum;
    }

    if (req.body.quantity !== undefined) {
      const quantityNum = Number(req.body.quantity);
      if (isNaN(quantityNum)) {
        return res
          .status(400)
          .json({ message: "الكمية يجب أن تكون رقمًا صحيحًا" });
      }
      req.body.quantity = quantityNum;
    }

    if (req.body.rate !== undefined) {
      const rateNum = Number(req.body.rate);
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 5) {
        return res
          .status(400)
          .json({ message: "التقييم يجب أن يكون رقمًا بين 0 و 5" });
      }
      req.body.rate = rateNum;
    }

    if (req.body.popularity !== undefined) {
      const popularityNum = Number(req.body.popularity);
      if (isNaN(popularityNum) || popularityNum < 0) {
        return res
          .status(400)
          .json({ message: "مؤشر الشعبية يجب أن يكون رقمًا موجبًا" });
      }
      req.body.popularity = popularityNum;
    }

    Object.assign(meal, req.body);
    await meal.save();

    res.status(200).json({ message: "تم تحديث الوجبة بنجاح", meal });
  } catch (err) {
    console.error("Error updating meal:", err);
    res.status(500).json({
      message: "فشل في تحديث الوجبة",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

async function deleteMeal(req, res) {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ message: " الوجبة غير موجودة" });

    const isAuthorized =
      meal.cook &&
      meal.cook.cookId &&
      meal.cook.cookId.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذه الوجبة" });
    }

    await meal.deleteOne();
    res.status(200).json({ message: " تم حذف الوجبة" });
  } catch (err) {
    res.status(500).json({ message: " فشل في الحذف", error: err.message });
  }
}

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

async function getTopRatedMealsByCook(req, res) {
  try {
    if (!req.user || req.user.role !== "cook") {
      return res
        .status(403)
        .json({ message: "غير مصرح لك بالوصول إلى هذه البيانات" });
    }
    const cookId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const cook = await require("../models/User").findById(cookId);
    if (!cook || cook.role !== "cook" || !cook.isVerified) {
      return res.status(404).json({ message: "الطاهي غير موجود أو غير مفعل" });
    }
    const skip = (page - 1) * limit;
    const meals = await require("../models/Meal")
      .find({ "cook.cookId": cookId })
      .sort({ rate: -1, popularity: -1 })
      .skip(skip)
      .limit(Number(limit));
    const totalMeals = await require("../models/Meal").countDocuments({
      "cook.cookId": cookId,
    });
    res.status(200).json({
      meals,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalMeals / limit),
        totalMeals,
        hasNext: skip + meals.length < totalMeals,
        hasPrev: page > 1,
      },
      sortBy: "rating_high",
      cook: { _id: cook._id, name: cook.name },
    });
  } catch (err) {
    console.error("Error getting top-rated meals for cook:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب أفضل وجبات الطاهي",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

async function getMostPopularMealsByCook(req, res) {
  try {
    if (!req.user || req.user.role !== "cook") {
      return res
        .status(403)
        .json({ message: "غير مصرح لك بالوصول إلى هذه البيانات" });
    }
    const cookId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const cook = await require("../models/User").findById(cookId);
    if (!cook || cook.role !== "cook" || !cook.isVerified) {
      return res.status(404).json({ message: "الطاهي غير موجود أو غير مفعل" });
    }
    const skip = (page - 1) * limit;
    const meals = await require("../models/Meal")
      .find({ "cook.cookId": cookId })
      .sort({ popularity: -1, rate: -1 })
      .skip(skip)
      .limit(Number(limit));
    const totalMeals = await require("../models/Meal").countDocuments({
      "cook.cookId": cookId,
    });
    res.status(200).json({
      meals,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalMeals / limit),
        totalMeals,
        hasNext: skip + meals.length < totalMeals,
        hasPrev: page > 1,
      },
      sortBy: "popularity_high",
      cook: { _id: cook._id, name: cook.name },
    });
  } catch (err) {
    console.error("Error getting most popular meals for cook:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب أكثر وجبات الطاهي شعبية",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

async function getCookMealCategories(req, res) {
  try {
    if (!req.user || req.user.role !== "cook") {
      return res
        .status(403)
        .json({ message: "غير مصرح لك بالوصول إلى هذه البيانات" });
    }
    const cookId = req.user._id;
    const mongoose = require("mongoose");
    const cook = await require("../models/User").findById(cookId);
    if (!cook || cook.role !== "cook") {
      return res
        .status(404)
        .json({ success: false, message: "الطاهي غير موجود" });
    }
    const categories = await require("../models/Meal").aggregate([
      { $match: { "cook.cookId": new mongoose.Types.ObjectId(cookId) } },
      {
        $group: {
          _id: "$category.categoryId",
          categoryName: { $first: "$category.categoryName" },
        },
      },
      {
        $project: {
          _id: 0,
          categoryId: "$__id",
          categoryName: 1,
        },
      },
    ]);
    res.status(200).json({ categories });
  } catch (err) {
    console.error("Error in getCookMealCategories:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب تصنيفات وجبات الطاهي",
      error: err.message || "Internal server error",
    });
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
  getTopRatedMealsByCook,
  getMostPopularMealsByCook,
  getCookMealCategories,
};
