const User = require("../models/User");
const { deleteOldAvatar } = require("../middleware/upload");
const {
  createAndSendOTP,
  verifyOTP,
  resendOTP,
} = require("../services/otpService");
const {
  findOrCreateUser,
  handleFailedLogin,
  sanitizeUser,
  generateTokens,
  refreshAccessToken,
  updateUserProfile,
  deactivateUser,
} = require("../services/authService");

// Send OTP for signup
const sendSignupOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Send OTP
    const result = await createAndSendOTP(email, "signup");

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Send signup OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// Verify signup OTP and create account
const verifySignupOTP = async (req, res) => {
  try {
    const { email, otp, userData = {} } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Verify OTP
    const otpResult = await verifyOTP(email, otp, "signup");

    if (!otpResult.success) {
      return res.status(400).json(otpResult);
    }

    // Create or update user
    const user = await findOrCreateUser(email, {
      isEmailVerified: true,
      ...userData,
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    console.error("Verify signup OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP and create account",
    });
  }
};

// Send OTP for login
const sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message:
          "Account is temporarily locked due to multiple failed attempts",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Send OTP
    const result = await createAndSendOTP(email, "login");

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Send login OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// Verify login OTP and authenticate
const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Verify OTP
    const otpResult = await verifyOTP(email, otp, "login");

    if (!otpResult.success) {
      // Handle failed login attempt
      await handleFailedLogin(email);
      return res.status(400).json(otpResult);
    }

    // Get user
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found or account deactivated",
      });
    }

    // Update last login and reset failed attempts
    user.lastLogin = new Date();
    await user.save();

    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP and login",
    });
  }
};

// Resend OTP
const resendOTPHandler = async (req, res) => {
  try {
    const { email, type = "login" } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate type
    const validTypes = ["signup", "login"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP type",
      });
    }

    const result = await resendOTP(email, type);

    if (!result.success) {
      return res.status(429).json(result);
    }

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

// Refresh access token
const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const result = await refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

// Update user profile with avatar support
// const updateProfile = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     let updates = { ...req.body };

//     // Handle processed avatar from middleware
//     if (req.processedAvatar) {
//       updates = {
//         ...updates,
//         profile: {
//           ...updates.profile,
//           avatar: req.processedAvatar
//         }
//       };
//     }

//     // Update user profile using the service
//     const updatedUser = await updateUserProfile(userId, updates);

//     res.status(200).json({
//       success: true,
//       message: "Profile updated successfully",
//       data: {
//         user: updatedUser,
//       },
//     });
//   } catch (error) {
//     // Clean up uploaded file if profile update fails
//     if (req.processedAvatar) {
//       await deleteOldAvatar(req.processedAvatar);
//     }
    
//     console.error("Update profile error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message || "Failed to update profile",
//     });
//   }
// };
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    let updates = { ...req.body };

    // Handle uploaded avatar from Cloudinary
    if (req.processedAvatar) {
      updates = {
        ...updates,
        profile: {
          ...updates.profile,
          avatar: req.processedAvatar // This is now the Cloudinary URL
        }
      };
    }

    // Update user profile using the service
    const updatedUser = await updateUserProfile(userId, updates);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

// Logout (client-side token removal, but can be used for logging)
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // But we can log the action or implement token blacklisting if needed

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

// Deactivate account
const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    await deactivateUser(userId);

    res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate account error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate account",
    });
  }
};

module.exports = {
  sendSignupOTP,
  verifySignupOTP,
  sendLoginOTP,
  verifyLoginOTP,
  resendOTP: resendOTPHandler,
  refreshToken: refreshTokenHandler,
  getProfile,
  updateProfile,
  logout,
  deactivateAccount,
};