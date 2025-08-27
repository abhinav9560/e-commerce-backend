module.exports = {
  apps: [
    {
      name: "ecommerce-backend",
      script: "src/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env_file: ".env",
      env: {
        NODE_ENV: "development",
	PORT:5000,
	//Database
	MONGODB_URI:"mongodb+srv://abhinavanand0411:pe9EbziUWEZuGAll@irishapp.jzkalsv.mongodb.net/",
	//JWT Configuration
	JWT_SECRET:"your-super-secret-jwt-key-here-make-it-long-and-secure",
	JWT_EXPIRES_IN:"15m",
	JWT_REFRESH_SECRET:"your-super-secret-refresh-jwt-key-here",
	JWT_REFRESH_EXPIRES_IN:"7d",
	// SendGrid Email Configuration
	SENDGRID_API_KEY:"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",
	FROM_EMAIL:"abhinav970411@gmail.com",
	FROM_NAME:"IrishApp",
	// Client Configuration (for CORS)
	CLIENT_URL:"http://localhost:3000",
	//Optional: Additional security keys
	ENCRYPTION_KEY:"your-32-character-encryption-key",
	//Cloudinary Configuration
	CLOUDINARY_CLOUD_NAME:"drnt5nihw",
	CLOUDINARY_API_KEY:733712574962882,
	CLOUDINARY_API_SECRET:"TFv_yWv-f5NdsMF7zqOt8ouASyg"
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
