const rateLimit = require("express-rate-limit");

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Remove custom keyGenerator - let express-rate-limit handle IP automatically
});

// Strict limiter for OTP requests
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 OTP requests per 15 minutes
  message: {
    success: false,
    message: "Too many OTP requests, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to limit by IP + email
  keyGenerator: (req) => {
    return `${rateLimit.ipKeyGenerator(req)}-${req.body.email}`;
  },
  // Only count failed requests
  skipSuccessfulRequests: true,
});

// Login attempt limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per 15 minutes
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${rateLimit.ipKeyGenerator(req)}-${req.body.email}`;
  },
  skipSuccessfulRequests: true,
});

// Signup limiter
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 signup attempts per hour
  message: {
    success: false,
    message: "Too many signup attempts, please try again after 1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Profile update limiter
const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 profile updates per 15 minutes
  message: {
    success: false,
    message: "Too many profile updates, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Token refresh limiter
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 token refresh requests per 15 minutes
  message: {
    success: false,
    message: "Too many token refresh requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  otpLimiter,
  loginLimiter,
  signupLimiter,
  profileUpdateLimiter,
  refreshLimiter,
};
