const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Admin = require("../models/admin");

const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token provided");

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) throw new Error("User not found");
      req.user = user;
      req.isCreator = user.creator; // Add creator flag
    } catch (userError) {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      const admin = await Admin.findById(decoded.id);
      if (!admin) throw new Error("Admin not found");
      req.admin = admin;
      req.isCreator = true; // Admins are implicitly creators
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, msg: "Please authenticate" });
  }
};

const creatorOrAdminOnly = async (req, res, next) => {
  try {
    if (!req.isCreator) {
      return res
        .status(403)
        .json({ success: false, msg: "Creator or admin access required" });
    }
    next();
  } catch (error) {
    res.status(403).json({ success: false, msg: "Access denied" });
  }
};

module.exports = { authenticate, creatorOrAdminOnly };
