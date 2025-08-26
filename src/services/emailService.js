const { sgMail, emailConfig } = require('../config/mailer');

const sendOTP = async (email, otp, type = 'login') => {
  const templates = {
    signup: {
      subject: 'Welcome! Verify your email address',
      html: getSignupTemplate(otp),
      text: `Welcome! Your verification code is: ${otp}. This code will expire in 10 minutes.`
    },
    login: {
      subject: 'Your login verification code',
      html: getLoginTemplate(otp),
      text: `Your login verification code is: ${otp}. This code will expire in 10 minutes.`
    }
  };

  const template = templates[type];
  
  if (!template) {
    throw new Error(`Invalid email template type: ${type}`);
  }
  
  const msg = {
    to: email,
    from: {
      email: emailConfig.from.email,
      name: emailConfig.from.name
    },
    subject: template.subject,
    text: template.text,
    html: template.html,
  };

  try {
    await sgMail.send(msg);
    console.log(`${type.toUpperCase()} OTP sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

const getSignupTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4CAF50; margin-bottom: 10px;">Welcome to Your App!</h1>
        <p style="font-size: 16px; color: #666;">Please verify your email address to get started</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #333; margin-bottom: 15px;">Your Verification Code</h2>
        <div style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; margin-top: 15px;">This code will expire in 10 minutes</p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 14px;">
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    </body>
    </html>
  `;
};

const getLoginTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login Verification Code</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2196F3; margin-bottom: 10px;">Login Verification</h1>
        <p style="font-size: 16px; color: #666;">Enter this code to complete your login</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #333; margin-bottom: 15px;">Your Login Code</h2>
        <div style="font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; margin-top: 15px;">This code will expire in 10 minutes</p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 14px;">
        <p>If you didn't try to log in, please ignore this email.</p>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendOTP,
  getSignupTemplate,
  getLoginTemplate
};