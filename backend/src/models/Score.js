const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    midterm: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    final: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    oral: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    average: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// One score record per student per class
scoreSchema.index({ studentId: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model('Score', scoreSchema);
