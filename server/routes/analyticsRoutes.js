const express = require('express');
const { getUserProgress } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/progress', protect, getUserProgress);

module.exports = router;
