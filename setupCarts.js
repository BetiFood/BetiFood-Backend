require("dotenv").config();
const mongoose = require("mongoose");
const Cart = require("./models/Cart");

// Generate sample ObjectIds for client and meals
const clientId = new mongoose.Types.ObjectId();
const meal1Id = new mongoose.Types.ObjectId();
const meal2Id = new mongoose.Types.ObjectId();

async function setupCarts() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Insert cart
  await Cart.create({
    userId: clientId,
    items: [
      { mealId: meal1Id, quantity: 2 },
      { mealId: meal2Id, quantity: 1 },
    ],
    updatedAt: new Date(),
  });

  console.log("Sample cart inserted!");
  mongoose.disconnect();
}

setupCarts().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
