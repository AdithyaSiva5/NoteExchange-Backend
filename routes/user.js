const express = require("express");
const router = express.Router();
const passport = require("passport");
const rateLimit = require("express-rate-limit");
const Joi = require("joi");

const authController = require("../controllers/authController");
const params_validator = require("../helpers/params-validator");

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
});

// Google Authentication routes
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false,
  }),
  authController.googleAuthCallback
);

router.post(
  "/login",
  loginLimiter,
  params_validator.validateParams({
    email: Joi.string().email().required().trim(),
    password: Joi.string().min(6).required(),
  }),
  authController.login
);

router.post(
  "/signup",
  params_validator.validateParams({
    email: Joi.string().email().required().trim(),
    password: Joi.string()
      .min(8)
      .pattern(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
      )
      .required()
      .messages({
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),
    name: Joi.string().min(2).max(50).required().trim(),
  }),
  authController.register
);

// router.get(
//   "/profile",
//   passport.authenticate("jwt", { session: false }),
//   authController.getMe
// );

router.put(
  "/update-password",
  passport.authenticate("jwt", { session: false }),
  params_validator.validateParams({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .pattern(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
      )
      .required(),
    newConfirmPassword: Joi.string()
      .required()
      .valid(Joi.ref("newPassword"))
      .messages({ "any.only": "Passwords must match" }),
  }),
  authController.updatePassword
);

router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  authController.getProfile
);

router.post(
  "/premium",
  passport.authenticate("jwt", { session: false }),
  authController.premium
);

router.put(
  "/update-name",
  passport.authenticate("jwt", { session: false }),
  authController.updateName
);

router.post("/refresh-token", authController.refreshToken);

module.exports = router;
