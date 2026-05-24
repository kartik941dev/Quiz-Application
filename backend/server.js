const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config({ override: true });

// Setup CORS origins dynamically from environment variables
const allowedOrigins = [
  "http://localhost:5173", // Local dev frontend
  "https://quiz-application-lime-eight.vercel.app" // Deployed Vercel frontend
];

if (process.env.FRONTEND_URL) {
  // Support comma-separated URLs and normalize by removing trailing slashes
  const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ""));
  allowedOrigins.push(...envOrigins);
}

// Ensure unique, clean, sanitized origins
const uniqueOrigins = [...new Set(allowedOrigins)];

console.log('🔒 CORS: Registered allowed origins:', uniqueOrigins);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: uniqueOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: uniqueOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require('./src/routes/authRoutes');
const quizRoutes = require('./src/routes/quizRoutes');
const doubtRoutes = require('./src/routes/doubtRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const exportRoutes = require('./src/routes/exportRoutes');
const studentRoutes = require('./src/routes/studentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/student', studentRoutes);

// Basic route to test server
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  const status = {
    status: dbStatus === 1 ? 'OK' : 'Error',
    database: statusMap[dbStatus] || 'UnknownState',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  if (dbStatus === 1) {
    return res.status(200).json(status);
  } else {
    return res.status(503).json(status);
  }
});

// Run Diagnostics on Startup
const runDiagnostics = () => {
  console.log('\n==================================================');
  console.log('⚙️  SYSTEM STARTUP DIAGNOSTICS');
  console.log('==================================================');
  console.log(`Node Version   : ${process.version}`);
  console.log(`Platform       : ${process.platform}`);
  console.log(`Architecture   : ${process.arch}`);
  console.log(`Process ID     : ${process.pid}`);
  console.log(`Memory Usage   : ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌ VALIDATION ERROR: MONGO_URI is missing from environment!');
    return false;
  }

  // Extract DB Name
  const dbName = MONGO_URI.split('/').pop()?.split('?')[0] || 'default';
  // Sanitize URI for logging (hide password)
  const sanitizedUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

  console.log(`Target Database: "${dbName}"`);
  console.log(`Sanitized URI  : ${sanitizedUri}`);

  // Basic URI format validation
  if (!MONGO_URI.startsWith('mongodb://') && !MONGO_URI.startsWith('mongodb+srv://')) {
    console.error('❌ VALIDATION ERROR: MONGO_URI must start with "mongodb://" or "mongodb+srv://"');
    return false;
  }

  console.log('==================================================\n');
  return true;
};

// Disable global query buffering for debugging and fail-fast operations
mongoose.set('bufferCommands', false);

// Setup MongoDB connection
const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is missing.');
  }

  const dbName = MONGO_URI.split('/').pop()?.split('?')[0] || 'default';
  console.log(`🔌 Attempting to connect to database: "${dbName}"...`);

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30 seconds
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB: Connection established successfully to "${dbName}"`);
  } catch (err) {
    console.error('\n==================================================');
    console.error('❌ MongoDB Connection Failure Reason:', err.message);
    
    if (err.message.includes('alert number 80') || err.message.includes('SSL') || err.message.includes('tls') || err.message.includes('servers')) {
      console.error('\n💡 ATLAS NETWORK ALERT:');
      console.error('👉 This error indicates that your client IP address is NOT whitelisted in MongoDB Atlas.');
      console.error('👉 ACTION REQUIRED: Go to your MongoDB Atlas Console -> Security -> Network Access.');
      console.error('👉 Add your current IP address or add 0.0.0.0/0 (allows connections from anywhere for dev/testing).');
    }
    console.error('==================================================\n');
    throw err; // Re-throw to prevent the app from continuing to startup
  }
};

// Setup connection lifecycle event handlers
mongoose.connection.on('connecting', () => {
  console.log('🔌 MongoDB Lifecycle: Connecting...');
});
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Lifecycle: Connected.');
});
mongoose.connection.on('disconnecting', () => {
  console.log('🔌 MongoDB Lifecycle: Disconnecting...');
});
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB Lifecycle: Disconnected. Ready state:', mongoose.connection.readyState);
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Lifecycle: Reconnected successfully.');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Lifecycle: Runtime Error occurred:', err);
});

// Initialize Socket.io logic
const initQuizSockets = require('./src/sockets/quizSockets');
initQuizSockets(io);

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  // 1. Run environment diagnostics
  const isEnvValid = runDiagnostics();
  if (!isEnvValid) {
    console.error('🔥 FATAL: Environment diagnostics failed. Exiting...');
    process.exit(1);
  }

  // 2. Try database connection
  try {
    await connectDB();
    
    // 3. Only start Express server if database connects successfully
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('🔥 FATAL: Server failed to start due to database connection error.');
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

// GLOBAL ERROR HANDLING (Task 7)
process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🌊 CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Express Global Error Middleware
app.use((err, req, res, next) => {
  console.error('💥 Express Global Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

module.exports = { app, httpServer };
