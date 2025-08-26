const multer = require("multer");
const { storage } = require("../config/cloudinary");

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
const handleAvatarUpload = (req, res, next) => {
  const uploadSingle = upload.single("avatar");

  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size too large. Maximum size is 5MB.",
          });
        }
        return res.status(400).json({
          success: false,
          message: "File upload error: " + err.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // If file was uploaded, add the Cloudinary URL to request
    if (req.file) {
      req.processedAvatar = req.file.path; // Cloudinary URL
    }

    next();
  });
};

module.exports = {
  handleAvatarUpload,
};
