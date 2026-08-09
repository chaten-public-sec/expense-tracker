const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Initializes the Super Admin account (admin@gmail.com / admin123) in MongoDB on server startup.
 */
const initSuperAdmin = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    let adminUser = await User.findOne({ email: adminEmail });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    if (!adminUser) {
      adminUser = await User.create({
        fullName: 'Super Admin',
        email: adminEmail,
        phone: '9999999999',
        password: hashedPassword,
        isSuperAdmin: true,
      });
      console.log('✅ Super Admin account created: admin@gmail.com / admin123');
    } else {
      adminUser.isSuperAdmin = true;
      adminUser.password = hashedPassword;
      await adminUser.save();
      console.log('✅ Super Admin account updated: admin@gmail.com / admin123 (isSuperAdmin: true)');
    }
  } catch (error) {
    console.error('❌ Error initializing Super Admin:', error.message);
  }
};

module.exports = initSuperAdmin;
