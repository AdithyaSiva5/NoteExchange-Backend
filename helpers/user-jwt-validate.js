const jwt = require("jsonwebtoken");

module.exports.validateUserJWTToken = function (user_token) {
  if (!user_token) {
    return false;
  }

  try {
    const token = user_token.startsWith("Bearer ")
      ? user_token.slice(7)
      : user_token;

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    return verified;
  } catch (error) {
    return false;
  }
};
