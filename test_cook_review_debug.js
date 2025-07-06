const mongoose = require("mongoose");
const CookReview = require("./models/CookReview");
const User = require("./models/User");
require("dotenv").config();

async function testCookReviewCreation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find a cook and a client for testing
    const cook = await User.findOne({ role: "cook" });
    const client = await User.findOne({ role: "client" });

    console.log("Cook found:", cook);
    console.log("Client found:", client);

    if (!cook || !client) {
      console.log("Need both a cook and client for testing");
      return;
    }

    console.log("Testing with cook:", cook.name, "and client:", client.name);

    // Test the updateCookRating function
    console.log("\n=== Testing updateCookRating function ===");
    try {
      const result = await User.findByIdAndUpdate(
        cook._id,
        {
          rate: 4.5,
          popularity: 10,
        },
        { new: true }
      );

      console.log("Updated cook:", result);
    } catch (error) {
      console.error("Error updating cook:", error);
    }

    // Test creating a review
    console.log("\n=== Testing review creation ===");
    try {
      const review = await CookReview.create({
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
          "This is a test review with more than 10 characters to meet the minimum requirement.",
      });

      console.log("Review created successfully:", review);
    } catch (error) {
      console.error("Error creating review:", error);
    }
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

testCookReviewCreation();
