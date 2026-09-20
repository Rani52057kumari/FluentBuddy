const express = require('express');
const { uploadMiddleware, uploadFileHandler, listUserFiles } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/upload', uploadMiddleware.single('file'), uploadFileHandler);
router.get('/', listUserFiles);

module.exports = router;
