const User = require("../models/User");
const bcrypt = require("bcrypt");

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  const users = await User.find({}, "-password");
  res.json(users);
};

// Create user (admin only)
const createUser = async (req, res) => {
  const { name, email, password, phone, address, role, isVerified } = req.body;

  if (!name || !email || !password || !phone || !address) {
    return res.status(400).json({ message: "جميع الحقول مطلوبة" });
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "المستخدم موجود بالفعل" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    name,
    email,
    password: hashedPassword,
    phone,
    address,
    role,
    isVerified: isVerified !== undefined ? isVerified : false,
  });
  await user.save();
  res.status(201).json({
    message: "تم إنشاء المستخدم بنجاح",
    user: { ...user.toObject(), password: undefined },
  });
};

// Update user (admin only)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, phone, address, role, isVerified } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (role) user.role = role;
  if (password) user.password = await bcrypt.hash(password, 10);
  if (isVerified !== undefined) user.isVerified = isVerified;
  await user.save();
  res.json({
    message: "تم تحديث المستخدم بنجاح",
    user: { ...user.toObject(), password: undefined },
  });
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
  res.json({ message: "تم حذف المستخدم بنجاح" });
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
