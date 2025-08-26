const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailConfig = {
  from: {
    email: process.env.FROM_EMAIL || 'noreply@yourapp.com',
    name: process.env.FROM_NAME || 'Your App'
  }
};

module.exports = { sgMail, emailConfig };