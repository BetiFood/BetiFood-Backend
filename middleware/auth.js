const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "يجب تسجيل الدخول أولاً" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, message: "المستخدم غير موجود" });
    
    // إضافة معلومات المستخدم والدور للطلب
    req.user = user;
    req.userId = user._id.toString(); // تحويل إلى string
    req.userRole = user.role;
    
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "توكن غير صالح" });
  }
};

module.exports = authenticate; 