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
router.get("/",protect, userSearch);            //done
router.get("/profile",protect,getUserProfile)   //done

router.post("/register", userRegister);         //done
router.post("/login", userLogin);               //done
router.post('/send-otp', sendOtp);              //done
router.post("/reset-password", protect, updatePassword);      //done
router.post('/verify-otp', verifyOtp)                         //done
router.post("/upload-photo", upload.single("profilePhoto"), uploadProfilePhoto);  //done

router.put("/toggle-2fa",protect,update2fAuthentication)      //done
router.put('/secret-key', protect, updateSecretKey);          //done

module.exports = router;
