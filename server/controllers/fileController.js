const path = require('path');
const fs = require('fs');
const multer = require('multer');
const FileMeta = require('../models/FileMeta');
let pdf = require('pdf-parse');
// Support both CJS and ESM-style default export shapes
if (pdf && pdf.default && typeof pdf.default === 'function') pdf = pdf.default;

// Multer storage to save files under public/uploads
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${unique}-${safe}`);
  }
});

// Limit uploads to 10MB per file to prevent excessive requests
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const uploadMiddleware = multer({ storage, limits: { fileSize: MAX_UPLOAD_BYTES } });

const uploadFileHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Prepare metadata
    const metaData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploader: req.user?._id,
      createdAt: Date.now(),
    };

    // If PDF, attempt to extract text and store it with the metadata
    try {
      if (req.file.mimetype === 'application/pdf') {
        const buffer = fs.readFileSync(path.join(uploadDir, req.file.filename));
        const pdfData = await pdf(buffer);
        metaData.extractedText = String(pdfData.text || '').trim();
      }
    } catch (ex) {
      console.warn('PDF text extraction failed:', ex && ex.message ? ex.message : ex);
      metaData.extractedText = '';
    }

    const meta = await FileMeta.create(metaData);

    return res.status(201).json({ success: true, file: meta });
  } catch (error) {
    console.error('Upload file error:', error);
    return res.status(500).json({ success: false, message: 'Unable to upload file.' });
  }
};

const listUserFiles = async (req, res) => {
  try {
    const files = await FileMeta.find({ uploader: req.user?._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: files.length, files });
  } catch (error) {
    console.error('List files error:', error);
    return res.status(500).json({ success: false, message: 'Unable to list files.' });
  }
};

module.exports = {
  uploadMiddleware,
  uploadFileHandler,
  listUserFiles,
};
