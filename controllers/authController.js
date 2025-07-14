const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler.js");
const { sendEmail } = require("../utils/sendMail.js");
const {
  generateActivationEmail,
  generateResetPasswordEmail,
} = require("../utils/generateHTML.js");
const crypto = require("crypto");

// Recommended password regex: Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, address, role } =
      req.body;

    // Prevent users from setting isVerified
    if (req.body.isVerified !== undefined) {
      return res.status(403).json({ message: "لا يمكن تعيين حالة التحقق" });
    }

    // تأكيد تطابق كلمتي المرور
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "كلمتا المرور غير متطابقتين" });
    }
    // تحقق من قوة كلمة المرور
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم وحرف خاص",
      });
    }
    // تحقق من وجود البريد الإلكتروني مسبقًا
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);
    // إنشاء المستخدم وحفظه
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      role,
    });
    await user.save();
    // إنشاء رمز التحقق بعد حفظ المستخدم
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    // إعداد رابط التحقق للواجهة الأمامية
    const verificationUrl = `http://localhost:5174/confirm-email?token=${verificationToken}`;
    try {
      await sendEmail({
        to: email,
        subject: "تفعيل البريد الإلكتروني",
        html: generateActivationEmail(verificationUrl),
      });
    } catch (emailErr) {
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        message:
          "فشل إرسال البريد الإلكتروني. تحقق من إعدادات البريد الإلكتروني",
        error: emailErr.message,
      });
    }
    return res.status(201).json({
      message:
        "تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
      userId: user._id,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء التسجيل", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        message: "يرجى تفعيل بريدك الإلكتروني أولاً لتتمكن من تسجيل الدخول",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.status(200).json({
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء تسجيل الدخول" });
  }
};

exports.verifyEmail = async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ message: "رمز التحقق مفقود" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: "المستخدم غير موجود" });
    }
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
    return res
      .status(200)
      .json({ message: "تم تفعيل البريد الإلكتروني بنجاح", userId: user._id });
  } catch (err) {
    return res
      .status(400)
      .json({ message: "رمز التحقق غير صالح أو منتهي الصلاحية" });
  }
};

// Forgot Password: Send reset link
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "يرجى إدخال البريد الإلكتروني" });
  }
  try {
    const user = await User.findOne({ email });
    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(expires);
      await user.save();
      // Prepare reset link
      const resetUrl = `http://localhost:5174/reset-password?token=${token}`;
      // Send email (use your sendEmail utility)
      try {
        await sendEmail({
          to: user.email,
          subject: "إعادة تعيين كلمة المرور",
          html: generateResetPasswordEmail(resetUrl),
        });
      } catch (emailErr) {
        return res
          .status(500)
          .json({
            message: "فشل إرسال البريد الإلكتروني",
            error: emailErr.message,
          });
      }
    }
    // Always respond with generic message
    return res.status(200).json({
      message:
        "إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة لإعادة تعيين كلمة المرور.",
    });
  } catch (err) {
    return res.status(500).json({
      message: "حدث خطأ أثناء إرسال رابط إعادة التعيين",
      error: err.message,
    });
  }
};

// Reset Password: Set new password
exports.resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ message: "جميع الحقول مطلوبة" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "كلمتا المرور غير متطابقتين" });
  }
  // Password strength validation (same as registration)
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم وحرف خاص",
    });
  }
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: "رمز إعادة التعيين غير صالح أو منتهي الصلاحية" });
    }
    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    return res.status(200).json({
      message:
        "تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    });
  } catch (err) {
    return res.status(500).json({
      message: "حدث خطأ أثناء إعادة تعيين كلمة المرور",
      error: err.message,
    });
  }
};
