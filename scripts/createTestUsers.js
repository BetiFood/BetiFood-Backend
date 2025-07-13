const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createTestUsers() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // حذف المستخدمين الموجودين للاختبار
    await User.deleteMany({});
    console.log('✅ Cleared existing users');

    // إنشاء مستخدمين للاختبار
    const testUsers = [
      {
        name: 'Test Client',
        email: 'client@test.com',
        password: '123456',
        phone: '0123456789',
        address: 'Cairo, Egypt',
        role: 'client'
      },
      {
        name: 'Test Cook',
        email: 'cook@test.com',
        password: '123456',
        phone: '0123456790',
        address: 'Alexandria, Egypt',
        role: 'cook',
        specialization: 'Egyptian Cuisine',
        experience: 5
      },
      {
        name: 'Test Delivery',
        email: 'delivery@test.com',
        password: '123456',
        phone: '0123456791',
        address: 'Giza, Egypt',
        role: 'delivery',
        vehicleType: 'Motorcycle',
        licenseNumber: 'DL123456'
      },
      {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: '123456',
        phone: '0123456792',
        address: 'Cairo, Egypt',
        role: 'admin'
      }
    ];

    // إنشاء المستخدمين
    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone,
        address: userData.address,
        role: userData.role,
        isVerified: true, // تفعيل تلقائي
        isActive: true,
        ...(userData.specialization && { specialization: userData.specialization }),
        ...(userData.experience && { experience: userData.experience }),
        ...(userData.vehicleType && { vehicleType: userData.vehicleType }),
        ...(userData.licenseNumber && { licenseNumber: userData.licenseNumber })
      });

      await user.save();
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    }

    // عرض المستخدمين المنشأين
    const allUsers = await User.find({}, 'name email role isVerified');
    console.log('\n👥 Created Users:');
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Verified: ${user.isVerified}`);
    });

    console.log('\n🔑 Login Credentials:');
    console.log('Client: client@test.com / 123456');
    console.log('Cook: cook@test.com / 123456');
    console.log('Delivery: delivery@test.com / 123456');
    console.log('Admin: admin@test.com / 123456');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// تشغيل السكريبت
createTestUsers(); 