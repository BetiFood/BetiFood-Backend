const User = require("../models/User");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;

// Helper function to transform user data based on role
function transformUserData(user) {
  const userObj = user.toObject ? user.toObject() : user;
  if (userObj.role !== "cook") {
    delete userObj.rate;
    delete userObj.popularity;
  }
  return userObj;
}

// Helper function to transform array of users
function transformUsersData(users) {
  return users.map((user) => transformUserData(user));
}

// Get all cooks (public endpoint)
async function getAllCooks(req, res) {
  try {
    const { page = 1, limit = 10, sort = "newest" } = req.query;

    // Build filter for cooks only
    const filter = {
      role: "cook",
      isVerified: true,
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
        sortOption.rate = -1;
        break;
      case "rating_low":
        sortOption.rate = 1;
        break;
      case "popularity_high":
        sortOption.popularity = -1;
        break;
      case "popularity_low":
        sortOption.popularity = 1;
        break;
      default:
        sortOption.createdAt = -1;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const cooks = await User.find(filter)
      .select("-password -__v")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalCooks = await User.countDocuments(filter);

    // Calculate average rating and total popularity
    const stats = await User.aggregate([
      { $match: { role: "cook", isVerified: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rate" },
          totalPopularity: { $sum: "$popularity" },
          totalCooks: { $sum: 1 },
        },
      },
    ]);

    const avgRating =
      stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
    const totalPopularity = stats.length > 0 ? stats[0].totalPopularity : 0;

    res.status(200).json({
      cooks: transformUsersData(cooks),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCooks / limit),
        totalCooks,
        hasNext: skip + cooks.length < totalCooks,
        hasPrev: page > 1,
      },
      stats: {
        averageRating: avgRating,
        totalPopularity: totalPopularity,
        totalCooks: totalCooks,
      },
    });
  } catch (err) {
    console.error("Error getting cooks:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب الطهاة",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get top rated cooks (public endpoint)
async function getTopRatedCooks(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Build filter for cooks only with minimum rating
    const filter = {
      role: "cook",
      isVerified: true,
      rate: { $gte: 1.0 }, // Only cooks with at least one review
    };

    // Sort by rating (highest first)
    const sortOption = { rate: -1, popularity: -1 };

    // Pagination
    const skip = (page - 1) * limit;

    const cooks = await User.find(filter)
      .select("-password -__v")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalCooks = await User.countDocuments(filter);

    res.status(200).json({
      cooks: transformUsersData(cooks),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCooks / limit),
        totalCooks,
        hasNext: skip + cooks.length < totalCooks,
        hasPrev: page > 1,
      },
      sortBy: "rating_high",
    });
  } catch (err) {
    console.error("Error getting top rated cooks:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب أفضل الطهاة تقييماً",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get most popular cooks (public endpoint)
async function getMostPopularCooks(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Build filter for cooks only with minimum popularity
    const filter = {
      role: "cook",
      isVerified: true,
      popularity: { $gte: 1.0 }, // Only cooks with at least one review
    };

    // Sort by popularity (highest first)
    const sortOption = { popularity: -1, rate: -1 };

    // Pagination
    const skip = (page - 1) * limit;

    const cooks = await User.find(filter)
      .select("-password -__v")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalCooks = await User.countDocuments(filter);

    res.status(200).json({
      cooks: transformUsersData(cooks),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCooks / limit),
        totalCooks,
        hasNext: skip + cooks.length < totalCooks,
        hasPrev: page > 1,
      },
      sortBy: "popularity_high",
    });
  } catch (err) {
    console.error("Error getting most popular cooks:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب أكثر الطهاة شعبية",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get user profile (authenticated user)
async function getUserProfile(req, res) {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    res.status(200).json({
      user: transformUserData(user),
    });
  } catch (err) {
    console.error("Error getting user profile:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب الملف الشخصي",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Upload user profile image
async function uploadUserImage(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ success: false, message: "يجب تسجيل الدخول أولاً" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "يجب رفع صورة واحدة" });
    }

    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    let imageUrl;

    // Handle image upload based on storage type
    if (req.file.path) {
      // Cloudinary storage - file already uploaded
      imageUrl = req.file.path;
    } else {
      // Memory storage - need to upload to Cloudinary
      try {
        const result = await cloudinary.uploader.upload(
          `data:${req.file.mimetype};base64,${req.file.buffer.toString(
            "base64"
          )}`,
          {
            folder: "users",
            transformation: [
              { width: 300, height: 300, crop: "fill", gravity: "face" },
              { quality: "auto" },
            ],
          }
        );
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Error uploading to Cloudinary:", uploadError);
        return res.status(500).json({
          message: "فشل في رفع الصورة",
          error: "Cloudinary upload failed",
        });
      }
    }

    // Update user with new image
    user.image = imageUrl;
    await user.save();

    res.status(200).json({
      message: "تم رفع الصورة بنجاح",
      image: imageUrl,
      user: transformUserData(user),
    });
  } catch (err) {
    console.error("Error uploading user image:", err);
    res.status(500).json({
      success: false,
      message: "فشل في رفع الصورة",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Update user profile (authenticated user)
async function updateUserProfile(req, res) {
  try {
    const userId = req.user._id;
    const {
      name,
      phone,
      address,
      currentPassword,
      newPassword,
      confirmNewPassword,
    } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Handle image upload if file is provided
    if (req.file) {
      let imageUrl;

      // Handle image upload based on storage type
      if (req.file.path) {
        // Cloudinary storage - file already uploaded
        imageUrl = req.file.path;
      } else {
        // Memory storage - need to upload to Cloudinary
        try {
          const result = await cloudinary.uploader.upload(
            `data:${req.file.mimetype};base64,${req.file.buffer.toString(
              "base64"
            )}`,
            {
              folder: "users",
              transformation: [
                { width: 300, height: 300, crop: "fill", gravity: "face" },
                { quality: "auto" },
              ],
            }
          );
          imageUrl = result.secure_url;
        } catch (uploadError) {
          console.error("Error uploading to Cloudinary:", uploadError);
          return res.status(500).json({
            message: "فشل في رفع الصورة",
            error: "Cloudinary upload failed",
          });
        }
      }

      user.image = imageUrl;
    }

    // Update basic info if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    // Handle password change if provided
    if (currentPassword && newPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "كلمة المرور الحالية غير صحيحة" });
      }

      // Validate new password
      if (newPassword !== confirmNewPassword) {
        return res
          .status(400)
          .json({ message: "كلمتا المرور الجديدتان غير متطابقتين" });
      }

      // Password strength validation
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message:
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم وحرف خاص",
        });
      }

      // Hash new password
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Save updated user
    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(userId).select("-password -__v");

    res.status(200).json({
      message: "تم تحديث الملف الشخصي بنجاح",
      user: transformUserData(updatedUser),
    });
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).json({
      success: false,
      message: "فشل في تحديث الملف الشخصي",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get cook by ID (public endpoint)
async function getCookById(req, res) {
  try {
    const { cookId } = req.params;

    const cook = await User.findOne({
      _id: cookId,
      role: "cook",
      isVerified: true,
    }).select("-password -__v");

    if (!cook) {
      return res.status(404).json({ message: "الطاهي غير موجود" });
    }

    res.status(200).json({
      cook: transformUserData(cook),
    });
  } catch (err) {
    console.error("Error getting cook by ID:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب بيانات الطاهي",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Delete user profile (authenticated user)
async function deleteUserProfile(req, res) {
  try {
    const userId = req.user._id;
    const { password, confirmPassword } = req.body;

    // Validate required fields
    if (!password || !confirmPassword) {
      return res.status(400).json({
        message: "يجب إدخال كلمة المرور وتأكيدها لحذف الحساب",
      });
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "كلمتا المرور غير متطابقتين",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "كلمة المرور غير صحيحة",
      });
    }

    // Check if user has active orders (optional business logic)
    // You can add checks here for orders, reviews, etc.

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "تم حذف الحساب بنجاح",
      deletedUser: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error deleting user profile:", err);
    res.status(500).json({
      success: false,
      message: "فشل في حذف الحساب",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Submit verification documents (for cook and delivery users)
async function submitVerification(req, res) {
  try {
    const userId = req.user._id;
    const { nationalId } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Check if user is cook or delivery
    if (user.role !== "cook" && user.role !== "delivery") {
      return res.status(400).json({
        message: "التحقق مطلوب فقط للمطاعم وموظفي التوصيل",
      });
    }

    // Check if verification already exists
    if (user.verification && user.verification.status !== "rejected") {
      return res.status(400).json({
        message: "تم تقديم طلب التحقق بالفعل",
      });
    }

    // Handle document uploads
    let idCardFrontImage = null;
    let idCardBackImage = null;
    let criminalRecord = null;

    // Process uploaded files
    if (req.files) {
      if (req.files.idCardFront && req.files.idCardFront[0]) {
        idCardFrontImage =
          req.files.idCardFront[0].path || req.files.idCardFront[0].secure_url;
      }
      if (req.files.idCardBack && req.files.idCardBack[0]) {
        idCardBackImage =
          req.files.idCardBack[0].path || req.files.idCardBack[0].secure_url;
      }
      if (req.files.criminalRecord && req.files.criminalRecord[0]) {
        criminalRecord =
          req.files.criminalRecord[0].path ||
          req.files.criminalRecord[0].secure_url;
      }
    }

    // Validate required documents
    if (!idCardFrontImage || !idCardBackImage || !criminalRecord) {
      return res.status(400).json({
        message:
          "يجب رفع جميع المستندات المطلوبة (صورة البطاقة الأمامية والخلفية وسجل جنائي)",
      });
    }

    // Update user verification
    user.verification = {
      nationalId,
      idCardFrontImage,
      idCardBackImage,
      criminalRecord,
      status: "pending",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewNotes: null,
      reviewedBy: null,
    };

    await user.save();

    res.status(200).json({
      message: "تم تقديم طلب التحقق بنجاح",
      verification: user.verification,
    });
  } catch (err) {
    console.error("Error submitting verification:", err);
    res.status(500).json({
      success: false,
      message: "فشل في تقديم طلب التحقق",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get verification status (for authenticated user)
async function getVerificationStatus(req, res) {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Check if user is cook or delivery
    if (user.role !== "cook" && user.role !== "delivery") {
      return res.status(400).json({
        message: "التحقق مطلوب فقط للمطاعم وموظفي التوصيل",
      });
    }

    res.status(200).json({
      verification: user.verification || null,
      isVerified: user.isVerified,
    });
  } catch (err) {
    console.error("Error getting verification status:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب حالة التحقق",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Get all pending verifications (admin only)
async function getPendingVerifications(req, res) {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build filter
    const filter = {
      $or: [{ role: "cook" }, { role: "delivery" }],
      "verification.status": status || "pending",
    };

    // Pagination
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select("-password -__v")
      .sort({ "verification.submittedAt": -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);

    res.status(200).json({
      verifications: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verification: user.verification,
      })),
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: skip + users.length < totalUsers,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error getting pending verifications:", err);
    res.status(500).json({
      success: false,
      message: "فشل في جلب طلبات التحقق",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

// Review verification (admin only)
async function reviewVerification(req, res) {
  try {
    const { userId } = req.params;
    const { status, reviewNotes } = req.body;
    const adminId = req.user._id;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "الحالة يجب أن تكون approved أو rejected",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Check if user has verification
    if (!user.verification) {
      return res.status(400).json({
        message: "المستخدم لم يقدم طلب تحقق",
      });
    }

    // Update verification
    user.verification.status = status;
    user.verification.reviewedAt = new Date();
    user.verification.reviewNotes = reviewNotes;
    user.verification.reviewedBy = adminId;

    // Update isVerified based on status
    if (status === "approved") {
      user.isVerified = true;
    } else {
      user.isVerified = false;
    }

    await user.save();

    res.status(200).json({
      message: `تم ${
        status === "approved" ? "الموافقة على" : "رفض"
      } طلب التحقق بنجاح`,
      verification: user.verification,
    });
  } catch (err) {
    console.error("Error reviewing verification:", err);
    res.status(500).json({
      success: false,
      message: "فشل في مراجعة طلب التحقق",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    });
  }
}

module.exports = {
  getAllCooks,
  getTopRatedCooks,
  getMostPopularCooks,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getCookById,
  uploadUserImage,
  submitVerification,
  getVerificationStatus,
  getPendingVerifications,
  reviewVerification,
};
