const Charity = require("../models/Charity");
const cloudinary = require("cloudinary").v2;

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
