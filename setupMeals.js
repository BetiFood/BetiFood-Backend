require("dotenv").config();
const mongoose = require("mongoose");
const Meal = require("./models/Meal");

// Generate sample ObjectId for cook
const cookId = new mongoose.Types.ObjectId();

async function setupMeals() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Insert meals
  const meal1 = await Meal.create({
    name: "كشري",
    description: "كشري مصري أصلي",
    price: 30,
    category: "وجبات مصرية",
    cookId,
    quantity: 10,
    rate: 0.0,
    image: "https://example.com/koshary.jpg",
    createdAt: new Date(),
  });

  const meal2 = await Meal.create({
    name: "محشي ورق عنب",
    description: "محشي ورق عنب مع سلطة زبادي",
    price: 50,
    category: "وجبات شامية",
    cookId,
    quantity: 20,
    rate: 0.0,
    image: "https://example.com/warak.jpg",
    createdAt: new Date(),
  });

  console.log("Sample meals inserted!");
  mongoose.disconnect();
}

setupMeals().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
