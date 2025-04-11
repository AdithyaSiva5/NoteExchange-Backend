const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const passport = require("passport");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const RAZORPAY_AMOUNT_IN_RUPEES =
  parseFloat(process.env.RAZORPAY_AMOUNT_IN_RUPEES) || 1000;
const RAZORPAY_AMOUNT_IN_PAISE = Math.round(RAZORPAY_AMOUNT_IN_RUPEES * 100);

router.post(
  "/create-order",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, msg: "User not authenticated" });
      }

      const shortUserId = req.user._id.toString().slice(0, 8);
      const shortTimestamp = Date.now().toString().slice(-6);
      const receipt = `rcpt_${shortUserId}_${shortTimestamp}`;
      console.log("Generated receipt:", receipt, "Length:", receipt.length);

      const options = {
        amount: RAZORPAY_AMOUNT_IN_PAISE, // ₹40 in paise
        currency: "INR",
        receipt: receipt,
      };
      console.log("Order options:", options);

      const order = await razorpay.orders.create(options);
      console.log("Order created:", order);

      res.json({
        success: true,
        orderId: order.id,
        amount: options.amount,
        currency: options.currency,
      });
    } catch (error) {
      console.error(
        "Error creating Razorpay order:",
        error.message,
        error.stack
      );
      res.status(error.statusCode || 500).json({
        success: false,
        msg: "Failed to create order",
        error: error.message,
      });
    }
  }
);
module.exports = router;
