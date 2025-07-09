// سكريبت لتحويل جميع userId إلى clientId في مجموعة الطلبات (orders)
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/betifood";

async function migrate() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const Order = mongoose.connection.collection("orders");

  // تحديث جميع المستندات: نسخ userId إلى clientId ثم حذف userId
  const result = await Order.updateMany({ userId: { $exists: true } }, [
    { $set: { clientId: "$userId" } },
    { $unset: "userId" },
  ]);

  console.log(
    `تم تحديث ${result.modifiedCount || result.nModified || 0} مستند.`
  );
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
