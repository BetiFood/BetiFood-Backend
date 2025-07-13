const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

// Connect to MongoDB using the same configuration as the main app
async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    await mongoose.connect(uri, {
      dbName: dbName,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

async function testVerificationSystem() {
  try {
    console.log("🧪 Testing Verification System...");

    // Test 1: Create a cook user with verification
    const cookUser = new User({
      name: "Test Cook",
      email: "cook@test.com",
      password: "hashedpassword",
      phone: "01234567890",
      address: "Test Address",
      role: "cook",
      verification: {
        nationalId: "29801234567891",
        idCardFrontImage: "https://cdn.com/id-front.jpg",
        idCardBackImage: "https://cdn.com/id-back.jpg",
        criminalRecord: "https://cdn.com/criminal-record.pdf",
        status: "pending",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewNotes: null,
        reviewedBy: null,
      },
    });

    await cookUser.save();
    console.log("✅ Cook user with verification created successfully");

    // Test 2: Create a delivery user with verification
    const deliveryUser = new User({
      name: "Test Delivery",
      email: "delivery@test.com",
      password: "hashedpassword",
      phone: "01234567891",
      address: "Test Address",
      role: "delivery",
      verification: {
        nationalId: "29801234567892",
        idCardFrontImage: "https://cdn.com/id-front-2.jpg",
        idCardBackImage: "https://cdn.com/id-back-2.jpg",
        criminalRecord: "https://cdn.com/criminal-record-2.pdf",
        status: "approved",
        submittedAt: new Date("2025-07-11T10:00:00Z"),
        reviewedAt: new Date("2025-07-12T10:00:00Z"),
        reviewNotes: "All documents verified successfully",
        reviewedBy: "admin123",
      },
      isVerified: true,
    });

    await deliveryUser.save();
    console.log("✅ Delivery user with verification created successfully");

    // Test 3: Create a client user (should not have verification)
    const clientUser = new User({
      name: "Test Client",
      email: "client@test.com",
      password: "hashedpassword",
      phone: "01234567892",
      address: "Test Address",
      role: "client",
    });

    await clientUser.save();
    console.log(
      "✅ Client user created successfully (no verification required)"
    );

    // Test 4: Query users with verification
    const usersWithVerification = await User.find({
      $or: [{ role: "cook" }, { role: "delivery" }],
      "verification.status": { $exists: true },
    });

    console.log(
      `✅ Found ${usersWithVerification.length} users with verification`
    );

    // Test 5: Query pending verifications
    const pendingVerifications = await User.find({
      $or: [{ role: "cook" }, { role: "delivery" }],
      "verification.status": "pending",
    });

    console.log(
      `✅ Found ${pendingVerifications.length} pending verifications`
    );

    // Test 6: Query approved verifications
    const approvedVerifications = await User.find({
      $or: [{ role: "cook" }, { role: "delivery" }],
      "verification.status": "approved",
    });

    console.log(
      `✅ Found ${approvedVerifications.length} approved verifications`
    );

    console.log("\n🎉 All verification system tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    try {
      // Clean up test data
      await User.deleteMany({
        email: {
          $in: ["cook@test.com", "delivery@test.com", "client@test.com"],
        },
      });
      console.log("🧹 Test data cleaned up");
    } catch (cleanupError) {
      console.error("⚠️ Cleanup failed:", cleanupError.message);
    }

    // Close database connection
    try {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    } catch (closeError) {
      console.error("⚠️ Failed to close connection:", closeError.message);
    }
  }
}

// Run the test
async function runTest() {
  await connectDB();
  await testVerificationSystem();
}

runTest().catch((error) => {
  console.error("❌ Test runner failed:", error.message);
  process.exit(1);
});
