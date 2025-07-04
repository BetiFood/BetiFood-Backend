const Category = require("../models/Category");

// Get all categories (with optional inactive categories for admin)
const getAllCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = {};

    // Only show active categories unless admin requests inactive
    if (!includeInactive || req.user?.role !== "admin") {
      filter.isActive = true;
    }

    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res
      .status(500)
      .json({ message: "فشل في جلب التصنيفات", error: err.message });
  }
};

// Create category (admin/cook only)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "اسم التصنيف مطلوب" });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(409).json({ message: "التصنيف موجود بالفعل" });
    }

    const category = new Category({
      name: name.trim(),
      description: description?.trim(),
      createdBy: {
        userId: req.user._id,
        name: req.user.name,
        role: req.user.role,
      },
    });

    await category.save();
    res.status(201).json({
      message: "تم إنشاء التصنيف بنجاح",
      category,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "فشل في إنشاء التصنيف", error: err.message });
  }
};

// Update category (admin/cook only)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "التصنيف غير موجود" });
    }

    // Only admin can update isActive, or the creator can update other fields
    if (
      req.user.role !== "admin" &&
      category.createdBy.userId.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "غير مصرح لك بتعديل هذا التصنيف" });
    }

    if (name && name.trim() !== category.name) {
      // Check if new name already exists
      const existingCategory = await Category.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingCategory) {
        return res.status(409).json({ message: "اسم التصنيف موجود بالفعل" });
      }
      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description?.trim();
    }

    // Only admin can change isActive status
    if (req.user.role === "admin" && isActive !== undefined) {
      category.isActive = isActive;
    }

    await category.save();
    res.json({
      message: "تم تحديث التصنيف بنجاح",
      category,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "فشل في تحديث التصنيف", error: err.message });
  }
};

// Delete category (admin only)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "التصنيف غير موجود" });
    }

    // Check if category is being used by any meals
    const Meal = require("../models/Meal");
    const mealsUsingCategory = await Meal.findOne({
      "category.categoryId": id,
    });

    if (mealsUsingCategory) {
      return res.status(400).json({
        message: "لا يمكن حذف التصنيف لأنه مستخدم في وجبات موجودة",
      });
    }

    await Category.findByIdAndDelete(id);
    res.json({ message: "تم حذف التصنيف بنجاح" });
  } catch (err) {
    res.status(500).json({ message: "فشل في حذف التصنيف", error: err.message });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "التصنيف غير موجود" });
    }

    res.json(category);
  } catch (err) {
    res.status(500).json({ message: "فشل في جلب التصنيف", error: err.message });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
};
