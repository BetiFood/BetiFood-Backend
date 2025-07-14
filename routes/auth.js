const express = require("express");
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/verify", verifyEmail);
router.post(
  "/forget-password",
  require("../controllers/authController").forgotPassword
);
router.post(
  "/reset-password",
  require("../controllers/authController").resetPassword
);

module.exports = router;
