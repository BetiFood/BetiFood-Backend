const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({ 
        success: false, 
        message: "يجب تسجيل الدخول أولاً" 
      });
    }
    
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: "غير مصرح لك بالوصول لهذا المورد" 
      });
    }
    
    next();
  };
};

module.exports = checkRole; 