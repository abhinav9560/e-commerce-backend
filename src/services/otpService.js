const crypto = require('crypto');
const OTP = require('../models/Otp');
const { sendOTP } = require('./emailService');

const generateOTP = (length = 6) => {
  // Generate a cryptographically secure random number
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  
  let otp;
  do {
    const randomBytes = crypto.randomBytes(4);
    const randomNum = randomBytes.readUInt32BE(0);
    otp = (randomNum % (max - min + 1)) + min;
  } while (otp.toString().length !== length);
  
  return otp.toString();
};

const createAndSendOTP = async (email, type = 'login') => {
  try {
    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email, type });
    
    // Generate new OTP
    const otpCode = generateOTP();
    
    // Create OTP record
    const otp = new OTP({
      email,
      otp: otpCode,
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    await otp.save();
    
    // Send email
    await sendOTP(email, otpCode, type);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt: otp.expiresAt
    };
    
  } catch (error) {
    console.error('OTP creation error:', error);
    throw new Error('Failed to send OTP');
  }
};

const verifyOTP = async (email, otpCode, type = 'login') => {
  try {
    // Find the most recent valid OTP
    const otpRecord = await OTP.findOne({
      email,
      type,
      isUsed: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return {
        success: false,
        message: 'OTP not found or has been used'
      };
    }

    // Check if OTP can be attempted
    if (!otpRecord.canAttempt()) {
      if (otpRecord.isExpired()) {
        return {
          success: false,
          message: 'OTP has expired'
        };
      }
      if (otpRecord.attempts >= 3) {
        return {
          success: false,
          message: 'Maximum attempts exceeded'
        };
      }
      if (otpRecord.isUsed) {
        return {
          success: false,
          message: 'OTP has already been used'
        };
      }
    }

    // Check if OTP matches
    if (otpRecord.otp !== otpCode) {
      await otpRecord.incrementAttempts();
      const attemptsLeft = 3 - otpRecord.attempts - 1;
      return {
        success: false,
        message: `Invalid OTP. ${attemptsLeft} attempts remaining`
      };
    }

    // OTP is valid - mark as used
    await otpRecord.markAsUsed();
    
    // Clean up - delete all OTPs for this email and type
    await OTP.deleteMany({ email, type });

    return {
      success: true,
      message: 'OTP verified successfully'
    };

  } catch (error) {
    console.error('OTP verification error:', error);
    throw new Error('Failed to verify OTP');
  }
};

const resendOTP = async (email, type = 'login') => {
  try {
    // Check if there's a recent OTP (rate limiting)
    const recentOTP = await OTP.findOne({
      email,
      type,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes
    });

    if (recentOTP) {
      return {
        success: false,
        message: 'Please wait 2 minutes before requesting a new OTP'
      };
    }

    // Create and send new OTP
    return await createAndSendOTP(email, type);

  } catch (error) {
    console.error('OTP resend error:', error);
    throw new Error('Failed to resend OTP');
  }
};

const cleanupExpiredOTPs = async () => {
  try {
    const result = await OTP.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
    }
    
    return result.deletedCount;
  } catch (error) {
    console.error('OTP cleanup error:', error);
  }
};

module.exports = {
  generateOTP,
  createAndSendOTP,
  verifyOTP,
  resendOTP,
  cleanupExpiredOTPs
};