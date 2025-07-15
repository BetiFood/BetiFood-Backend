const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "غير مصرح" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "توكن غير صالح" });
  }
}

function requireCookRole(req, res, next) {
  if (req.user && req.user.role === "cook") {
    return next();
  }
  return res.status(403).json({ message: "يجب أن تكون طباخًا لإضافة وجبة" });
}

function requireClientRole(req, res, next) {
  if (req.user && req.user.role === "client") {
    return next();
  }
  return res
    .status(403)
    .json({ message: "يجب أن تكون عميلًا للوصول إلى هذا المورد" });
}

function requireAdminRole(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res
    .status(403)
    .json({ message: "يجب أن تكون مديرًا للوصول إلى هذا المورد" });
}

function notDelivery(req, res, next) {
  if (req.user && req.user.role === "delivery") {
    return res
      .status(403)
      .json({ message: "غير مصرح لمندوبي التوصيل بالوصول إلى هذا المورد" });
  }
  next();
}

function requireDeliveryRole(req, res, next) {
  if (req.user && req.user.role === "delivery") {
    return next();
  }
  return res.status(403).json({ message: "يجب أن تكون مندوب توصيل للوصول إلى هذا المورد" });
}

module.exports = {
  protect,
  requireCookRole,
  requireClientRole,
  requireAdminRole,
  notDelivery,
  requireDeliveryRole,
};
