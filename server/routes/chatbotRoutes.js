const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { queryChatbot, transcribeAudio } = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
      return next();
    }

    const allowGuest = Boolean(req.body?.allowGuestSupport || req.body?.guestMode || req.query?.guest === 'true');
    if (allowGuest) {
      req.user = null;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication required for chatbot access.',
    });
  } catch (error) {
    const allowGuest = Boolean(req.body?.allowGuestSupport || req.body?.guestMode || req.query?.guest === 'true');
    if (allowGuest) {
      req.user = null;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please log in or allow guest support.',
    });
  }
};

router.post('/query', optionalAuth, queryChatbot);
router.post('/stt', protect, upload.any(), transcribeAudio);

module.exports = router;
