const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const User = require("../models/user");
const Post = require("../models/post");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || !(await admin.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id }, process.env.ADMIN_JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      token: `Bearer ${token}`,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({}, { password: 0 }).skip(skip).limit(limit);
    const total = await User.countDocuments();

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Error fetching users" });
  }
};

exports.toggleCreator = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    user.creator = !user.creator;
    await user.save();
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        creator: user.creator,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const admin = new Admin({ email, password, name, role });
    await admin.save();
    res.status(201).json({ success: true, msg: "Admin created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.premium = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    user.premium = !user.premium;
    if (user.premium) {
      user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month
    } else {
      user.premiumExpiresAt = null;
    }
    await user.save();
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        creator: user.creator,
        premium: user.premium,
        premiumExpiresAt: user.premiumExpiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.searchUser = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res
        .status(400)
        .json({ success: false, msg: "Search query is required" });
    }

    const users = await User.find(
      {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      },
      { password: 0 }
    ).limit(20);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Error searching users" });
  }
};

exports.block = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    user.blocked = !user.blocked;
    await user.save();
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        creator: user.creator,
        premium: user.premium,
        premiumExpiresAt: user.premiumExpiresAt,
        blocked: user.blocked,
      },
    });
  } catch (error) {
    console.error("Toggle Block Error:", error);
    res
      .status(500)
      .json({ success: false, msg: "Server error", error: error.message });
  }
};
