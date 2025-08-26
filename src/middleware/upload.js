const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const sharp = require("sharp");

// Configure multer for avatar uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for handling single avatar upload
const uploadAvatar = upload.single('avatar');

// Helper function to process and save avatar image
const processAvatarImage = async (file, userId) => {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `avatar_${userId}_${timestamp}.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Process image with sharp
    await sharp(file.buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Return the public URL path
    return `/uploads/avatars/${filename}`;
  } catch (error) {
    console.error('Error processing avatar image:', error);
    throw new Error('Failed to process avatar image');
  }
};

// Helper function to delete old avatar file
const deleteOldAvatar = async (avatarPath) => {
  try {
    if (avatarPath && !avatarPath.startsWith('http')) {
      const fullPath = path.join(process.cwd(), 'public', avatarPath);
      await fs.unlink(fullPath);
    }
  } catch (error) {
    // Ignore errors when deleting old files
    console.log('Could not delete old avatar:', error.message);
  }
};

// Middleware wrapper for avatar upload with error handling
const handleAvatarUpload = (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum size is 5MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

// Middleware for processing uploaded avatar
const processAvatar = async (req, res, next) => {
  try {
    if (req.file) {
      const userId = req.user._id;
      
      // Process and save the new avatar
      const avatarUrl = await processAvatarImage(req.file, userId);
      
      // Delete old avatar if it exists
      if (req.user.profile?.avatar) {
        await deleteOldAvatar(req.user.profile.avatar);
      }
      
      // Add avatar URL to request for controller to use
      req.processedAvatar = avatarUrl;
    }
    next();
  } catch (error) {
    console.error('Avatar processing error:', error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to process avatar image",
    });
  }
};

// Combined middleware for complete avatar handling
const avatarUploadMiddleware = [handleAvatarUpload, processAvatar];

module.exports = {
  uploadAvatar,
  handleAvatarUpload,
  processAvatar,
  avatarUploadMiddleware,
  processAvatarImage,
  deleteOldAvatar,
};