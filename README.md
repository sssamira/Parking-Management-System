# Parking Management System

A full-stack parking management system built with the MERN stack (MongoDB, Express, React, Node.js).

## Tech Stack

- **Frontend**: React.js with TailwindCSS
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Deployment**: Vercel

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Parking-Management-System
```

2. Install all dependencies:
```bash
npm run install-all
```

Or install separately:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Set up environment variables:

Create a `.env` file in the `server` directory:
```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your configuration:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/parking-management
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

## Running the Application

### Development Mode

Run both server and client concurrently:
```bash
npm run dev
```

Or run separately:

**Backend Server:**
```bash
npm run server
# Server runs on http://localhost:5000
```

**Frontend Client:**
```bash
npm run client
# Client runs on http://localhost:3000
```

### Production Build

Build the client for production:
```bash
npm run build
```

## Project Structure

```
Parking-Management-System/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Express backend
│   ├── config/            # Configuration files
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── controllers/       # Route controllers
│   ├── index.js
│   └── package.json
├── package.json           # Root package.json
├── vercel.json            # Vercel deployment config
└── README.md
```

## Deployment


Or connect your GitHub repository to Vercel for automatic deployments.

## Environment Variables

### Server (.env)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - JWT token expiration time
- `GOOGLE_CLIENT_ID` - OAuth client ID from Google Cloud Console (Web application)
- `GOOGLE_CLIENT_SECRET` - OAuth client secret from Google Cloud Console

### Client (.env)
- `REACT_APP_GOOGLE_CLIENT_ID` - Same OAuth client ID used above, exposed to the browser

## License

ISC
