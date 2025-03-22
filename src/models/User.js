const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  googleId: {
    type: String,
    default: null
  },
  email: {
    type: String,
    required: function() { return !this.googleId; },
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: function() { return !this.googleId; }
  },
  name: {
    type: String
  },
  avatar: {
    type: String,
    default: null
  },
  // Storage management fields
  usedStorage: {
    type: Number,
    default: 0
  },
  storageLimit: {
    type: Number,
    default: 15 * 1024 * 1024 * 1024 // 15GB in bytes
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

module.exports = mongoose.model('User', UserSchema);
