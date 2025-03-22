const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const Folder = require('../models/Folder');
const File = require('../models/File');
const User = require('../models/User');

// Configure multer storage to save files under "uploads/<user_id>"
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', req.user.id.toString());
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and docs are allowed.'), false);
  }
};

exports.uploadMiddleware = multer({ storage: storage, fileFilter: fileFilter }).single('file');

// ------------------------------
// Folder and File Upload Functions
// ------------------------------

// Create a folder for the authenticated user.
exports.createFolder = async (req, res) => {
  const { name, pinCode } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Folder name is required' });
  }
  try {
    let folderData = {
      name,
      user: req.user._id,
      isLocked: false,
      pinCode: null
    };

    if (pinCode) {
      // Hash the pin code before storing it
      const hashedPin = await bcrypt.hash(pinCode, 10);
      folderData.isLocked = true;
      folderData.pinCode = hashedPin;
    }

    const folder = new Folder(folderData);
    await folder.save();
    res.status(201).json({ message: 'Folder created successfully', folder });
  } catch (error) {
    res.status(500).json({ message: 'Error creating folder', error });
  }
};

// Upload a file and update the user's storage usage.
exports.uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const folderId = req.body.folderId; // Optional: specify folder id.
  try {
    let folder = null;
    if (folderId) {
      folder = await Folder.findOne({ _id: folderId, user: req.user._id });
      if (!folder) {
        return res.status(400).json({ message: 'Folder not found' });
      }
    }
    
    // Check if the user has enough available storage.
    const user = await User.findById(req.user._id);
    const fileSize = req.file.size;
    if (user.usedStorage + fileSize > user.storageLimit) {
      return res.status(400).json({ message: 'Not enough storage space available' });
    }
    
    // Update user's used storage.
    user.usedStorage += fileSize;
    await user.save();
    
    // Save file metadata.
    const newFile = new File({
      name: req.file.originalname,
      path: req.file.path,
      size: fileSize,
      mimetype: req.file.mimetype,
      folder: folder ? folder._id : null,
      user: req.user._id
    });
    await newFile.save();
    
    res.status(201).json({ message: 'File uploaded successfully', file: newFile });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading file', error });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.user._id });
    const files = await File.find({ user: req.user._id });

    const folderStats = await Promise.all(folders.map(async (folder) => {
      const folderFiles = files.filter(file => file.folder && file.folder.toString() === folder._id.toString());
      const totalItems = folderFiles.length;
      const totalSize = folderFiles.reduce((acc, file) => acc + file.size, 0);
      return {
        folderId: folder._id,
        folderName: folder.name,
        totalItems,
        totalSize
      };
    }));

    const totalFiles = files.length;
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);

    res.json({ folderStats, totalFiles, totalSize });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving dashboard data', error });
  }
};

exports.getFolderStats = async (req, res) => {
  const folderId = req.params.id;
  try {
    const folder = await Folder.findOne({ _id: folderId, user: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const files = await File.find({ folder: folderId, user: req.user._id });
    const totalItems = files.length;
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const fileNames = files.map(file => file);

    res.json({ totalItems, totalSize, fileNames });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving folder stats', error });
  }
};

exports.getRecentFiles = async (req, res) => {
  try {
    const recentFiles = await File.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ recentFiles });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving recent files', error });
  }
};

exports.getFilesByDate = async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }
  try {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const files = await File.find({
      user: req.user._id,
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      }
    }).sort({ createdAt: -1 });

    res.json({ files });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving files', error });
  }
};

exports.deleteFolder = async (req, res) => {
  const folderId = req.params.id;
  try {
    const folder = await Folder.findOne({ _id: folderId, user: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Find all files in the folder
    const files = await File.find({ folder: folderId, user: req.user._id });

    // Delete all files in the folder
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
      await file.deleteOne();
    }

    // Delete the folder
    await folder.deleteOne();

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting folder', error });
  }
};

// ------------------------------
// New File Management Functions
// ------------------------------

// Toggle file favorite status.
exports.toggleFavorite = async (req, res) => {
  const fileId = req.params.id;
  try {
    const file = await File.findOne({ _id: fileId, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    file.isFavorite = !file.isFavorite;
    await file.save();
    res.json({ message: 'File favorite status updated', file });
  } catch (err) {
    res.status(500).json({ message: 'Error updating favorite', error: err });
  }
};

// Rename a file (also renames the file on disk).
exports.renameFile = async (req, res) => {
  const fileId = req.params.id;
  const newName = req.body.newName;
  if (!newName) {
    return res.status(400).json({ message: 'New file name is required' });
  }
  try {
    const file = await File.findOne({ _id: fileId, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    const oldPath = file.path;
    const newPath = path.join(path.dirname(oldPath), Date.now() + '-' + newName);
    await fs.promises.rename(oldPath, newPath);
    file.name = newName;
    file.path = newPath;
    await file.save();
    res.json({ message: 'File renamed successfully', file });
  } catch (err) {
    res.status(500).json({ message: 'Error renaming file', error: err });
  }
};

// Duplicate a file in the same folder.
exports.duplicateFile = async (req, res) => {
  const fileId = req.params.id;
  try {
    const file = await File.findOne({ _id: fileId, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    const user = await User.findById(req.user._id);
    if (user.usedStorage + file.size > user.storageLimit) {
      return res.status(400).json({ message: 'Not enough storage to duplicate file' });
    }
    const newFileName = 'Copy-of-' + file.name;
    const newPath = path.join(path.dirname(file.path), Date.now() + '-' + newFileName);
    await fs.promises.copyFile(file.path, newPath);
    const newFile = new File({
      name: newFileName,
      path: newPath,
      size: file.size,
      mimetype: file.mimetype,
      folder: file.folder,
      user: file.user
    });
    await newFile.save();
    user.usedStorage += file.size;
    await user.save();
    res.status(201).json({ message: 'File duplicated successfully', file: newFile });
  } catch (err) {
    res.status(500).json({ message: 'Error duplicating file', error: err });
  }
};

// Copy a file to an optional target folder.
exports.copyFile = async (req, res) => {
  const fileId = req.params.id;
  const targetFolderId = req.body.folderId; // Optional target folder.
  try {
    const file = await File.findOne({ _id: fileId, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    const user = await User.findById(req.user._id);
    if (user.usedStorage + file.size > user.storageLimit) {
      return res.status(400).json({ message: 'Not enough storage to copy file' });
    }
    let targetDir;
    if (targetFolderId) {
      const Folder = require('../models/Folder');
      const folder = await Folder.findOne({ _id: targetFolderId, user: req.user._id });
      if (!folder) {
        return res.status(404).json({ message: 'Target folder not found' });
      }
      targetDir = path.join(__dirname, '..', 'uploads', req.user.id.toString(), folder._id.toString());
      fs.mkdirSync(targetDir, { recursive: true });
    } else {
      targetDir = path.dirname(file.path);
    }
    const newFileName = 'Copy-of-' + file.name;
    const newPath = path.join(targetDir, Date.now() + '-' + newFileName);
    await fs.promises.copyFile(file.path, newPath);
    const newFile = new File({
      name: newFileName,
      path: newPath,
      size: file.size,
      mimetype: file.mimetype,
      folder: targetFolderId || file.folder,
      user: file.user
    });
    await newFile.save();
    user.usedStorage += file.size;
    await user.save();
    res.status(201).json({ message: 'File copied successfully', file: newFile });
  } catch (err) {
    res.status(500).json({ message: 'Error copying file', error: err });
  }
};

// Delete a file (removing it from disk and updating storage usage).
exports.deleteFile = async (req, res) => {
  const fileId = req.params.id;
  try {
    const file = await File.findOne({ _id: fileId, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path);
    }
    const user = await User.findById(req.user._id);
    user.usedStorage -= file.size;
    if (user.usedStorage < 0) user.usedStorage = 0;
    await user.save();
    await file.deleteOne();
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error deleting file', error: err });
  }
};

// Generate (or return an existing) share link for a file.
exports.shareFile = async (req, res) => {
  const fileId = req.params.id;
  try {
    const file = await File.findOne({ _id: fileId, user: req.user._id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (!file.shareLink) {
      const token = crypto.randomBytes(20).toString('hex');
      file.shareLink = token;
      await file.save();
    }
    const shareUrl = `http://localhost:3000/share/${file.shareLink}`;
    res.json({ message: 'File share link generated', shareUrl });
  } catch (err) {
    res.status(500).json({ message: 'Error generating share link', error: err });
  }
};
