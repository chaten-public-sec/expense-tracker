const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Initializes Super Admin (admin@gmail.com) and Inspector (inspect@gmail.com) accounts in MongoDB.
 */
const initSuperAdmin = async () => {
  try {
    const salt = await bcrypt.genSalt(10);

    // 1. Super Admin Account (admin@gmail.com / admin123)
    const adminEmail = 'admin@gmail.com';
    let adminUser = await User.findOne({ email: adminEmail });
    const adminPasswordHash = await bcrypt.hash('admin123', salt);

    if (!adminUser) {
      adminUser = await User.create({
        fullName: 'Super Admin',
        email: adminEmail,
        phone: '9999999999',
        password: adminPasswordHash,
        isSuperAdmin: true,
      });
      console.log('✅ Super Admin account created: admin@gmail.com / admin123');
    } else {
      adminUser.isSuperAdmin = true;
      adminUser.password = adminPasswordHash;
      await adminUser.save();
      console.log('✅ Super Admin account updated: admin@gmail.com / admin123 (isSuperAdmin: true)');
    }

    // 2. Inspector Account (inspect@gmail.com / inspect123)
    const inspectEmail = 'inspect@gmail.com';
    let inspectUser = await User.findOne({ email: inspectEmail });
    const inspectPasswordHash = await bcrypt.hash('inspect123', salt);

    if (!inspectUser) {
      inspectUser = await User.create({
        fullName: 'Project Inspector',
        email: inspectEmail,
        phone: '8888888888',
        password: inspectPasswordHash,
        isInspector: true,
      });
      console.log('✅ Inspector account created: inspect@gmail.com / inspect123');
    } else {
      inspectUser.isInspector = true;
      inspectUser.password = inspectPasswordHash;
      await inspectUser.save();
      console.log('✅ Inspector account updated: inspect@gmail.com / inspect123 (isInspector: true)');
    }
  } catch (error) {
    console.error('❌ Error initializing system accounts:', error.message);
  }
};

module.exports = initSuperAdmin;
