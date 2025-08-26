const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const { avatarUploadMiddleware } = require("../middleware/upload");
const {
  validateEmail,
  validateOTP,
  validateSignup,
  validateProfileUpdate,
  validateRefreshToken,
  validateResendOTP,
} = require("../middleware/validation");
const { handleAvatarUpload } = require("../middleware/cloudinaryUpload");

// OTP Routes
router.post("/signup/send-otp", validateEmail, authController.sendSignupOTP);
router.post(
  "/signup/verify-otp",
  [validateEmail, validateOTP, validateSignup],
  authController.verifySignupOTP
);
router.post("/login/send-otp", validateEmail, authController.sendLoginOTP);
router.post(
  "/login/verify-otp",
  [validateEmail, validateOTP],
  authController.verifyLoginOTP
);
router.post("/resend-otp", validateResendOTP, authController.resendOTP);

// Token Management
router.post(
  "/refresh-token",
  validateRefreshToken,
  authController.refreshToken
);

// Protected Profile Routes
router.get("/profile", authenticateToken, authController.getProfile);
router.put(
  "/profile",
  [authenticateToken, handleAvatarUpload, validateProfileUpdate],
  authController.updateProfile
);

// Logout & Account Management
router.post("/logout", authenticateToken, authController.logout);
router.delete(
  "/deactivate",
  authenticateToken,
  authController.deactivateAccount
);

module.exports = router;
