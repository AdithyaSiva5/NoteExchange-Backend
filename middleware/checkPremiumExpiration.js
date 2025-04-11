const User = require("../models/user");

const checkPremiumExpiration = async (req, res, next) => {
  if (req.user) {
    const user = await User.findById(req.user._id);
    if (
      user.premium &&
      user.premiumExpiresAt &&
      new Date() > user.premiumExpiresAt
    ) {
      user.premium = false;
      user.premiumExpiresAt = null;
      await user.save();
      req.user = user;
    }
  }
  next();
};

module.exports = checkPremiumExpiration;
