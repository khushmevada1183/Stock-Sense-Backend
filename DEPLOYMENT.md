# Indian Stock API Backend

This is the backend API server for the Indian Stock Sense application.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Environment Variables

Create a `.env` file in this directory with the following variables:

```env
# API Configuration
API_URL=https://stock.indianapi.in
NEXT_PUBLIC_INDIAN_API_URL=https://stock.indianapi.in
NEXT_PUBLIC_INDIAN_API_KEYS=your_api_keys_here

# Server Configuration
PORT=10000
NODE_ENV=production

# JWT Secret (if using authentication)
JWT_SECRET=your_jwt_secret_here
```

## Installation

```bash
npm install
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/*` - All stock-related API endpoints

## Deployment on Render

1. Connect your GitHub repository
2. Set the root directory to `api/` in Render settings
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard

## Project Structure

```
api/
├── server.js          # Main server file
├── index.js           # API routes
├── package.json       # Dependencies and scripts
├── .env              # Environment variables (create this)
├── config/           # Configuration files
├── middleware/       # Express middleware
└── utils/           # Utility functions
```
