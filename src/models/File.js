const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FileSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String
  },
  folder: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  shareLink: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('File', FileSchema);
