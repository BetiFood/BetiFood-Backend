const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;
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
    return res
      .status(201)
      .json({ message: "تم التسجيل بنجاح", userId: user._id });
  } catch (err) {
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
