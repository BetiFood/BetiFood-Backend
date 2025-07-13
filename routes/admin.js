const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/adminController");

const router = express.Router();

// All routes below are protected and admin-only
router.use(protect, admin);

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

module.exports = router;
