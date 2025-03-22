const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const passport = require("passport");

// Signup - Create new user with email & password
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error signing up', error });
  }
};

//signin
exports.signin = async (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      return res.status(400).json({ message: info.message });
    }
    req.logIn(user, err => {
      if (err) { return next(err); }
      const { password, ...userWithoutPassword } = user.toObject();
      return res.json({ message: 'Logged in successfully', user: userWithoutPassword });
    });
  })(req, res, next);
}

// Forgot Password - Generates a reset token
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'No account with that email found.' });
    }
    // Create a token and set expiration (e.g., 1 hour)
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    res.json({ message: 'Password reset link sent', resetToken: token });
  } catch (error) {
    res.status(500).json({ message: 'Error processing request', error });
  }
};

// Reset Password - Validates the token and updates the password
exports.resetPassword = async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findOne({ 
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }
    // Hash new password and update user record
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error });
  }
};

// Signout - Logs out the user
exports.signout = (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.json({ message: 'Signed out successfully' });
  });
};

// ----------------------
// Avatar Upload Middleware
// ----------------------
const avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Files will be saved under uploads/avatars/<user_id>/
    const uploadPath = path.join(__dirname, '..', 'uploads', 'avatars', req.user._id.toString());
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
exports.avatarUpload = multer({ storage: avatarStorage }).single('avatar');

// ----------------------
// Update Profile (Name and Avatar)
// ----------------------
exports.updateProfile = async (req, res) => {
  try {
    // req.user is provided by Passport once authenticated.
    const user = req.user;

    // Update name if provided
    if (req.body.name) {
      user.name = req.body.name;
    }

    // Update avatar if a file was uploaded
    if (req.file) {
      user.avatar = req.file.path;
    }

    await user.save();
    const { password, ...userWithoutPassword } = user.toObject();
    res.json({ message: 'Profile updated successfully', userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

// ----------------------
// Update Password
// ----------------------
exports.updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Both old and new passwords are required' });
  }
  try {
    const user = req.user;
    // Verify that the provided old password is correct.
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    // Hash the new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password', error });
  }
};

// ----------------------
// Delete Account
// ----------------------
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    await User.findByIdAndDelete(userId);
    // Log the user out after deletion.
    req.logout(function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error logging out', error: err });
      }
      res.json({ message: 'Account deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account', error});
  }
};