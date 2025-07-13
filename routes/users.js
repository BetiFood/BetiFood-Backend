const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const upload = require("../middleware/userUploadMiddleware");
const verificationUpload = require("../middleware/verificationUploadMiddleware");

// Public routes (no authentication required)
router.get("/cooks", getAllCooks);
router.get("/cooks/top-rated", getTopRatedCooks);
router.get("/cooks/most-popular", getMostPopularCooks);
router.get("/cooks/:cookId", getCookById);

// Protected routes (authentication required)
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.delete("/profile", protect, deleteUserProfile);

// Image upload routes
router.post("/upload-image", protect, upload.single("image"), uploadUserImage);
router.put(
  "/profile-with-image",
  protect,
  upload.single("image"),
  updateUserProfile
);

// Verification routes (for cook and delivery users)
router.post(
  "/verification",
  protect,
  verificationUpload.fields([
    { name: "idCardFront", maxCount: 1 },
    { name: "idCardBack", maxCount: 1 },
    { name: "criminalRecord", maxCount: 1 },
  ]),
  submitVerification
);
router.get("/verification/status", protect, getVerificationStatus);

// Admin verification routes
router.get("/admin/verifications", protect, admin, getPendingVerifications);
router.put("/admin/verifications/:userId", protect, admin, reviewVerification);

module.exports = router;
