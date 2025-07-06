require("dotenv").config();
const mongoose = require("mongoose");
const MealReview = require("../models/MealReview");
const User = require("../models/User");
const Meal = require("../models/Meal");

async function setupMealReviews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Get or create sample users
    let client = await User.findOne({ role: "client" });
    let cook = await User.findOne({ role: "cook" });

    if (!client) {
      client = await User.create({
        name: "أحمد العميل",
        email: "client@example.com",
        password: "123456",
        role: "client",
        phone: "0123456789",
      });
    }

    if (!cook) {
      cook = await User.create({
        name: "محمد الطاهي",
        email: "cook@example.com",
        password: "123456",
        role: "cook",
        phone: "0987654321",
      });
    }

    // Get or create sample meals
    let meal1 = await Meal.findOne({ name: "كشري" });
    let meal2 = await Meal.findOne({ name: "محشي ورق عنب" });

    if (!meal1) {
      meal1 = await Meal.create({
        name: "كشري",
        description: "كشري مصري أصلي",
        price: 30,
        category: {
          categoryId: new mongoose.Types.ObjectId(),
          categoryName: "وجبات مصرية",
        },
        cook: {
          cookId: cook._id,
          name: cook.name,
        },
        quantity: 10,
        rate: 0.0,
        popularity: 0.0,
        images: ["https://example.com/koshary.jpg"],
      });
    }

    if (!meal2) {
      meal2 = await Meal.create({
        name: "محشي ورق عنب",
        description: "محشي ورق عنب مع سلطة زبادي",
        price: 50,
        category: {
          categoryId: new mongoose.Types.ObjectId(),
          categoryName: "وجبات شامية",
        },
        cook: {
          cookId: cook._id,
          name: cook.name,
        },
        quantity: 20,
        rate: 0.0,
        popularity: 0.0,
        images: ["https://example.com/warak.jpg"],
      });
    }

    // Create sample meal reviews
    const mealReview1 = await MealReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      meal: {
        mealId: meal1._id,
        name: meal1.name,
      },
      rating: 4.8,
      comment:
        "الكشري كان ممتاز جداً! الطعم أصلي والنظافة ممتازة. سأطلب منه مرة أخرى بالتأكيد.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mealReview2 = await MealReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      meal: {
        mealId: meal2._id,
        name: meal2.name,
      },
      rating: 5.0,
      comment:
        "محشي ورق العنب كان رائع! الطعم لذيذ جداً والكمية مناسبة. أنصح الجميع بتجربته.",
      isActive: true,
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000),
    });

    const mealReview3 = await MealReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      meal: {
        mealId: meal1._id,
        name: meal1.name,
      },
      rating: 4.5,
      comment:
        "الكشري جيد جداً، الطعم أصلي والسعر مناسب. التوصيل كان سريعاً أيضاً.",
      isActive: true,
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      updatedAt: new Date(Date.now() - 172800000),
    });

    console.log("Sample meal reviews created successfully!");
    console.log("Client ID:", client._id);
    console.log("Cook ID:", cook._id);
    console.log("Meal 1 ID:", meal1._id);
    console.log("Meal 2 ID:", meal2._id);
    console.log("Meal Reviews created:", [
      mealReview1._id,
      mealReview2._id,
      mealReview3._id,
    ]);

    // Update meal ratings
    const { updateMealRating } = require("../controllers/mealReviewController");
    await updateMealRating(meal1._id);
    await updateMealRating(meal2._id);

    console.log("Meal ratings updated automatically!");
  } catch (error) {
    console.error("Error setting up meal reviews:", error);
  } finally {
    await mongoose.disconnect();
  }
}

setupMealReviews();
