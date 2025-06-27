require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./models/Order");

// Generate sample ObjectIds for client, cook, and meal
const clientId = new mongoose.Types.ObjectId();
const cookId = new mongoose.Types.ObjectId();
const meal1Id = new mongoose.Types.ObjectId();

async function setupOrders() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Insert order
  await Order.create({
    userId: clientId,
    meals: [{ mealId: meal1Id, quantity: 2 }],
    isDonation: false,
    shippingAddress: "عين شمس، القاهرة",
    cookId,
    shippingType: "delivery",
    status: "pending",
    createdAt: new Date(),
  });

  console.log("Sample order inserted!");
  mongoose.disconnect();
}

setupOrders().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
