#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Bootstrapping new backend project...');

// Create .env template if it doesn't exist
const envTemplate = `NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
LOG_LEVEL=info
LOG_FILE=logs/app.log
FRONTEND_URL=http://localhost:3000
`;

if (!fs.existsSync('.env')) {
  fs.writeFileSync('.env', envTemplate);
  console.log('✅ Created .env template');
}

// Create logs directory
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
  console.log('✅ Created logs directory');
}

// Create basic controller template
const controllerTemplate = `const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

exports.getExample = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {}, "Example endpoint working")
  );
});
`;

if (!fs.existsSync('controllers/exampleController.js')) {
  fs.writeFileSync('controllers/exampleController.js', controllerTemplate);
  console.log('✅ Created example controller');
}

console.log('🎉 Bootstrap complete!');
console.log('📝 Update your .env file with your actual credentials');
console.log('🚀 Run: npm install && npm start');
