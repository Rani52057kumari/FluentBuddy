require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const noteRoutes = require('./routes/noteRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const practiceRoutes = require('./routes/practiceRoutes');
const exerciseRoutes = require('./routes/exercises');
const progressRoutes = require('./routes/progress');
const { initializeDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fluentbuddy';

const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error('Please start MongoDB locally or set MONGODB_URI in your environment.');
    process.exit(1);
  }
};

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize databases
connectMongoDB();
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/progress', progressRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/practice', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/practice.html'));
});

app.get('/speaking', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/speaking.html'));
});

app.get('/writing', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/writing.html'));
});

app.get('/reading', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reading.html'));
});

app.get('/progress', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/progress.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

// Export for Vercel serverless
module.exports = app;

// Start server (only if not in Vercel)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FluentBuddy server is running on http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.87.38:${PORT}`);
  });
}
