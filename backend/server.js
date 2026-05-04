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
    origin: '*',
  }
});

app.use(cors());
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
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quiz-app';
    if (MONGO_URI.includes('127.0.0.1') || MONGO_URI.includes('localhost')) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('✅ In-Memory MongoDB Connected successfully for Local Development!');
    } else {
      await mongoose.connect(MONGO_URI);
      console.log('✅ MongoDB Connected successfully!');
    }
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
  }
};
if (require.main === module || process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Initialize Socket.io logic
const initQuizSockets = require('./src/sockets/quizSockets');
initQuizSockets(io);

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

module.exports = { app, httpServer };
