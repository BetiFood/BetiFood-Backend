const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixUserVerification() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // البحث عن المستخدمين الذين لا يحتويون على حقل isVerified
    const usersWithoutVerification = await User.find({ isVerified: { $exists: false } });
    console.log(`Found ${usersWithoutVerification.length} users without isVerified field`);

    if (usersWithoutVerification.length > 0) {
      // تحديث جميع المستخدمين وإضافة حقل isVerified = true
      const result = await User.updateMany(
        { isVerified: { $exists: false } },
        { $set: { isVerified: true } }
      );
      
      console.log(`✅ Updated ${result.modifiedCount} users with isVerified: true`);
    } else {
      console.log('✅ All users already have isVerified field');
    }

    // عرض إحصائيات المستخدمين
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = await User.countDocuments({ isVerified: false });

    console.log('\n📊 User Statistics:');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Verified Users: ${verifiedUsers}`);
    console.log(`Unverified Users: ${unverifiedUsers}`);

    // عرض قائمة المستخدمين
    const allUsers = await User.find({}, 'name email role isVerified');
    console.log('\n👥 Users List:');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Verified: ${user.isVerified}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// تشغيل السكريبت
fixUserVerification(); 