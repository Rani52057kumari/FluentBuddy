const express = require('express');
const { evaluateWriting, comprehensionAssist, explainCode } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/evaluate-writing', protect, evaluateWriting);
router.post('/simplify-context', protect, comprehensionAssist);
router.post('/explain-code', protect, explainCode);

module.exports = router;
