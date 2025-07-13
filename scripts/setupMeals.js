require("dotenv").config();
const mongoose = require("mongoose");
const Meal = require("../models/Meal");

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
    ingredients: [
      "أرز",
      "عدس",
      "مكرونة",
      "بصل مقلي",
      "صلصة طماطم",
      "حمص",
      "خل",
    ],
    price: 30,
    category: {
      categoryId: new mongoose.Types.ObjectId(),
      categoryName: "وجبات مصرية",
    },
    cook: {
      cookId: cookId,
      name: "أحمد محمد",
    },
    quantity: 10,
    rate: 4.5,
    popularity: 85.5,
    images: ["https://example.com/koshary.jpg"],
    createdAt: new Date(),
  });

  const meal2 = await Meal.create({
    name: "محشي ورق عنب",
    description: "محشي ورق عنب مع سلطة زبادي",
    ingredients: ["أرز", "ورق عنب", "زيت زيتون", "ليمون", "ملح", "فلفل أسود"],
    price: 50,
    category: {
      categoryId: new mongoose.Types.ObjectId(),
      categoryName: "وجبات شامية",
    },
    cook: {
      cookId: cookId,
      name: "أحمد محمد",
    },
    quantity: 20,
    rate: 4.8,
    popularity: 92.3,
    images: ["https://example.com/warak.jpg"],
    createdAt: new Date(),
  });

  console.log("Sample meals inserted!");
  mongoose.disconnect();
}

setupMeals().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
