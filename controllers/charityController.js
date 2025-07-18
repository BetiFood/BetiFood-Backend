const Charity = require("../models/Charity");
const cloudinary = require("cloudinary").v2;
const Donation = require('../models/Donation');
const Order = require('../models/Order');

// إضافة جمعية جديدة
exports.createCharity = async (req, res) => {
  try {
    const { name, description, address, phone, email, website } = req.body;

    let imageUrl = undefined;

    // Handle image upload to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await cloudinary.uploader
          .upload_stream({ folder: "charity" }, (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
            }
          })
          .end(req.file.buffer);

        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
      }
    }

    const createdBy = req.user._id;

    const newCharity = new Charity({
      name,
      description,
      address,
      phone,
      email,
      website,
      image: imageUrl,
      createdBy: req.userId,
    });
    await newCharity.save();

    res.status(201).json({
      success: true,
      message: "تم إضافة الجمعية الخيرية بنجاح",
      charity: {
        id: newCharity._id,
        name: newCharity.name,
        description: newCharity.description,
        address: newCharity.address,
        phone: newCharity.phone,
        email: newCharity.email,
        website: newCharity.website,
        imageUrl: imageUrl,
        createdBy: newCharity.createdBy,
        createdAt: newCharity.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// عرض كل الجمعيات
exports.getAllCharities = async (req, res) => {
  try {
    const charities = await Charity.find().sort({ createdAt: -1 });
    res.json(charities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// تعديل جمعية
exports.updateCharity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, address, phone, email, website } = req.body;
    let updateData = { name, description, address, phone, email, website };

    // Handle image upload to Cloudinary if new file exists
    if (req.file) {
      try {
        const result = await cloudinary.uploader
          .upload_stream({ folder: "charity" }, (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
            }
          })
          .end(req.file.buffer);

        updateData.image = result.secure_url;
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
      }
    } else if (req.body.image) {
      updateData.image = req.body.image;
    }

    const updatedCharity = await Charity.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.json({
      success: true,
      message: "تم تعديل الجمعية بنجاح",
      charity: updatedCharity
        ? {
            id: updatedCharity._id,
            name: updatedCharity.name,
            description: updatedCharity.description,
            address: updatedCharity.address,
            phone: updatedCharity.phone,
            email: updatedCharity.email,
            website: updatedCharity.website,
            image: updatedCharity.image,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// حذف جمعية
exports.deleteCharity = async (req, res) => {
  try {
    const { id } = req.params;
    await Charity.findByIdAndDelete(id);
    res.json({ message: "تم حذف الجمعية بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createDonation = async (req, res) => {
  try {
    const { amount, toCharity, message } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'يجب إدخال مبلغ تبرع صحيح' });
    }
    if (!toCharity) {
      return res.status(400).json({ message: 'يجب اختيار جمعية للتبرع لها' });
    }
    const donation = await Donation.create({
      donor: req.user._id,
      amount,
      toCharity,
      message
    });
    res.status(201).json({ message: 'تم التبرع بنجاح', donation });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء التبرع' });
  }
};

exports.getCharityDonations = async (req, res) => {
  try {
    const { id } = req.params;
    const donations = await require('../models/Donation').find({ toCharity: id }).populate('donor', 'name email');
    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب التبرعات', error: err.message });
  }
};

exports.createMealDonationToCharity = async (req, res) => {
  try {
    const { toCharity, meals, message } = req.body;
    if (!toCharity || !Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({ message: 'يجب اختيار جمعية وقائمة وجبات صحيحة' });
    }
    const charity = await Charity.findById(toCharity);
    if (!charity) {
      return res.status(404).json({ message: 'الجمعية غير موجودة' });
    }
    const Meal = require('../models/Meal');
    let total_price = 0;
    const orderMeals = [];
    for (const item of meals) {
      const mealDoc = await Meal.findById(item.mealId);
      if (!mealDoc) {
        return res.status(404).json({ message: `الوجبة غير موجودة: ${item.mealId}` });
      }
      if (mealDoc.quantity < item.quantity) {
        return res.status(400).json({ message: `الكمية المطلوبة غير متوفرة للوجبة: ${mealDoc.name}` });
      }
      orderMeals.push({
        mealId: mealDoc._id,
        mealName: mealDoc.name,
        cookId: mealDoc.cook.cookId,
        cookName: mealDoc.cook.name,
        quantity: item.quantity,
        price: mealDoc.price
      });
      total_price += mealDoc.price * item.quantity;
    }
    const donation = await Donation.create({
      donor: req.user._id,
      amount: total_price,
      toCharity: charity._id,
      message,
      status: 'pending'
    });
    const order = await Order.create({
      client_name: charity.name,
      phone: charity.phone || '',
      address: charity.address || '',
      client_id: req.user._id,
      toCharity: charity._id,
      isDonation: true,
      donationId: donation._id,
      meals: orderMeals,
      total_price,
      final_amount: total_price,
      payment: {
        method: 'cash',
        status: 'paid',
        amount_due: 0,
        paid: total_price,
        refunded: 0
      },
      status: 'pending',
      notes: message
    });
    donation.toOrder = order._id;
    await donation.save();
    for (const item of meals) {
      await Meal.findByIdAndUpdate(item.mealId, { $inc: { quantity: -item.quantity } });
    }
    res.status(201).json({ message: 'تم التبرع بالوجبات للجمعية بنجاح', order, donation });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء التبرع بالوجبات', error: err.message });
  }
};

exports.getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate('toCharity', 'name')
      .populate('toOrder', 'meals total_price status');
    res.json({ donations });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب التبرعات', error: err.message });
  }
};

exports.updateDonation = async (req, res) => {
  try {
    if (!["delivery", "admin"].includes(req.user.role) && !req.user.isCharity) {
      return res.status(403).json({ message: "غير مصرح لك بتحديث حالة التبرع" });
    }
    const { id } = req.params;
    const { status, adminNote, proofImage, logNote } = req.body;
    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: 'التبرع غير موجود' });
    }
    if (status) donation.status = status;
    if (adminNote) donation.adminNote = adminNote;
    if (req.files && req.files.proofImage && req.files.proofImage[0]) {
      donation.proofImage = req.files.proofImage[0].path || req.files.proofImage[0].filename;
    } else if (proofImage) {
      donation.proofImage = proofImage;
    }
    // إضافة log جديد
    donation.logs = donation.logs || [];
    donation.logs.push({
      action: status || 'update',
      by: req.user._id,
      note: logNote || ''
    });
    await donation.save();
    res.json({ message: 'تم تحديث التبرع بنجاح', donation });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث التبرع', error: err.message });
  }
};

exports.confirmDonationReceipt = async (req, res) => {
  try {
    if (!req.user.isCharity && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك بتأكيد الاستلام' });
    }
    const { id } = req.params;
    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ message: 'التبرع غير موجود' });
    }
    donation.status = 'delivered';
    donation.logs = donation.logs || [];
    donation.logs.push({
      action: 'delivered',
      by: req.user._id,
      note: 'تم تأكيد استلام الجمعية للتبرع'
    });
    await donation.save();
    res.json({ message: 'تم تأكيد استلام التبرع بنجاح', donation });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء تأكيد الاستلام', error: err.message });
  }
};
