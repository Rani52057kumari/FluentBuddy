const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  extractedText: { type: String, default: '' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  createdAt: { type: Date, default: Date.now },
});

fileSchema.index({ uploader: 1 });
fileSchema.index({ project: 1 });
fileSchema.index({ uploader: 1, project: 1 });

module.exports = mongoose.model('File', fileSchema);
