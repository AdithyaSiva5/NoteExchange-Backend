const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [15, "Name cannot exceed 15 characters"], // Max 15 chars for name
  },
  profilePicture: { type: String, default: "" },
  googleId: { type: String, sparse: true, unique: true },
  creator: { type: Boolean, default: false },
  premium: { type: Boolean, default: false },
  premiumExpiresAt: { type: Date, default: null },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  blocked: { type: Boolean, default: false },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email: email.toLowerCase() });
  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw new Error("Invalid login credentials");
  }
  return user;
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);
