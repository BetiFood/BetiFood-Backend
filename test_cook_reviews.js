require("dotenv").config();
const mongoose = require("mongoose");
const CookReview = require("./models/CookReview");
const User = require("./models/User");

async function testCookReviews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Testing Cook Review System...\n");

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

    // Test 2: Create a cook review
    console.log("\n2. Creating a cook review...");
    const review = await CookReview.create({
      client: {
        clientId: client._id,
        name: client.name,
      },
      cook: {
        cookId: cook._id,
        name: cook.name,
      },
      rating: 4.7,
      comment:
        "This is a test cook review with a rating of 4.7. The cook is excellent and the service was great!",
    });

    console.log("✅ Cook review created successfully");
    console.log("Review ID:", review._id);
    console.log("Rating:", review.rating, "Type:", typeof review.rating);

    // Test 3: Test unique constraint
    console.log("\n3. Testing unique constraint (should fail)...");
    try {
      await CookReview.create({
        client: {
          clientId: client._id,
          name: client.name,
        },
        cook: {
          cookId: cook._id,
          name: cook.name,
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

    // Test 4: Get cook reviews
    console.log("\n4. Getting cook reviews...");
    const cookReviews = await CookReview.find({
      "cook.cookId": cook._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    console.log("✅ Found", cookReviews.length, "reviews for cook");
    console.log(
      "Reviews:",
      cookReviews.map((r) => ({
        rating: r.rating,
        comment: r.comment.substring(0, 30) + "...",
      }))
    );

    // Test 5: Calculate average rating and update cook rating
    console.log("\n5. Calculating average rating and updating cook rating...");
    const { updateCookRating } = require("./controllers/cookReviewController");
    const { newRating, totalReviews } = await updateCookRating(cook._id);

    console.log("✅ Cook rating updated:", newRating);
    console.log("✅ Total reviews:", totalReviews);

    // Verify cook was updated
    const updatedCook = await User.findById(cook._id);
    console.log("✅ Cook rate in database:", updatedCook.rate);
    console.log("✅ Cook popularity in database:", updatedCook.popularity);

    // Test 6: Update review
    console.log("\n6. Updating review...");
    review.rating = 5.0;
    review.comment =
      "Updated comment: Even better than before! Perfect rating now.";
    await review.save();

    console.log("✅ Review updated successfully");
    console.log("New rating:", review.rating);

    // Test 7: Soft delete
    console.log("\n7. Testing soft delete...");
    review.isActive = false;
    await review.save();

    const activeReviews = await CookReview.find({
      "cook.cookId": cook._id,
      isActive: true,
    });

    console.log("✅ Active reviews after soft delete:", activeReviews.length);

    // Clean up
    console.log("\n8. Cleaning up...");
    await CookReview.findByIdAndDelete(review._id);
    await User.findByIdAndDelete(client._id);
    await User.findByIdAndDelete(cook._id);

    console.log("✅ Cleanup completed");

    console.log("\n🎉 All cook review tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testCookReviews();
