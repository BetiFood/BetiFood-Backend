require("dotenv").config();
const mongoose = require("mongoose");
const CookReview = require("../models/CookReview");
const User = require("../models/User");

async function setupCookReviews() {
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

    // Create sample cook reviews
    const cookReview1 = await CookReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      cook: {
        cookId: cook._id,
        name: cook.name,
      },
      rating: 4.5,
      comment:
        "طعام ممتاز وطعم رائع! الطاهي محترف جداً في عمله. أنصح الجميع بتجربة طعامه.",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const cookReview2 = await CookReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      cook: {
        cookId: cook._id,
        name: cook.name,
      },
      rating: 5.0,
      comment:
        "أفضل طعام جربته في حياتي! النظافة والجودة ممتازة. سأطلب منه مرة أخرى بالتأكيد.",
      isActive: true,
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000),
    });

    const cookReview3 = await CookReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      cook: {
        cookId: cook._id,
        name: cook.name,
      },
      rating: 4.0,
      comment:
        "طعام جيد جداً، الطعم لذيذ والسعر مناسب. التوصيل كان سريعاً أيضاً.",
      isActive: true,
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      updatedAt: new Date(Date.now() - 172800000),
    });

    console.log("Sample cook reviews created successfully!");
    console.log("Client ID:", client._id);
    console.log("Cook ID:", cook._id);
    console.log("Cook Reviews created:", [
      cookReview1._id,
      cookReview2._id,
      cookReview3._id,
    ]);

    // Update cook ratings
    const { updateCookRating } = require("../controllers/cookReviewController");
    await updateCookRating(cook._id);

    console.log("Cook ratings updated automatically!");
  } catch (error) {
    console.error("Error setting up cook reviews:", error);
  } finally {
    await mongoose.disconnect();
  }
}

setupCookReviews();
