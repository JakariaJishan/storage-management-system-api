const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated } = require('../../middleware');

// Signup
router.post('/signup', authController.signup);

// Login using Passport's local strategy
router.post('/login', authController.signin);

// Google Authentication Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.json({ message: 'Logged in with Google successfully', user: req.user });
});

// Forgot Password
router.post('/forgot-password', authController.forgotPassword);

// Reset Password
router.post('/reset-password/:token', authController.resetPassword);

// Signout
router.get('/signout', authController.signout);

//upload avatar
router.put('/profile', ensureAuthenticated, authController.avatarUpload, authController.updateProfile);

// Update Password
router.put('/password', ensureAuthenticated, authController.updatePassword);

// Delete Account
router.delete('/', ensureAuthenticated, authController.deleteAccount);

module.exports = router;
