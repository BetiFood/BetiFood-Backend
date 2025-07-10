const MealReview = require("../models/MealReview");
const Meal = require("../models/Meal");
const User = require("../models/User");
const mongoose = require("mongoose");

// Helper function to update meal rating
async function updateMealRating(mealId) {
  try {
    const avgRatingResult = await MealReview.aggregate([
      {
        $match: {
          "meal.mealId": new mongoose.Types.ObjectId(mealId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    let newRating = 0.0;
    let totalReviews = 0;

    if (avgRatingResult.length > 0) {
      newRating = Math.round(avgRatingResult[0].avgRating * 10) / 10;
      totalReviews = avgRatingResult[0].totalReviews;
    }

    // Update the meal's rate and popularity
    await Meal.findByIdAndUpdate(mealId, {
      rate: newRating,
      popularity: totalReviews, // Using total reviews as popularity indicator
    });

    return { newRating, totalReviews };
  } catch (error) {
    console.error("Error updating meal rating:", error);
    throw error;
  }
}

// Add a new meal review
async function addMealReview(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }
    const { mealId, rating, comment } = req.body;
    const clientId = req.user._id;

    // Validate required fields
    if (!mealId || !rating || !comment) {
      return res.status(400).json({
        message: "يجب إدخال جميع الحقول المطلوبة (mealId, rating, comment)",
      });
    }

    // Validate rating
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        message: "التقييم يجب أن يكون رقمًا بين 1 و 5",
      });
    }

    // Validate comment length
    if (comment.trim().length < 10) {
      return res.status(400).json({
        message: "التعليق يجب أن يكون 10 أحرف على الأقل",
      });
    }

    if (comment.trim().length > 500) {
      return res.status(400).json({
        message: "التعليق لا يمكن أن يتجاوز 500 حرف",
      });
    }

    // Check if meal exists
    const meal = await Meal.findById(mealId);
    if (!meal) {
      return res.status(404).json({ message: "الوجبة غير موجودة" });
    }

    // Check if client has already reviewed this meal
    const existingReview = await MealReview.findOne({
      "client.clientId": clientId,
      "meal.mealId": mealId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "لقد قمت بتقييم هذه الوجبة من قبل",
      });
    }

    // Create the meal review
    const mealReview = await MealReview.create({
      client: {
        clientId: clientId,
        name: req.user.name,
      },
      meal: {
        mealId: mealId,
        name: meal.name,
      },
      rating: ratingNum,
      comment: comment.trim(),
    });

    // Update the meal's rating automatically
    const { newRating, totalReviews } = await updateMealRating(mealId);

    res.status(201).json({
      message: "تم إضافة التقييم بنجاح",
      mealReview,
      updatedMealStats: {
        newRating,
        totalReviews,
      },
    });
  } catch (err) {
    console.error("Error adding meal review:", err);

    // Handle duplicate key error (unique index)
    if (err.code === 11000) {
      return res.status(400).json({
        message: "لقد قمت بتقييم هذه الوجبة من قبل",
      });
    }

    res.status(500).json({
      success: false,
      message: "فشل إضافة التقييم",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get all reviews for a specific meal
async function getMealReviews(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }
    const { mealId } = req.params;
    const { page = 1, limit = 10, sort = "newest" } = req.query;

    // Validate meal exists
    const meal = await Meal.findById(mealId);
    if (!meal) {
      return res.status(404).json({ message: "الوجبة غير موجودة" });
    }

    // Build filter
    const filter = {
      "meal.mealId": mealId,
      isActive: true,
    };

    // Build sort options
    let sortOption = {};
    switch (sort) {
      case "newest":
        sortOption.createdAt = -1;
        break;
      case "oldest":
        sortOption.createdAt = 1;
        break;
      case "rating_high":
        sortOption.rating = -1;
        break;
      case "rating_low":
        sortOption.rating = 1;
        break;
      default:
        sortOption.createdAt = -1;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const reviews = await MealReview.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalReviews = await MealReview.countDocuments(filter);

    // Get current meal stats
    const avgRatingResult = await MealReview.aggregate([
      {
        $match: {
          "meal.mealId": new mongoose.Types.ObjectId(mealId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const avgRating =
      avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;
    const totalCount =
      avgRatingResult.length > 0 ? avgRatingResult[0].totalReviews : 0;

    res.status(200).json({
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: skip + reviews.length < totalReviews,
        hasPrev: page > 1,
      },
      mealStats: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: totalCount,
        mealName: meal.name,
        mealId: meal._id,
      },
    });
  } catch (err) {
    console.error("Error getting meal reviews:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب التقييمات",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get all meal reviews by a specific client
async function getClientMealReviews(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }
    const { clientId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate client exists
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "العميل غير موجود" });
    }

    // Build filter
    const filter = {
      "client.clientId": clientId,
      isActive: true,
    };

    // Pagination
    const skip = (page - 1) * limit;

    const reviews = await MealReview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const totalReviews = await MealReview.countDocuments(filter);

    res.status(200).json({
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: skip + reviews.length < totalReviews,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getting client meal reviews:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب التقييمات",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get a specific meal review by ID
async function getMealReviewById(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }
    const review = await MealReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "التقييم غير موجود" });
    }

    if (!review.isActive) {
      return res.status(404).json({ message: "التقييم غير متاح" });
    }

    res.status(200).json(review);
  } catch (err) {
    console.error("Error getting meal review by ID:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب التقييم",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Update a meal review (only by the client who created it)
async function updateMealReview(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }
    const { rating, comment } = req.body;
    const reviewId = req.params.id;
    const clientId = req.user._id;

    // Find the review
    const review = await MealReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "التقييم غير موجود" });
    }

    // Check if the user is the one who created the review
    if (review.client.clientId.toString() !== clientId.toString()) {
      return res
        .status(403)
        .json({ message: "غير مصرح لك بتعديل هذا التقييم" });
    }

    // Validate rating if provided
    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({
          message: "التقييم يجب أن يكون رقمًا بين 1 و 5",
        });
      }
      review.rating = ratingNum;
    }

    // Validate comment if provided
    if (comment !== undefined) {
      if (comment.trim().length < 10) {
        return res.status(400).json({
          message: "التعليق يجب أن يكون 10 أحرف على الأقل",
        });
      }

      if (comment.trim().length > 500) {
        return res.status(400).json({
          message: "التعليق لا يمكن أن يتجاوز 500 حرف",
        });
      }
      review.comment = comment.trim();
    }

    // Save the updated review
    await review.save();

    // Update the meal's rating automatically
    const { newRating, totalReviews } = await updateMealRating(
      review.meal.mealId
    );

    res.status(200).json({
      message: "تم تحديث التقييم بنجاح",
      review,
      updatedMealStats: {
        newRating,
        totalReviews,
      },
    });
  } catch (err) {
    console.error("Error updating meal review:", err);
    res.status(500).json({
      success: false,
      message: "فشل في تحديث التقييم",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Delete a meal review (soft delete by setting isActive to false)
async function deleteMealReview(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }
    const reviewId = req.params.id;
    const clientId = req.user._id;

    // Find the review
    const review = await MealReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "التقييم غير موجود" });
    }

    // Check if the user is the one who created the review
    if (review.client.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذا التقييم" });
    }

    // Soft delete by setting isActive to false
    review.isActive = false;
    await review.save();

    // Update the meal's rating automatically
    const { newRating, totalReviews } = await updateMealRating(
      review.meal.mealId
    );

    res.status(200).json({
      message: "تم حذف التقييم بنجاح",
      updatedMealStats: {
        newRating,
        totalReviews,
      },
    });
  } catch (err) {
    console.error("Error deleting meal review:", err);
    res.status(500).json({
      success: false,
      message: "فشل في حذف التقييم",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get all meal reviews (admin function)
async function getAllMealReviews(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }
    const { page = 1, limit = 20, mealId, clientId, isActive } = req.query;

    // Build filter
    const filter = {};

    if (mealId) filter["meal.mealId"] = mealId;
    if (clientId) filter["client.clientId"] = clientId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Pagination
    const skip = (page - 1) * limit;

    const reviews = await MealReview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const totalReviews = await MealReview.countDocuments(filter);

    res.status(200).json({
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: skip + reviews.length < totalReviews,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getting all meal reviews:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب التقييمات",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

module.exports = {
  addMealReview,
  getMealReviews,
  getClientMealReviews,
  getMealReviewById,
  updateMealReview,
  deleteMealReview,
  getAllMealReviews,
  updateMealRating, // Export for potential external use
};
