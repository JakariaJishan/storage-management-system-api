const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Serialize and deserialize user instances to and from the session.
passport.serializeUser((user, done) => {
  done(null, user.id);
});
  
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Local Strategy for email/password login
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  await User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return done(null, false, { message: 'Email not registered' });
      }
      // Compare password with stored hash
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        return isMatch 
          ? done(null, user) 
          : done(null, false, { message: 'Incorrect Password' });
      });
    })
    .catch(err => done(err));
}));

// Google OAuth Strategy for login/signup via Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Check if user already exists
  User.findOne({ googleId: profile.id })
    .then(existingUser => {
      if (existingUser) {
        return done(null, existingUser);
      }
      // Create new user using Google profile info
      const newUser = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName
      });
      newUser.save().then(user => done(null, user));
    })
    .catch(err => done(err, false));
}));
