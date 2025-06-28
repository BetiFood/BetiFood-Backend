const multer = require("multer");
const path = require("path");

// التخزين على القرص
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // تأكدي أن هذا المسار موجود فعليًا
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Only images are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
