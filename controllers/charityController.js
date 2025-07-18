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
    const { amount, toCharity, toOrder, message } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'يجب إدخال مبلغ تبرع صحيح' });
    }
    const donation = await Donation.create({
      donor: req.user._id,
      amount,
      toCharity,
      toOrder,
      message
    });
    res.status(201).json({ message: 'تم التبرع بنجاح', donation });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء التبرع' });
  }
};

exports.createDonationToCook = async (req, res) => {
  try {
    const { amount, toCook, message } = req.body;
    if (!amount || amount <= 0 || !toCook) {
      return res.status(400).json({ message: 'يجب إدخال مبلغ وطباخة صحيحة' });
    }
    const donation = await Donation.create({
      donor: req.user._id,
      amount,
      toCook,
      message
    });
    res.status(201).json({ message: 'تم دعم الطباخة بنجاح', donation });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء التبرع' });
  }
};

exports.createDonationMeal = async (req, res) => {
  try {
    const { meal, quantity = 1, extra = 0, extraTo = 'cook', message } = req.body;
    if (!meal || quantity <= 0) {
      return res.status(400).json({ message: 'يجب اختيار وجبة وعدد صحيح' });
    }
    const mealDoc = await require('../models/Meal').findById(meal);
    if (!mealDoc) {
      return res.status(404).json({ message: 'الوجبة غير موجودة' });
    }
    const total = mealDoc.price * quantity;
    // توزيع الزيادة حسب اختيار المتبرع
    let extraToCook = 0, extraToDelivery = 0;
    if (extraTo === 'cook') extraToCook = extra;
    else if (extraTo === 'delivery') extraToDelivery = extra;
    else if (extraTo === 'split') {
      extraToCook = Math.floor(extra / 2);
      extraToDelivery = extra - extraToCook;
    }
    // أنشئ الطلب مع جميع الحقول المطلوبة
    const order = await Order.create({
      client_name: "محتاج",
      client_id: req.user._id,
      address: req.user.address || "تبرع",
      phone: req.user.phone || "تبرع",
      meals: [{
        mealId: meal,
        quantity,
        price: mealDoc.price,
        cookId: mealDoc.cook?.cookId,
        cookName: mealDoc.cook?.name,
        mealName: mealDoc.name
      }],
      total_price: total,
      final_amount: total,
      payment: {
        method: "cash", // استخدم cash مؤقتًا حتى يتم دعم donation في الـ schema
        status: "paid",
        amount_due: 0,
        paid: total,
        refunded: 0,
      },
      status: "pending",
    });
    // سجل التبرع
    const donation = await Donation.create({
      donor: req.user._id,
      amount: total + extra,
      meal,
      toOrder: order._id,
      message,
      extra,
      extraTo,
      extraToCook,
      extraToDelivery,
    });
    res.status(201).json({ message: 'تم التبرع بوجبة بنجاح', donation, order });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء التبرع', error: err.message, stack: err.stack });
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
