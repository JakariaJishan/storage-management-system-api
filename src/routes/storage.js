const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storageController');
const { ensureAuthenticated } = require('../../middleware');

// Folder and File Upload Routes
router.post('/folders', ensureAuthenticated, storageController.createFolder);
router.post('/upload', ensureAuthenticated, storageController.uploadMiddleware, storageController.uploadFile);
router.get('/dashboard', ensureAuthenticated, storageController.getDashboardData);
router.get('/folders/:id', ensureAuthenticated, storageController.getFolderStats);
router.delete('/folders/:id', ensureAuthenticated, storageController.deleteFolder);
router.get('/recent-files', ensureAuthenticated, storageController.getRecentFiles);
router.get('/files-by-date', ensureAuthenticated, storageController.getFilesByDate);

// File Management Routes
router.post('/files/:id/favorite', ensureAuthenticated, storageController.toggleFavorite);
router.put('/files/:id/rename', ensureAuthenticated, storageController.renameFile);
router.post('/files/:id/duplicate', ensureAuthenticated, storageController.duplicateFile);
router.post('/files/:id/copy', ensureAuthenticated, storageController.copyFile);
router.delete('/files/:id', ensureAuthenticated, storageController.deleteFile);
router.get('/files/:id/share', ensureAuthenticated, storageController.shareFile);

module.exports = router;
