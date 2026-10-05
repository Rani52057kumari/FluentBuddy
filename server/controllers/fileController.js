const path = require('path');
const fs = require('fs');
const multer = require('multer');
const FileMeta = require('../models/FileMeta');
const Project = require('../models/Project');
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

    const projectId = req.body?.projectId || req.query?.projectId || null;
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      const isOwner = String(project.owner) === String(req.user?._id);
      const isMember = project.members.some((memberId) => String(memberId) === String(req.user?._id));
      if (!isOwner && !isMember) {
        return res.status(403).json({ success: false, message: 'You do not have access to this project.' });
      }
    }

    const metaData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploader: req.user?._id,
      project: projectId || null,
      createdAt: Date.now(),
    };

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
    const projectId = req.query?.projectId || req.body?.projectId || null;
    const filter = { uploader: req.user?._id };

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found.' });
      }

      const isOwner = String(project.owner) === String(req.user?._id);
      const isMember = project.members.some((memberId) => String(memberId) === String(req.user?._id));
      if (!isOwner && !isMember) {
        return res.status(403).json({ success: false, message: 'You do not have access to this project.' });
      }

      filter.project = projectId;
    }

    const files = await FileMeta.find(filter).sort({ createdAt: -1 });
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
