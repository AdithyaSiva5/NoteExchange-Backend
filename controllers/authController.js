const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
//const { errorLogger } = require("../helpers/logger");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// Update the register method to accept profilePicture
exports.register = async (req, res) => {
  try {
    const { email, password, name, profilePicture } = req.body;
    const normalizedEmail = email.toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res
        .status(400)
        .json({ success: false, msg: "Email already registered" });
    }

    const user = new User({
      email: normalizedEmail,
      password,
      name: name.trim(),
      profilePicture: profilePicture || "",
    });
    await user.save();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: user.toJSON(),
    });
  } catch (error) {
    // errorLogger.error("Registration error:", error);
    res
      .status(500)
      .json({ success: false, msg: "An error occurred during registration" });
  }
};

// Update the login method to include profilePicture in response
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    // if (!user || !(await user.comparePassword(password))) {
    //   // errorLogger.warn(`Failed login attempt for email: ${email}`);
    //   return res
    //     .status(401)
    //     .json({ success: false, msg: "Invalid credentials" });
    // }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({
      success: true,
      token: `Bearer ${token}`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        creator: user.creator,
        premium: user.premium,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    // errorLogger.error("Login error:", error);
    res.status(500).json({ success: false, msg: "Wrong Credentials" });
  }
};

exports.googleAuthCallback = async (req, res) => {
  if (req.user.blocked) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=user_blocked`);
  }
  const token = generateToken(req.user);
  const refreshToken = generateRefreshToken(req.user);
  res.redirect(
    `${process.env.FRONTEND_URL}?token=${token}&refreshToken=${refreshToken}`
  );
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, msg: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== "refresh") {
      return res
        .status(401)
        .json({ success: false, msg: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const newToken = generateToken(user);
    res.json({ success: true, token: newToken });
  } catch (error) {
    res
      .status(401)
      .json({ success: false, msg: "Invalid or expired refresh token" });
  }
};

exports.getMe = (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      creator: req.user.creator,
      premium: req.user.premium,
    },
  });
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    if (!user.password) {
      return res.status(400).json({
        success: false,
        msg: "Password updates are not available for Google-authenticated accounts.",
      });
    }

    if (!(await user.comparePassword(currentPassword))) {
      return res
        .status(400)
        .json({ success: false, msg: "Current password is incorrect" });
    }

    await User.updatePassword(user._id, newPassword);
    res.json({ success: true, msg: "Password updated successfully" });
  } catch (error) {
    // errorLogger.error("Password update error:", error);
    res
      .status(500)
      .json({ success: false, msg: "An internal server error occurred" });
  }
};

exports.updateName = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, msg: "Name must be at least 2 characters" });
    }
    if (name.length > 15) {
      return res
        .status(400)
        .json({ success: false, msg: "Name cannot exceed 15 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    user.name = name.trim();
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
    console.error("Update Name Error:", error);
    res
      .status(500)
      .json({ success: false, msg: "Server error", error: error.message });
  }
};

// Update the getProfile method to include profilePicture
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (
      user.premium &&
      user.premiumExpiresAt &&
      new Date() > user.premiumExpiresAt
    ) {
      user.premium = false;
      user.premiumExpiresAt = null;
      await user.save();
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        creator: user.creator,
        premium: user.premium,
        premiumExpiresAt: user.premiumExpiresAt,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.premium = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error("User not found:", req.user._id);
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    user.premium = true;
    user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month from now
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
    console.error("Error activating premium:", error.message, error.stack);
    res
      .status(500)
      .json({ success: false, msg: "Server error", error: error.message });
  }
};
