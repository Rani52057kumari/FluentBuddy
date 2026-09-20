const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  // Extracted plain text content for files like PDFs (optional)
  extractedText: { type: String, default: '' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

fileMetaSchema.index({ uploader: 1 });

module.exports = mongoose.model('FileMeta', fileMetaSchema);
