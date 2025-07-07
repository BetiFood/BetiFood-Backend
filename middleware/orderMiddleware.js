const { protect } = require('./authMiddleware');

// Middleware للتحقق من أن المستخدم مسجل دخول
const requireAuth = protect;

// Middleware للتحقق من أن المستخدم عميل (client)
function requireClientRole(req, res, next) {
  if (req.user && req.user.role === "client") {
    return next();
  }
  return res.status(403).json({ 
    message: "يجب أن تكون عميلاً للوصول إلى هذا المورد" 
  });
}

// Middleware للتحقق من أن المستخدم طباخ أو delivery
function requireCookOrDelivery(req, res, next) {
  if (req.user && (req.user.role === "cook" || req.user.role === "delivery")) {
    return next();
  }
  return res.status(403).json({ 
    message: "يجب أن تكون طباخاً أو مندوب توصيل للوصول إلى هذا المورد" 
  });
}

// Middleware للتحقق من أن المستخدم طباخ
function requireCookRole(req, res, next) {
  if (req.user && req.user.role === "cook") {
    return next();
  }
  return res.status(403).json({ 
    message: "يجب أن تكون طباخاً للوصول إلى هذا المورد" 
  });
}

// Middleware للتحقق من أن المستخدم delivery
function requireDeliveryRole(req, res, next) {
  if (req.user && req.user.role === "delivery") {
    return next();
  }
  return res.status(403).json({ 
    message: "يجب أن تكون مندوب توصيل للوصول إلى هذا المورد" 
  });
}

module.exports = {
  requireAuth,
  requireClientRole,
  requireCookOrDelivery,
  requireCookRole,
  requireDeliveryRole
}; 