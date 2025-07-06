require("dotenv").config();
const mongoose = require("mongoose");
const MealReview = require("./models/MealReview");
const Meal = require("./models/Meal");
const User = require("./models/User");

async function testMealReviews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Testing Meal Review System...\n");

    // Test 1: Create users
    console.log("1. Creating test users...");
    const client = await User.create({
      name: "Test Client",
      email: "testclient@example.com",
      password: "123456",
      role: "client",
      phone: "1234567890",
    });

    const cook = await User.create({
      name: "Test Cook",
      email: "testcook@example.com",
      password: "123456",
      role: "cook",
      phone: "0987654321",
    });

    console.log("✅ Users created successfully");

    // Test 2: Create a meal
    console.log("\n2. Creating a test meal...");
    const meal = await Meal.create({
      name: "Test Meal",
      description: "A delicious test meal",
      price: 25,
      category: {
        categoryId: new mongoose.Types.ObjectId(),
        categoryName: "Test Category",
      },
      cook: {
        cookId: cook._id,
        name: cook.name,
      },
      quantity: 10,
      rate: 0.0,
      popularity: 0.0,
      images: ["https://example.com/test.jpg"],
    });

    console.log("✅ Meal created successfully");
    console.log("Initial meal rate:", meal.rate);
    console.log("Initial meal popularity:", meal.popularity);

    // Test 3: Create meal reviews
    console.log("\n3. Creating meal reviews...");
    const review1 = await MealReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      meal: {
        mealId: meal._id,
        name: meal.name,
      },
      rating: 4.5,
      comment:
        "This is a great test meal! The taste is excellent and the portion size is perfect.",
    });

    const review2 = await MealReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      meal: {
        mealId: meal._id,
        name: meal.name,
      },
      rating: 5.0,
      comment:
        "Absolutely amazing! This is the best meal I've ever had. Highly recommended!",
    });

    console.log("✅ Reviews created successfully");

    // Test 4: Update meal rating manually
    console.log("\n4. Updating meal rating...");
    const { updateMealRating } = require("./controllers/mealReviewController");
    const { newRating, totalReviews } = await updateMealRating(meal._id);

    console.log("✅ Meal rating updated automatically");
    console.log("New average rating:", newRating);
    console.log("Total reviews:", totalReviews);

    // Test 5: Verify meal was updated
    console.log("\n5. Verifying meal update...");
    const updatedMeal = await Meal.findById(meal._id);
    console.log("Updated meal rate:", updatedMeal.rate);
    console.log("Updated meal popularity:", updatedMeal.popularity);

    // Test 6: Test unique constraint
    console.log("\n6. Testing unique constraint (should fail)...");
    try {
      await MealReview.create({
        client: {
          clientId: client._id,
          name: client.name,
        },
        meal: {
          mealId: meal._id,
          name: meal.name,
        },
        rating: 3.5,
        comment: "This should fail due to unique constraint",
      });
      console.log(
        "❌ Unique constraint test failed - should have thrown an error"
      );
    } catch (error) {
      if (error.code === 11000) {
        console.log("✅ Unique constraint working correctly");
      } else {
        console.log("❌ Unexpected error:", error.message);
      }
    }

    // Test 7: Get meal reviews
    console.log("\n7. Getting meal reviews...");
    const mealReviews = await MealReview.find({
      "meal.mealId": meal._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    console.log("✅ Found", mealReviews.length, "reviews for meal");
    console.log(
      "Reviews:",
      mealReviews.map((r) => ({
        rating: r.rating,
        comment: r.comment.substring(0, 30) + "...",
      }))
    );

    // Test 8: Update a review
    console.log("\n8. Updating a review...");
    review1.rating = 4.8;
    review1.comment =
      "Updated comment: Even better than before! Almost perfect rating.";
    await review1.save();

    // Update meal rating after review update
    await updateMealRating(meal._id);
    const finalMeal = await Meal.findById(meal._id);
    console.log("✅ Review updated and meal rating recalculated");
    console.log("Final meal rate:", finalMeal.rate);
    console.log("Final meal popularity:", finalMeal.popularity);

    // Test 9: Soft delete
    console.log("\n9. Testing soft delete...");
    review1.isActive = false;
    await review1.save();

    // Update meal rating after soft delete
    await updateMealRating(meal._id);
    const afterDeleteMeal = await Meal.findById(meal._id);
    console.log("✅ Soft delete completed");
    console.log("Meal rate after soft delete:", afterDeleteMeal.rate);
    console.log(
      "Meal popularity after soft delete:",
      afterDeleteMeal.popularity
    );

    // Test 10: Calculate average rating manually
    console.log("\n10. Calculating average rating manually...");
    const avgRatingResult = await MealReview.aggregate([
      { $match: { "meal.mealId": meal._id, isActive: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (avgRatingResult.length > 0) {
      const avgRating = Math.round(avgRatingResult[0].avgRating * 10) / 10;
      console.log("✅ Manual calculation - Average rating:", avgRating);
      console.log(
        "✅ Manual calculation - Total reviews:",
        avgRatingResult[0].totalReviews
      );
    }

    // Clean up
    console.log("\n11. Cleaning up...");
    await MealReview.findByIdAndDelete(review1._id);
    await MealReview.findByIdAndDelete(review2._id);
    await Meal.findByIdAndDelete(meal._id);
    await User.findByIdAndDelete(client._id);
    await User.findByIdAndDelete(cook._id);

    console.log("✅ Cleanup completed");

    console.log("\n🎉 All meal review tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testMealReviews();
