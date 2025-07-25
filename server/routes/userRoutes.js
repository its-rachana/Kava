const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  updateSecretKey,
  userSearch,
  userLogin,
  userRegister,
  updatePassword,
  sendOtp,
  verifyOtp,
  uploadProfilePhoto,
  getUserProfile,
  update2fAuthentication
} = require("../controllers/userController");
const upload = require("../middleware/uploadMiddleware");

router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});
router.get("/",protect, userSearch);
router.post("/register", userRegister);
router.post("/login", userLogin);
router.put('/secret-key', protect, updateSecretKey);
router.post('/send-otp', sendOtp);
router.post("/reset-password", protect, updatePassword);
router.post('/verify-otp', verifyOtp)
router.post("/upload-photo", upload.single("profilePhoto"), uploadProfilePhoto);
router.get("/profile",protect,getUserProfile)
router.put("/toggle-2fa",protect,update2fAuthentication)
module.exports = router;
