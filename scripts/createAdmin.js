require("dotenv").config({
  path: `.env`,
});
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const Admin = require("../models/admin"); // Changed from User to Admin

const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
const DB_URL = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function createAdmin() {
  let connection;
  try {
    connection = await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const email = await question("Enter admin email: ");
    const name = await question("Enter admin name: ");
    const password = await question("Enter admin password: ");

    // Basic validation
    if (!email || !name || !password) {
      throw new Error("All fields are required");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new Error("Admin with this email already exists");
    }

    // Create new admin using Admin model
    const admin = new Admin({
      email,
      password, // Password will be hashed by pre-save middleware
      name,
      role: "super", // Add role for super admin
    });

    await admin.save();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.code === 11000) {
      console.error("This email is already registered as an admin.");
    }
    if (process.env.NODE_ENV === "development") {
      console.error("\nFull error:", error);
    }
  } finally {
    if (connection) {
      await connection.disconnect();
    }
    rl.close();
    process.exit(0);
  }
}

// Handle promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

createAdmin();
