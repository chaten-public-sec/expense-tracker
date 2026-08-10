const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GroupMember = require('../models/GroupMember');
const Group = require('../models/Group');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '7d'
  });
};

// @desc Register new user
// @route POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { fullName, phone, email, password, confirmPassword } = req.body;

    if (!fullName || !phone || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      phone,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      upiId: user.upiId || '',
      qrCodeUrl: user.qrCodeUrl || null,
      group: null,
      role: null,
      token
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during signup' });
  }
};

// @desc Auth user & get token
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    const membership = await GroupMember.findOne({ userId: user._id }).populate('groupId');
    const group = (membership && membership.groupId) ? membership.groupId : null;
    const role = membership ? membership.role : null;

    return res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      upiId: user.upiId || '',
      qrCodeUrl: user.qrCodeUrl || null,
      isSuperAdmin: !!user.isSuperAdmin,
      group,
      role,
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

// @desc Get current logged in user & active group info
// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find if user is in any group
    const membership = await GroupMember.findOne({ userId: req.user._id }).populate('groupId');
    let group = null;
    let role = null;

    if (membership && membership.groupId) {
      group = membership.groupId;
      role = membership.role;
    }

    return res.json({
      user,
      group,
      role
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

// @desc Update user profile (including UPI ID and QR code details)
// @route PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, upiId, qrCodeUrl, qrCodePublicId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone) user.phone = phone.trim();
    if (upiId !== undefined) user.upiId = upiId.trim();

    // Clean up old QR code from Cloudinary if replacing
    if (qrCodePublicId !== undefined && user.qrCodePublicId && user.qrCodePublicId !== qrCodePublicId) {
      await deleteFromCloudinary(user.qrCodePublicId);
    }

    if (qrCodeUrl !== undefined) user.qrCodeUrl = qrCodeUrl;
    if (qrCodePublicId !== undefined) user.qrCodePublicId = qrCodePublicId;

    await user.save();

    return res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      upiId: user.upiId,
      qrCodeUrl: user.qrCodeUrl,
      qrCodePublicId: user.qrCodePublicId
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @desc Upload QR Code image to Cloudinary
// @route POST /api/auth/upload-qr
const uploadQRCode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No QR code image file uploaded' });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'expense_tracker/qr_codes');
    return res.json({ imageUrl: uploadResult.secure_url, publicId: uploadResult.public_id });
  } catch (error) {
    console.error('Upload QR Error:', error);
    return res.status(500).json({ message: 'Failed to upload QR code image' });
  }
};

module.exports = { signup, login, getMe, updateProfile, uploadQRCode };
