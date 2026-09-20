const express = require('express');
const { getUserProgress, getContributionAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/progress', protect, getUserProgress);
router.get('/contribution', protect, getContributionAnalytics);

module.exports = router;
