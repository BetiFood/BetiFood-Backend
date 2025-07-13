const { MongoClient } = require("mongodb");

// Replace with your actual MongoDB Atlas connection string
const url =
  "mongodb+srv://Ali_Fathy:XoXo2712zozo2000@betifood-culster0.twthzbf.mongodb.net";
const dbName = "BetiFood";

const users = [
  {
    name: "Ali Fathy",
    email: "ali@example.com",
    password: "hashed_password",
    phone: "01012345678",
    address: "Cairo, Egypt",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    role: "client",
    isVerified: false,
    createdAt: new Date(),
  },
  {
    name: "Fatma Hassan",
    email: "fatma@example.com",
    password: "hashed_password",
    phone: "01098765432",
    address: "Giza, Egypt",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    role: "cook",
    isVerified: false,
    createdAt: new Date(),
  },
  {
    name: "Omar Adel",
    email: "omar@example.com",
    password: "hashed_password",
    phone: "01122233445",
    address: "Heliopolis, Cairo",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    role: "delivery",
    isVerified: false,
    createdAt: new Date(),
  },
  {
    name: "Admin",
    email: "admin@example.com",
    password: "hashed_password",
    phone: "01200000000",
    address: "Nasr City, Cairo",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    role: "admin",
    isVerified: false,
    createdAt: new Date(),
  },
];

async function setupUsers() {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections({ name: "users" }).toArray();
    if (collections.length === 0) {
      await db.createCollection("users");
    }
    const usersCollection = db.collection("users");
    await usersCollection.insertMany(users);
    console.log("users collection setup complete");
  } catch (err) {
    console.error("Error setting up users collection:", err);
  } finally {
    await client.close();
  }
}

setupUsers();
