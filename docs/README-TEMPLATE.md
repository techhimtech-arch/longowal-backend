# Backend API Template

Ek basic Node.js/Express.js backend template jo aap multiple projects ke liye reuse kar sakte hain.

## Quick Start

1. **Clone/Copy this template**
2. **Run bootstrap script:**
   ```bash
   node scripts/bootstrap.js
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Configure environment:**
   - `.env` file mein apni credentials update karein
5. **Start server:**
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── app.js              # Express app setup
├── server.js           # Server startup
├── config/             # Configuration files
│   ├── env.js         # Environment variables
│   ├── database.js    # MongoDB connection
│   └── logger.js      # Winston logger setup
├── controllers/        # Route controllers
├── models/            # MongoDB models
├── routes/            # API routes
├── middleware/        # Custom middleware
├── services/          # Business logic
├── utils/             # Helper functions
└── validators/        # Input validation
```

## Features Included

- ✅ Express.js with basic middleware
- ✅ MongoDB connection
- ✅ Environment configuration
- ✅ JWT authentication setup
- ✅ Rate limiting
- ✅ Error handling
- ✅ Logging with Winston
- ✅ CORS configuration
- ✅ Security headers (Helmet)
- ✅ Health check endpoint

## Reuse Instructions

1. **Copy entire folder** for new project
2. **Run bootstrap** to initialize project-specific files
3. **Update package.json** with new project name
4. **Modify .env** with new database credentials
5. **Add your routes/controllers/models** as needed

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Default Endpoints

- `GET /health` - Health check
- `GET /api-docs` - Swagger documentation (if configured)

## Environment Variables

See `.env` file for all available configuration options.

---

**Note:** Ye template aapki basic backend needs cover karta hai. New project mein sirf business logic add karna hai!
