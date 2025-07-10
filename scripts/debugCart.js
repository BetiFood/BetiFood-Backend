// سكريبت لفحص cart.meals وmealId
const mongoose = require("mongoose");
const Cart = require("../models/Cart");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/betifood";

async function debugCart(clientId, mealId) {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const cart = await Cart.findOne({ clientId });
  if (!cart) {
    console.log("Cart not found");
    await mongoose.disconnect();
    return;
  }
  console.log("Meals in cart:");
  cart.meals.forEach((item, idx) => {
    console.log(`Index ${idx}:`, {
      mealId: item.mealId,
      mealIdStr: item.mealId.toString(),
      type: typeof item.mealId,
    });
  });
  console.log("Searching for mealId:", mealId, "as string:", String(mealId));
  const found = cart.meals.findIndex((item) => {
    const id = item.mealId._id ? item.mealId._id : item.mealId;
    return id.toString() === String(mealId);
  });
  console.log("Found index:", found);
  await mongoose.disconnect();
}

// usage: node scripts/debugCart.js <clientId> <mealId>
if (process.argv.length < 4) {
  console.log("❌ Usage: node scripts/debugCart.js <clientId> <mealId>");
  console.log("مثال: node scripts/debugCart.js 64b7e... 64b7e...");
  process.exit(1);
}
const clientId = process.argv[2];
const mealId = process.argv[3];

debugCart(clientId, mealId).catch((err) => {
  console.error("حدث خطأ أثناء تنفيذ السكريبت:", err.message);
  process.exit(1);
});
