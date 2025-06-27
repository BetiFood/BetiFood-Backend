const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Recommended password regex: Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, address, role } =
      req.body;
    // Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    // Password validation
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم وحرف خاص",
      });
    }
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      role,
    });
    await user.save();
    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    // Prepare to send verification email
    const verificationUrl = `https://yourdomain.com/api/auth/verify?token=${verificationToken}`;
    // Configure nodemailer transporter (example using Gmail, replace with your SMTP settings)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    // Send mail
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Email Verification",
      html: `<p>Please verify your email by clicking the link below:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
    });
    return res.status(201).json({
      message: "تم التسجيل بنجاح",
      userId: user._id,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "حدث خطأ أثناء التسجيل" });
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
    return res.status(400).json({ message: "Verification token is missing." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
    // Redirect to frontend login page
    return res.redirect("http://localhost:5174/login");
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }
};
