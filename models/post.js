const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, "Title cannot exceed 50 characters"], // Max 50 chars for title
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [4001, "Description cannot exceed 1000 characters"], // Max 1000 chars for description
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approved: { type: Boolean, default: false },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "approvedByModel",
  }, // No default
  approvedByModel: { type: String, enum: ["Admin", "User"] },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  likeCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Post", postSchema);
