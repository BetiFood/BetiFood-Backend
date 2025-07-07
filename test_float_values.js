require("dotenv").config();
const mongoose = require("mongoose");
const Meal = require("./models/Meal");

async function testFloatValues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Testing float values for rate and popularity...");

    // Create a test meal with float values
    const testMeal = await Meal.create({
      name: "Test Meal",
      description: "Test meal for float values",
      price: 25,
      category: {
        categoryId: new mongoose.Types.ObjectId(),
        categoryName: "Test Category",
      },
      cook: {
        cookId: new mongoose.Types.ObjectId(),
        name: "Test Cook",
      },
      quantity: 10,
      rate: 4.7,
      popularity: 87.3,
      images: ["https://example.com/test.jpg"],
    });

    console.log("Created meal with float values:");
    console.log("Rate:", testMeal.rate, "Type:", typeof testMeal.rate);
    console.log(
      "Popularity:",
      testMeal.popularity,
      "Type:",
      typeof testMeal.popularity
    );

    // Test updating with float values
    testMeal.rate = 3.8;
    testMeal.popularity = 95.7;
    await testMeal.save();

    console.log("\nAfter update:");
    console.log("Rate:", testMeal.rate, "Type:", typeof testMeal.rate);
    console.log(
      "Popularity:",
      testMeal.popularity,
      "Type:",
      typeof testMeal.popularity
    );

    // Test retrieving the meal
    const retrievedMeal = await Meal.findById(testMeal._id);
    console.log("\nRetrieved meal:");
    console.log(
      "Rate:",
      retrievedMeal.rate,
      "Type:",
      typeof retrievedMeal.rate
    );
    console.log(
      "Popularity:",
      retrievedMeal.popularity,
      "Type:",
      typeof retrievedMeal.popularity
    );

    // Clean up
    await Meal.findByIdAndDelete(testMeal._id);
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testFloatValues();
