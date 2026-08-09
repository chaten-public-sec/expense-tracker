const express = require('express');
const router = express.Router();
const { signup, login, getMe, updateProfile, uploadQRCode } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/upload-qr', protect, upload.single('image'), uploadQRCode);

module.exports = router;
