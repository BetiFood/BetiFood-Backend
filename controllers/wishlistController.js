const Wishlist = require("../models/Wishlist");
const Meal = require("../models/Meal");

// Add meal to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { mealId } = req.body;
    const userId = req.user._id;

    if (!mealId) {
      return res.status(400).json({ message: "معرف الوجبة مطلوب" });
    }

    // Check if meal exists
    const meal = await Meal.findById(mealId);
    if (!meal) {
      return res.status(404).json({ message: "الوجبة غير موجودة" });
    }

    // Check if already in wishlist
    const existingWishlistItem = await Wishlist.findOne({ userId, mealId });
    if (existingWishlistItem) {
      return res
        .status(409)
        .json({ message: "الوجبة موجودة بالفعل في قائمة المفضلة" });
    }

    const wishlistItem = new Wishlist({
      userId,
      mealId,
    });

    await wishlistItem.save();

    // Populate meal data for response
    const populatedWishlistItem = await Wishlist.findById(
      wishlistItem._id
    ).populate({
      path: "mealId",
      select:
        "name description price category categoryName images cook rate popularity",
    });

    // Rename mealId to meal in response
    const response = populatedWishlistItem.toObject();
    response.meal = response.mealId;
    delete response.mealId;

    res.status(201).json({
      message: "تم إضافة الوجبة إلى قائمة المفضلة بنجاح",
      wishlistItem: response,
    });
  } catch (err) {
    res.status(500).json({
      message: "فشل في إضافة الوجبة إلى قائمة المفضلة",
      error: err.message,
    });
  }
};

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const wishlistItems = await Wishlist.find({ userId })
      .populate({
        path: "mealId",
        select:
          "name description price category categoryName images cook rate popularity",
      })
      .sort({ addedAt: -1 });

    // Rename mealId to meal in each item
    const response = wishlistItems.map((item) => {
      const itemObj = item.toObject();
      itemObj.meal = itemObj.mealId;
      delete itemObj.mealId;
      return itemObj;
    });

    res.json(response);
  } catch (err) {
    res
      .status(500)
      .json({ message: "فشل في جلب قائمة المفضلة", error: err.message });
  }
};

// Remove meal from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { mealId } = req.params;
    const userId = req.user._id;

    const wishlistItem = await Wishlist.findOne({ userId, mealId });

    if (!wishlistItem) {
      return res
        .status(404)
        .json({ message: "الوجبة غير موجودة في قائمة المفضلة" });
    }

    // Get meal data before deletion
    const meal = await Meal.findById(mealId);

    await Wishlist.findOneAndDelete({ userId, mealId });

    res.json({
      message: "تم حذف الوجبة من قائمة المفضلة بنجاح",
      removedMeal: meal,
    });
  } catch (err) {
    res.status(500).json({
      message: "فشل في حذف الوجبة من قائمة المفضلة",
      error: err.message,
    });
  }
};

// Check if meal is in user's wishlist
const checkWishlistStatus = async (req, res) => {
  try {
    const { mealId } = req.params;
    const userId = req.user._id;

    const wishlistItem = await Wishlist.findOne({ userId, mealId }).populate({
      path: "mealId",
      select:
        "name description price category categoryName images cook rate popularity",
    });

    let response = {
      isInWishlist: !!wishlistItem,
      wishlistItem: null,
    };

    if (wishlistItem) {
      const itemObj = wishlistItem.toObject();
      itemObj.meal = itemObj.mealId;
      delete itemObj.mealId;
      response.wishlistItem = itemObj;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({
      message: "فشل في التحقق من حالة قائمة المفضلة",
      error: err.message,
    });
  }
};

// Clear entire wishlist
const clearWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all wishlist items with meal data before deletion
    const wishlistItems = await Wishlist.find({ userId }).populate({
      path: "mealId",
      select:
        "name description price category categoryName images cook rate popularity",
    });

    const result = await Wishlist.deleteMany({ userId });

    // Rename mealId to meal in each item
    const removedMeals = wishlistItems.map((item) => {
      const itemObj = item.toObject();
      itemObj.meal = itemObj.mealId;
      delete itemObj.mealId;
      return itemObj;
    });

    res.json({
      message: "تم مسح قائمة المفضلة بنجاح",
      deletedCount: result.deletedCount,
      removedMeals: removedMeals,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "فشل في مسح قائمة المفضلة", error: err.message });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  checkWishlistStatus,
  clearWishlist,
};
