const mongoose = require("mongoose");

// Meal schema for embedded meals in orders (single cook per order)
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

    // Cook information (single cook per order)
    cook_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cook_name: {
      type: String,
      required: true,
    },

    // Meals array (all meals from this cook)
    meals: [mealSchema],

    // Delivery info (optional, can be expanded as needed)
    delivery: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
      },
      status: {
        type: String,
        enum: ["pending", "accepted"],
        default: "pending",
      },
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
        "confirmed",
        "cancelled",
      ],
      default: "pending",
    },

    // Charity and donation fields
    toCharity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Charity",
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
    },

    // Additional fields
    notes: { type: String },
    estimated_delivery_time: { type: Date },

    // Checkout ID to link orders from the same client checkout
    checkoutId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate final_amount
orderSchema.pre("save", function (next) {
  try {
    let totalMealsPrice = 0;
    for (const meal of this.meals) {
      totalMealsPrice += meal.price * meal.quantity;
    }
    this.total_delivery_fee = this.delivery_fee || 0;
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
