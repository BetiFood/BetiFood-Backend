const express = require("express");
const router = express.Router();
const charityController = require("../controllers/charityController");
const checkRole = require("../middleware/roles");
const auth = require("../middleware/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  auth,
  checkRole("admin"),
  upload.single("image"),
  charityController.createCharity
);
router.get("/", charityController.getAllCharities);
router.get('/:id', charityController.getCharityById);
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

module.exports = router;
