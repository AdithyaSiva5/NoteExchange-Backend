const express = require("express");
const router = express.Router();
const { adminAuth, superAdminOnly } = require("../middleware/adminAuth");
const adminController = require("../controllers/adminController");

router.post("/login", adminController.login);
router.get("/users", adminAuth, adminController.getUsers);
router.post("/create", adminAuth, adminController.createAdmin);
router.put("/users/:id/toggle-creator", adminAuth, adminController.toggleCreator);
router.get("/users/search", adminAuth, adminController.searchUser);
router.put("/users/:id/toggle-premium", adminAuth, adminController.premium)
router.put("/users/:id/toggle-block", adminAuth, adminController.block)


module.exports = router;    
