const express = require("express");
const router = express.Router();
const { authenticate, creatorOrAdminOnly } = require("../middleware/auth");
const { superAdminOnly } = require("../middleware/adminAuth");
const Post = require("../models/post");
const User = require("../models/user");
const jwt = require("jsonwebtoken"); // Ensure this is included

const CHAR_LIMIT = 4000; // Max limit for all posts
const CHAR_LIMIT_NON_PREMIUM_READ =
  parseInt(process.env.PREMIUM_CHAR_LIMIT) || 200; // Reading limit for non-premium from env
const TITLE_MAX = 50; // Max title length for all users
const DESC_MAX_CREATE = 4000; // Max description length for creation (both premium and non-premium)

router.post("/", authenticate, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, msg: "Title is required" });
    }
    if (title.length > TITLE_MAX) {
      return res.status(400).json({
        success: false,
        msg: `Title cannot exceed ${TITLE_MAX} characters`,
      });
    }

    if (!description || description.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, msg: "Description is required" });
    }

    // Allow all users (premium or not) to create posts up to 4000 characters
    if (description.length > DESC_MAX_CREATE) {
      return res.status(400).json({
        success: false,
        msg: `Description cannot exceed ${DESC_MAX_CREATE} characters`,
      });
    }

    const post = new Post({
      title,
      description,
      userId: req.user._id,
    });
    await post.save();
    res.status(201).json({ success: true, msg: "Post submitted for approval" });
  } catch (error) {
    console.error("Post Creation Error:", error);
    res
      .status(500)
      .json({ success: false, msg: "Server error", error: error.message });
  }
});

router.get("/", authenticate, creatorOrAdminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({})
      .populate("userId", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    res.json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.put(
  "/:id/approve",
  authenticate,
  creatorOrAdminOnly,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post)
        return res.status(404).json({ success: false, msg: "Post not found" });

      post.approved = true;
      post.approvedBy = req.admin ? req.admin._id : req.user._id;
      post.approvedByModel = req.admin ? "Admin" : "User";
      await post.save();
      res.json({ success: true, msg: "Post approved" });
    } catch (error) {
      res.status(500).json({ success: false, msg: "Server error" });
    }
  }
);

router.delete(
  "/:id/reject",
  authenticate,
  creatorOrAdminOnly,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post)
        return res.status(404).json({ success: false, msg: "Post not found" });

      await post.remove();
      res.json({ success: true, msg: "Post rejected and deleted" });
    } catch (error) {
      res.status(500).json({ success: false, msg: "Server error" });
    }
  }
);

router.delete("/:id", authenticate, superAdminOnly, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res.status(404).json({ success: false, msg: "Post not found" });

    await post.remove();
    res.json({ success: true, msg: "Post deleted" });
  } catch (error) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.post("/:id/like", authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || !post.approved) {
      return res
        .status(404)
        .json({ success: false, msg: "Post not found or not approved" });
    }

    const userId = req.user._id;
    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      // Unlike
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      post.likeCount -= 1;
    } else {
      // Like
      post.likes.push(userId);
      post.likeCount += 1;
    }

    await post.save();
    res.json({ success: true, likeCount: post.likeCount, hasLiked: !hasLiked });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, msg: "Server error", error: error.message });
  }
});
router.get("/public", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "newest";

    let sortOption;
    switch (sortBy) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "mostLiked":
        sortOption = { likeCount: -1, createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    let isPremium = false;
    if (req.header("Authorization")) {
      try {
        const token = req.header("Authorization").replace("Bearer ", "");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (
          user &&
          user.premium &&
          (!user.premiumExpiresAt || new Date() <= user.premiumExpiresAt)
        ) {
          isPremium = true;
        }
      } catch (tokenError) {
        // Silently handle invalid token, treat as non-premium
      }
    }

    const posts = await Post.find({ approved: true })
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("userId", "name profilePicture")
      .populate("approvedBy", "name");

    const total = await Post.countDocuments({ approved: true });

    const processedPosts = posts.map((post) => {
      const postObj = post.toObject();
      if (
        !isPremium &&
        postObj.description.length > CHAR_LIMIT_NON_PREMIUM_READ
      ) {
        postObj.description =
          postObj.description.slice(0, CHAR_LIMIT_NON_PREMIUM_READ) + "...";
        postObj.isTruncated = true;
      } else {
        postObj.isTruncated = false;
      }
      postObj.hasLiked = req.user ? post.likes.includes(req.user._id) : false;
      return postObj;
    });

    return res.json({
      success: true,
      posts: processedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
      },
    });
  } catch (error) {
    console.error("Public Posts Error:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
