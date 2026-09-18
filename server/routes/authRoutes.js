const express = require('express');
const {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  googleAuth,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);

// Protected route
router.get('/me', protect, getMe);

module.exports = router;
