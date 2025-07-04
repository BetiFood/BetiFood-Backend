// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "غير مصرح. للمديرين فقط." });
  }
};

module.exports = { isAdmin };
