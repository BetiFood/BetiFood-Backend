const Charity = require("../models/Charity");

// إضافة جمعية جديدة
exports.createCharity = async (req, res) => {
  try {
    const { name, description, address, phone, email, website } = req.body;

    const image = req.file ? req.file.path : undefined;

    const createdBy = req.user._id;

    const newCharity = new Charity({
      name,
      description,
      address,
      phone,
      email,
      website,
      image,
      createdBy:req.userId,
    });
    await newCharity.save();
    // بناء رابط الصورة الكامل
    let imageUrl = undefined;
    if (newCharity.image) {
      imageUrl = req.protocol + '://' + req.get('host') + '/' + newCharity.image.replace('\\', '/').replace(/^uploads[\\/]/, 'uploads/');
      if (!imageUrl.includes('/uploads/')) {
        imageUrl = req.protocol + '://' + req.get('host') + '/uploads/' + newCharity.image;
      }
    }
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
        createdAt: newCharity.createdAt
      }
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
    // دعم تحديث الصورة إذا تم رفع صورة جديدة
    if (req.file) {
      updateData.image = req.file.path;
    } else if (req.body.image) {
      updateData.image = req.body.image;
    }
    const updatedCharity = await Charity.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    // بناء رابط الصورة
    let image = undefined;
    if (updatedCharity && updatedCharity.image) {
      // لو الصورة رابط خارجي (مثلاً يبدأ بـ http)
      if (updatedCharity.image.startsWith('http')) {
        image = updatedCharity.image;
      } else {
        image = req.protocol + '://' + req.get('host') + '/' + updatedCharity.image.replace('\\', '/').replace(/^uploads[\\/]/, 'uploads/');
        if (!image.includes('/uploads/')) {
          image = req.protocol + '://' + req.get('host') + '/uploads/' + updatedCharity.image;
        }
      }
    }
    res.json({
      success: true,
      message: "تم تعديل الجمعية بنجاح",
      charity: updatedCharity ? {
        id: updatedCharity._id,
        name: updatedCharity.name,
        description: updatedCharity.description,
        address: updatedCharity.address,
        phone: updatedCharity.phone,
        email: updatedCharity.email,
        website: updatedCharity.website,
        image: image,
      } : null
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
