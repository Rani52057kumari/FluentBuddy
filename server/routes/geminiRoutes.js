const express = require('express');
const { explainNote, generateDocs, generateReadme } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.post('/explain', explainNote);
router.post('/docs', generateDocs);
router.post('/readme', generateReadme);

module.exports = router;
