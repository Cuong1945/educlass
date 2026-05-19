const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    dob: {
      type: Date,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    parentName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    parentPhone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
