const mongoose = require("mongoose");

// Meal schema for embedded meals in sub-orders
const mealSchema = new mongoose.Schema(
  {
    mealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meal",
      required: true,
    },
    mealName: {
      type: String,
      required: true,
    },
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cookName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "الكمية يجب أن تكون 1 على الأقل"],
    },
    price: {
      type: Number,
      required: true,
      min: [0, "السعر لا يمكن أن يكون سالب"],
    },
  },
  { _id: false }
);

// Sub-order schema for individual cook orders
const subOrderSchema = new mongoose.Schema(
  {
    cook_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cook_name: {
      type: String,
      required: true,
    },
    meals: [mealSchema], // Embedded meals for this cook
    delivery_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    delivery_name: {
      type: String,
    },
    delivery_status: {
      type: String,
      enum: ["pending", "preparing", "picked_up", "delivered"],
      default: "pending",
    },
    delivery_fee: {
      type: Number,
      default: 0,
      min: [0, "رسوم التوصيل لا يمكن أن تكون سالبة"],
    },
    delivery_distance_km: {
      type: Number,
      default: 0,
      min: [0, "المسافة لا يمكن أن تكون سالبة"],
    },
    picked_up_at: { type: Date },
    delivered_at: { type: Date },
    status: {
      type: String,
      enum: ["pending", "preparing", "completed", "cancelled"],
      default: "pending",
    },
  },
  { _id: true }
);

// Main order schema
const orderSchema = new mongoose.Schema(
  {
    // Client information
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    client_name: {
      type: String,
      required: true,
    },
    client_phone: {
      type: String,
      required: true,
    },
    client_address: {
      city: {
        type: String,
      },
      street: {
        type: String,
      },
      building_number: {
        type: String,
      },
    },
    location: {
      lat: {
        type: Number,
        required: true,
        min: [-90, "خط العرض يجب أن يكون بين -90 و 90"],
        max: [90, "خط العرض يجب أن يكون بين -90 و 90"],
      },
      lng: {
        type: Number,
        required: true,
        min: [-180, "خط الطول يجب أن يكون بين -180 و 180"],
        max: [180, "خط الطول يجب أن يكون بين -180 و 180"],
      },
    },

    // Sub-orders array
    subOrders: [subOrderSchema],

    // Payment information
    payment: {
      type: String,
      enum: ["cash", "online"],
      default: "cash",
    },
    final_amount: {
      type: Number,
      min: [0, "المبلغ النهائي لا يمكن أن يكون سالب"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "الضريبة لا يمكن أن تكون سالبة"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "الخصم لا يمكن أن يكون سالب"],
    },
    total_delivery_fee: {
      type: Number,
      default: 0,
      min: [0, "إجمالي رسوم التوصيل لا يمكن أن يكون سالب"],
    },

    // Order status
    status: {
      type: String,
      enum: [
        "pending",
        "preparing",
        "completed",
        "delivering",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    // Charity and donation fields
    toCharity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Charity",
    },
    isDonation: {
      type: Boolean,
      default: false,
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
    },

    // Additional fields
    notes: { type: String },
    estimated_delivery_time: { type: Date },
  },
  { timestamps: true }
);

// Pre-save hook to calculate final_amount
orderSchema.pre("save", function (next) {
  try {
    let totalMealsPrice = 0;

    // Calculate total meals price from all sub-orders
    for (const subOrder of this.subOrders) {
      for (const meal of subOrder.meals) {
        totalMealsPrice += meal.price * meal.quantity;
      }
    }

    // Calculate total delivery fee from all sub-orders
    this.total_delivery_fee = this.subOrders.reduce((total, subOrder) => {
      return total + (subOrder.delivery_fee || 0);
    }, 0);

    // Calculate final amount: meals + tax - discount + delivery fees
    this.final_amount =
      totalMealsPrice + this.tax - this.discount + this.total_delivery_fee;

    next();
  } catch (error) {
    next(error);
  }
});

// Index for geospatial queries
orderSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Order", orderSchema);
