const mongoose = require('mongoose');
require('dotenv').config();
const FileMeta = require('../server/models/FileMeta');

const uri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/fluentbuddy';

async function run() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const docs = await FileMeta.find({}).sort({ createdAt: -1 }).limit(20).lean();
    if (!docs.length) {
      console.log('No FileMeta documents found.');
      process.exit(0);
    }

    docs.forEach((d, i) => {
      console.log('---');
      console.log(`#${i+1} filename:`, d.filename);
      console.log(' originalName:', d.originalName);
      console.log(' mimeType:', d.mimeType, ' size:', d.size);
      const txt = String(d.extractedText || '');
      console.log(' extractedText length:', txt.length);
      if (txt.length) console.log(' excerpt:', txt.substring(0, 300).replace(/\n/g,' '));
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error inspecting FileMeta:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

run();
