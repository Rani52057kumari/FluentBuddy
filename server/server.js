const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const noteRoutes = require('./routes/noteRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const fileRoutes = require('./routes/fileRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const practiceRoutes = require('./routes/practiceRoutes');
const exerciseRoutes = require('./routes/exercises');
const progressRoutes = require('./routes/progress');
const chatbotRoutes = require('./routes/chatbotRoutes');
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
// Lightweight request logger to help identify malformed or oversized requests
app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  const cl = req.headers['content-length'] || 'unknown';
  console.log(`[req] ${new Date().toISOString()} ${req.method} ${req.originalUrl} content-type=${ct} content-length=${cl}`);
  return next();
});
// Allow larger JSON / URL-encoded payloads (e.g. file metadata, larger requests)
// Only run JSON/urlencoded parsers for matching content-types to avoid
// attempting to parse multipart/form-data (file uploads) as JSON.
app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    return bodyParser.json({ limit: '10mb' })(req, res, next);
  }
  if (ct.includes('application/x-www-form-urlencoded')) {
    return bodyParser.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  }
  return next();
});

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
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/chatbot', chatbotRoutes);

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

app.get('/project/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/project-public.html'));
});

// Export for Vercel serverless
module.exports = app;

// Express error handler to convert body-parser / raw-body size errors into 413
app.use((err, req, res, next) => {
  // raw-body sets err.type === 'entity.too.large' for PayloadTooLargeError
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    console.warn('Request entity too large:', err.message || err);
    return res.status(413).json({ success: false, message: 'Request entity too large (max 10MB).' });
  }
  // Syntax errors from JSON parsing
  if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.warn('Bad JSON:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid JSON.' });
  }
  if (err) {
    console.error('Unhandled error in middleware:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
  return next();
});

// Start server (only if not in Vercel)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`FluentBuddy server is running on http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.87.38:${PORT}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} already in use. Another process is listening on this port.`);
      console.error('Kill the process using the port or set a different PORT environment variable.');
      // Exit so process manager (nodemon) can restart cleanly
      process.exit(1);
    }
    console.error('Server error:', err);
  });
}
