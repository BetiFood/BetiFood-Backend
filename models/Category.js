const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [2, "اسم التصنيف يجب أن يكون على الأقل حرفين"],
      maxlength: [50, "اسم التصنيف لا يمكن أن يتجاوز 50 حرف"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "وصف التصنيف لا يمكن أن يتجاوز 200 حرف"],
    },
    createdBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ["admin", "cook"],
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance (name index is already created by unique: true)
categorySchema.index({ "createdBy.userId": 1 });
categorySchema.index({ isActive: 1 });

module.exports = mongoose.model("Category", categorySchema);
