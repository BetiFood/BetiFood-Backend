const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "غير مصرح" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "غير مصرح" });
  }
}

function requireCookRole(req, res, next) {
  if (req.user && req.user.role === "cook") {
    return next();
  }
  return res.status(403).json({ message: "يجب أن تكون طباخًا لإضافة وجبة" });
}

module.exports = { verifyToken, requireCookRole };
