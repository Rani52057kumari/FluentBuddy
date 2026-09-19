const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    testType: {
      type: String,
      enum: ['Diagnostic', 'Weekly'],
      required: [true, 'Test type is required'],
      default: 'Diagnostic',
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      required: [true, 'Overall score is required'],
      default: 0,
    },
    breakdown: {
      speaking: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      writing: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      reading: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    levelAssigned: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      required: [true, 'Assigned level is required'],
      default: 'Beginner',
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

module.exports = mongoose.model('TestResult', testResultSchema);
