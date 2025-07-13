const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require("path");

// Check if Cloudinary environment variables are set
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("❌ Cloudinary environment variables are missing!");
  console.error(
    "Please set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
  );
  console.log(
    "🔄 Falling back to memory storage for serverless environment..."
  );

  // Use memory storage for serverless environments
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const ext = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error("Only images (JPEG, PNG) and PDF files are allowed"));
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for documents
  });

  module.exports = upload;
} else {
  console.log(
    "✅ Cloudinary configured successfully for verification documents!"
  );

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Cloudinary storage configuration for verification documents
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "verification-documents",
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      transformation: [{ quality: "auto" }],
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const ext = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error("Only images (JPEG, PNG) and PDF files are allowed"));
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for documents
  });

  module.exports = upload;
}
