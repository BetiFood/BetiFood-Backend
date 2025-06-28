const Meal = require("../models/Meal");
const { ApiResponse } = require("../utils/response");

// التحقق من توفر الوجبة
const checkMealAvailability = async (req, res, next) => {
  try {
    const { mealId, quantity = 1 } = req.body;
    
    if (!mealId) {
      return res.status(400).json(new ApiResponse(false, "معرف الوجبة مطلوب"));
    }

    const meal = await Meal.findById(mealId);
    if (!meal) {
      return res.status(404).json(new ApiResponse(false, "الوجبة غير موجودة"));
    }

    if (meal.quantity < quantity) {
      return res.status(400).json(new ApiResponse(false, "الكمية المطلوبة غير متوفرة"));
    }

    req.meal = meal;
    next();
  } catch (error) {
    next(error);
  }
};

// التحقق من صحة الكمية
const validateQuantity = (req, res, next) => {
  const { quantity } = req.body;
  
  if (!quantity || quantity <= 0) {
    return res.status(400).json(new ApiResponse(false, "الكمية يجب أن تكون أكبر من صفر"));
  }

  if (quantity > 100) {
    return res.status(400).json(new ApiResponse(false, "الكمية لا يمكن أن تتجاوز 100"));
  }

  next();
};

// التحقق من وجود الكارت
const checkCartExists = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const Cart = require("../models/Cart");
    
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json(new ApiResponse(false, "الكارت غير موجود"));
    }

    req.cart = cart;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkMealAvailability,
  validateQuantity,
  checkCartExists
}; 