const express = require("express");
const router = express.Router();
const checkRole = require("../middleware/roles");
const {
  createCharity,
  getAllCharities,
  updateCharity,
  deleteCharity,
} = require("../controllers/charityController");
const { protect, requireAdminRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// إضافة جمعية جديدة - للمدراء فقط
router.post(
  "/",
  protect,
  requireAdminRole,
  upload.single("image"),
  createCharity
);

// عرض كل الجمعيات - للجميع
router.get("/", getAllCharities);

// تعديل جمعية - للمدراء فقط
router.put(
  "/:id",
  protect,
  requireAdminRole,
  upload.single("image"),
  updateCharity
);

// حذف جمعية - للمدراء فقط
router.delete("/:id", protect, requireAdminRole, deleteCharity);

module.exports = router;
