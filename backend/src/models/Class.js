const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    level: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'KIDS'],
      required: true,
    },
    schedule: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Class', classSchema);
