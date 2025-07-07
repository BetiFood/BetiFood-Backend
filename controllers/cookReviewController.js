const CookReview = require("../models/CookReview");
const User = require("../models/User");
const mongoose = require("mongoose");

// Helper function to update cook rating
async function updateCookRating(cookId) {
  try {
    const avgRatingResult = await CookReview.aggregate([
      {
        $match: {
          "cook.cookId": new mongoose.Types.ObjectId(cookId),
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

    // Update the cook's rate and popularity
    await User.findByIdAndUpdate(cookId, {
      rate: newRating,
      popularity: totalReviews, // Using total reviews as popularity indicator
    });

    return { newRating, totalReviews };
  } catch (error) {
    console.error("Error updating cook rating:", error);
    throw error;
  }
}

// Add a new cook review
async function addCookReview(req, res) {
  try {
    const { cookId, rating, comment } = req.body;
    const clientId = req.user._id;

    // Validate required fields
    if (!cookId || !rating || !comment) {
      return res.status(400).json({
        message: "يجب إدخال جميع الحقول المطلوبة (cookId, rating, comment)",
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

    // Check if cook exists and is actually a cook
    const cook = await User.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "الطاهي غير موجود" });
    }

    if (cook.role !== "cook") {
      return res.status(400).json({ message: "المستخدم المحدد ليس طاهيًا" });
    }

    // Check if client is trying to review themselves
    if (clientId.toString() === cookId) {
      return res.status(400).json({ message: "لا يمكنك تقييم نفسك" });
    }

    // Check if client has already reviewed this cook
    const existingReview = await CookReview.findOne({
      "client.clientId": clientId,
      "cook.cookId": cookId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "لقد قمت بتقييم هذا الطاهي من قبل",
      });
    }

    // Create the review
    const review = await CookReview.create({
      client: {
        clientId: clientId,
        name: req.user.name,
      },
      cook: {
        cookId: cookId,
        name: cook.name,
      },
      rating: ratingNum,
      comment: comment.trim(),
    });

    // Update the cook's rating automatically
    const { newRating, totalReviews } = await updateCookRating(cookId);

    res.status(201).json({
      message: "تم إضافة التقييم بنجاح",
      review,
      updatedCookStats: {
        newRating,
        totalReviews,
      },
    });
  } catch (err) {
    console.error("Error adding cook review:", err);

    // Handle duplicate key error (unique index)
    if (err.code === 11000) {
      return res.status(400).json({
        message: "لقد قمت بتقييم هذا الطاهي من قبل",
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

// Get all reviews for a specific cook
async function getCookReviews(req, res) {
  try {
    const { cookId } = req.params;
    const { page = 1, limit = 10, sort = "newest" } = req.query;

    // Validate cook exists
    const cook = await User.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "الطاهي غير موجود" });
    }

    // Build filter
    const filter = {
      "cook.cookId": cookId,
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

    const reviews = await CookReview.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalReviews = await CookReview.countDocuments(filter);

    // Calculate average rating
    const avgRatingResult = await CookReview.aggregate([
      {
        $match: {
          "cook.cookId": new mongoose.Types.ObjectId(cookId),
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
      stats: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: totalCount,
      },
    });
  } catch (err) {
    console.error("Error getting cook reviews:", err);
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

// Get all reviews by a specific client
async function getClientReviews(req, res) {
  try {
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

    const reviews = await CookReview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const totalReviews = await CookReview.countDocuments(filter);

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
    console.error("Error getting client reviews:", err);
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

// Get a specific review by ID
async function getCookReviewById(req, res) {
  try {
    const review = await CookReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "التقييم غير موجود" });
    }

    if (!review.isActive) {
      return res.status(404).json({ message: "التقييم غير متاح" });
    }

    res.status(200).json(review);
  } catch (err) {
    console.error("Error getting cook review by ID:", err);
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

// Update a review (only by the client who created it)
async function updateCookReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const reviewId = req.params.id;
    const clientId = req.user._id;

    // Find the review
    const review = await CookReview.findById(reviewId);
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

    // Update the cook's rating automatically
    const { newRating, totalReviews } = await updateCookRating(
      review.cook.cookId
    );

    res.status(200).json({
      message: "تم تحديث التقييم بنجاح",
      review,
      updatedCookStats: {
        newRating,
        totalReviews,
      },
    });
  } catch (err) {
    console.error("Error updating cook review:", err);
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

// Delete a review (soft delete by setting isActive to false)
async function deleteCookReview(req, res) {
  try {
    const reviewId = req.params.id;
    const clientId = req.user._id;

    // Find the review
    const review = await CookReview.findById(reviewId);
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

    // Update the cook's rating automatically
    const { newRating, totalReviews } = await updateCookRating(
      review.cook.cookId
    );

    res.status(200).json({
      message: "تم حذف التقييم بنجاح",
      updatedCookStats: {
        newRating,
        totalReviews,
      },
    });
  } catch (err) {
    console.error("Error deleting cook review:", err);
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

// Get all reviews (admin function)
async function getAllCookReviews(req, res) {
  try {
    const { page = 1, limit = 20, cookId, clientId, isActive } = req.query;

    // Build filter
    const filter = {};

    if (cookId) filter["cook.cookId"] = cookId;
    if (clientId) filter["client.clientId"] = clientId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Pagination
    const skip = (page - 1) * limit;

    const reviews = await CookReview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const totalReviews = await CookReview.countDocuments(filter);

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
    console.error("Error getting all cook reviews:", err);
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
  addCookReview,
  getCookReviews,
  getClientReviews,
  getCookReviewById,
  updateCookReview,
  deleteCookReview,
  getAllCookReviews,
  updateCookRating, // Export for potential external use
};
