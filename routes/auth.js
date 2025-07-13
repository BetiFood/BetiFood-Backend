const express = require("express");
const router = express.Router();
const {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/verify", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

module.exports = router;
