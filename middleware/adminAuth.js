const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token provided");
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    const admin = await Admin.findOne({ _id: decoded.id });

    if (!admin) throw new Error("Admin not found");
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ success: false, msg: "Please authenticate" });
  }
};

const superAdminOnly = async (req, res, next) => {
  try {
    if (req.admin.role !== "super") {
      return res.status(403).json({ success: false, msg: "Access denied" });
    }
    next();
  } catch (error) {
    res.status(403).json({ success: false, msg: "Access denied" });
  }
};

module.exports = { adminAuth, superAdminOnly };
