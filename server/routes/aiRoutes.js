const express = require('express');
const { evaluateWriting, comprehensionAssist, explainCode, explainNote, generateDocs, generateReadme } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/evaluate-writing', protect, evaluateWriting);
router.post('/simplify-context', protect, comprehensionAssist);
router.post('/explain-code', protect, explainCode);
router.post('/explain', protect, explainNote);
router.post('/docs', protect, generateDocs);
router.post('/readme', protect, generateReadme);

module.exports = router;
