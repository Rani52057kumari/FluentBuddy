const mongoose = require('mongoose');

const practiceLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    moduleType: {
      type: String,
      enum: ['Speaking', 'Writing', 'Reading', 'Test'],
      required: [true, 'Module type is required'],
      index: true,
    },
    sessionType: {
      type: String,
      enum: ['Speaking', 'Writing', 'Reading', 'Comprehension', 'Test'],
      default: 'Writing',
    },
    promptText: {
      type: String,
      default: '',
      trim: true,
    },
    userAudioUrl: {
      type: String,
      default: '',
      trim: true,
    },
    userResponseText: {
      type: String,
      default: '',
      trim: true,
    },
    userInput: {
      type: String,
      default: '',
      trim: true,
    },
    aiFeedback: {
      type: String,
      default: '',
      trim: true,
    },
    detailedFeedback: {
      type: String,
      default: '',
      trim: true,
    },
    scores: {
      grammar: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      pronunciation: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      comprehension: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      vocabulary: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    grammarScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    vocabularyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model('PracticeLog', practiceLogSchema);
