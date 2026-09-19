const express = require('express');
const {
  evaluateSpeaking,
  generateReadingPractice,
  submitReadingPractice,
  generateTest,
  submitTest,
} = require('../controllers/practiceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/speaking', evaluateSpeaking);
router.post('/reading/generate', generateReadingPractice);
router.post('/reading/submit', submitReadingPractice);
router.post('/test/start', generateTest);
router.post('/test/submit', submitTest);

module.exports = router;
