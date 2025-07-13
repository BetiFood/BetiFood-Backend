const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/sendMail.js");
const { generateActivationEmail } = require("../utils/generateHTML.js");
require("dotenv").config();

async function resendVerificationEmail(email) {
  try {
    console.log(`📧 إعادة إرسال رسالة تأكيد للبريد الإلكتروني: ${email}`);

    // البحث عن المستخدم
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ المستخدم غير موجود');
      return { success: false, message: 'المستخدم غير موجود' };
    }

    // التحقق من حالة التفعيل
    if (user.isVerified) {
      console.log('✅ المستخدم مفعل بالفعل');
      return { success: false, message: 'المستخدم مفعل بالفعل' };
    }

    // إنشاء رمز تحقق جديد
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // إعداد رابط التحقق
    const verificationUrl = `http://localhost:5174/confirm-email?token=${verificationToken}`;

    // إرسال البريد الإلكتروني
    await sendEmail({
      to: email,
      subject: "تفعيل البريد الإلكتروني - بيتي فود",
      html: generateActivationEmail(verificationUrl),
    });

    console.log('✅ تم إرسال رسالة التأكيد بنجاح');
    return { 
      success: true, 
      message: 'تم إرسال رسالة التأكيد بنجاح',
      userId: user._id 
    };

  } catch (error) {
    console.error('❌ خطأ في إرسال رسالة التأكيد:', error.message);
    return { 
      success: false, 
      message: 'فشل في إرسال رسالة التأكيد',
      error: error.message 
    };
  }
}

// تشغيل السكريبت إذا تم استدعاؤه مباشرة
if (require.main === module) {
  const email = process.argv[2];
  
  if (!email) {
    console.log('❌ يرجى توفير البريد الإلكتروني');
    console.log('📝 الاستخدام: node resendVerificationEmail.js <email>');
    process.exit(1);
  }

  resendVerificationEmail(email)
    .then(result => {
      if (result.success) {
        console.log('🎉 تم إرسال رسالة التأكيد بنجاح!');
        console.log(`📧 البريد الإلكتروني: ${email}`);
        console.log(`🆔 معرف المستخدم: ${result.userId}`);
      } else {
        console.log('❌ فشل في إرسال رسالة التأكيد');
        console.log(`📧 السبب: ${result.message}`);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ خطأ غير متوقع:', error);
      process.exit(1);
    });
}

module.exports = { resendVerificationEmail }; 