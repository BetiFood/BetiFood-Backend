const express = require("express");
const router = express.Router();
const charityController = require("../controllers/charityController");
const checkRole = require("../middleware/roles");
const auth = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { createDonation, createDonationToCook, createDonationMeal } = require('../controllers/charityController');
const { protect } = require('../middleware/authMiddleware');

router.post(
  "/",
  auth,
  checkRole("admin"),
  upload.single("image"),
  charityController.createCharity
);
router.get("/", charityController.getAllCharities);
router.put(
  "/:id",
  auth,
  checkRole("admin"),
  upload.single("image"),
  charityController.updateCharity
);
router.delete(
  "/:id",
  auth,
  checkRole("admin"),
  charityController.deleteCharity
);
router.post('/donate', protect, createDonation);
router.post('/donate-cook', protect, createDonationToCook);
router.post('/donate-meal', protect, createDonationMeal);

router.get('/:id/donations', protect, checkRole('admin'), charityController.getCharityDonations);

module.exports = router;
