const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolderSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  // This field stores a hashed pin code if the folder is locked.
  pinCode: {
    type: String,
    default: null
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Folder', FolderSchema);
