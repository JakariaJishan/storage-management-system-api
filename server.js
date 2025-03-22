const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const authRoutes = require('./src/routes/auth');
const storageRoutes = require('./src/routes/storage');
require('dotenv').config();

// Load Passport config (local & Google strategies)
require('./src/config/passport');

const app = express();
const MONGO_URI = process.env.MONGO_URI
// Connect to MongoDB
mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Express session middleware (required for Passport)
app.use(session({
  secret: 'your_secret_key', // need this in production
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Mount routes
app.use('/auth', authRoutes);
app.use('/storage', storageRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
