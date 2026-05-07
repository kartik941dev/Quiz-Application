const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: "http://localhost:5173",
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

// Setup MongoDB connection
const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected successfully (Atlas)');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1); 
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB Disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Runtime Error:', err);
});

// Initialize Socket.io logic
const initQuizSockets = require('./src/sockets/quizSockets');
initQuizSockets(io);

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  connectDB().then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  });
}

// GLOBAL ERROR HANDLING (Task 7)
process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🌊 CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, httpServer };
