require("dotenv").config();
require("./config/db-connection");
const express = require("express");
const setupMiddleware = require("./middleware");
const payment_route = require("./routes/payment");
const passport = require("passport");
const errorHandler = require("./middleware/errorHandler");
const post_route = require("./routes/post");
const cors = require("cors");
const app = express();

// Apply CORS first
app.use(
  cors({
       origin: [
         process.env.FRONTEND_URL,
         "https://accounts.google.com",
         process.env.BACKEND_URL,
       ],
       credentials: true,
       methods: ["GET", "POST", "PUT", "DELETE"],
       allowedHeaders: ["Content-Type", "Authorization"],
       maxAge: 86400,
     })
);

// Apply other middleware
setupMiddleware(app);

app.use("/health",(req,res)=>{
  res.status(200).json({ success: true, msg: "Server is running" });
})

app.use(passport.initialize()); // No session needed for JWT/Google

require("./config/passport")(passport);

const users_route = require("./routes/user");
const admin_route = require("./routes/admin");

app.use("/api/user", users_route);
app.use("/api/posts", post_route);
app.use("/api/5839201", admin_route);
app.use("/api/payment", payment_route);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ success: false, msg: "Route not found" });
});

const port = process.env.SERVER_PORT || 5000;

app.listen(port, () => {
  console.log(`\nServer Started on port ${port}`);
});

module.exports = app;
