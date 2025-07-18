const express = require("express");
const router = express.Router();
const { createBeneficiary, activateBeneficiary, deactivateBeneficiary } = require("../controllers/beneficiaryController");
const { protect, requireAdminRole } = require("../middleware/authMiddleware");

function allowCookOrDeliveryOrAdmin(req, res, next) {
  if (req.user && (req.user.role === "admin" || req.user.role === "cook" || req.user.role === "delivery")) {
    return next();
  }
  return res.status(403).json({ message: "غير مصرح لك بإضافة مستفيد" });
}

router.post("/", protect, allowCookOrDeliveryOrAdmin, createBeneficiary);
router.patch("/:id/activate", protect, requireAdminRole, activateBeneficiary);
router.patch("/:id/deactivate", protect, requireAdminRole, deactivateBeneficiary);

module.exports = router; 