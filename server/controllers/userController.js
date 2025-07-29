const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const {protect} = require("../middleware/authMiddleware");
const asyncHandler = require("express-async-handler");
const nodemailer = require('nodemailer');

const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        secretKey: user.secretKey,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profilePhoto: user.profilePhoto ? user.profilePhoto.toString("base64") : null,
        profilePhotoType: "image/jpeg", // optional: detect dynamically
    });
});
const uploadProfilePhoto = asyncHandler(async (req, res) => {
    const {email} = req.body;
    const fileBuffer = req.file?.buffer;

    if (!email || !fileBuffer) {
        res.status(400);
        throw new Error("Email and photo file are required");
    }

    const user = await User.findOne({email});
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.profilePhoto = fileBuffer;
    await user.save();

    res.status(200).json({message: "Profile photo uploaded successfully"});
});
router.post("/register", async (req, res) => {
    const {name, email, password, pic, secretKey} = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({message: "Please enter all fields"});
    }

    const userExists = await User.findOne({email});
    if (userExists) {
        return res.status(400).json({message: "User already exists"});
    }

    if (secretKey) {
        const existingKey = await User.findOne({secretKey});
        if (existingKey) {
            return res.status(400).json({message: "Secret key already in use"});
        }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        pic,
        secretKey: secretKey || null,
    });

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        secretKey: user.secretKey,
        token,
    });
});

// router.post("/login", async (req, res) => {
//     const {email, password} = req.body;
//
//     const user = await User.findOne({email});
//     if (!user) {
//         return res.status(400).json({message: "User not found"});
//     }
//
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//         return res.status(401).json({message: "Invalid credentials"});
//     }
//
//     const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
//         expiresIn: "7d",
//     });
//
//     res.json({
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         pic: user.pic,
//         secretKey: user.secretKey,
//         token,
//     });
// });

router.put("/secret-key", protect, async (req, res) => {
    const {secretKey} = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({message: "User not found"});

    const existing = await User.findOne({secretKey});
    if (existing && existing._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({message: "Secret key already in use."});
    }

    user.secretKey = secretKey;
    await user.save();

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        secretKey: user.secretKey,
        token,
    });
});

router.get("/", protect, async (req, res) => {
    const keyword = req.query.search
        ? {
            $or: [
                {name: {$regex: req.query.search, $options: "i"}},
                {email: {$regex: req.query.search, $options: "i"}},
            ],
        }
        : {};

    try {
        const users = await User.find(keyword).find({_id: {$ne: req.user._id}});
        res.json(users);
    } catch (err) {
        res.status(500).json({message: "Search failed", error: err.message});
    }
});

router.get("/with-secret-key", protect, async (req, res) => {
    try {
        const users = await User.find({
            secretKey: {$exists: true, $ne: ""},
            _id: {$ne: req.user._id},
        }).select("name email pic");

        res.json(users);
    } catch (err) {
        res.status(500).json({message: "Failed to fetch secret contacts"});
    }
});
const updatePassword = asyncHandler(async (req, res) => {

    const {email, newPassword} = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({message: "Email and new password are required."});
    }

    try {
        const user = await User.findOne({email});

        if (!user) {
            return res.status(404).json({message: "No user registered with this email address."});
        }

        user.password = await bcrypt.hash(newPassword, 10);

        await user.save();

        return res.status(200).json({message: "Password has been reset successfully."});
    } catch (error) {
        return res.status(500).json({message: "Internal server error."});
    }
});

const sendOtp = asyncHandler(async (req, res) => {
    const {email} = req.body;

    if (!email) return res.status(400).json({message: "Email is required."});

    const user = await User.findOne({email});

    if (!user) {
        return res.status(404).json({message: "No user found with this email address."});
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "rachana.angaraa@gmail.com",
            pass: "nvtt lrkc yanp rbhu"
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Your OTP for Password Reset',
        text: `Your OTP is ${otp}. It is valid for 10 minutes.`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({message: "OTP sent to email successfully."});
});
const updateSecretKey = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({message: "User not found"});

    user.secretKey = req.body.secretKey;
    await user.save();

    res.status(200).json({message: "Secret key updated", secretKey: user.secretKey});
});

const userSearch = asyncHandler(async (req, res) => {
    const keyword = req.query.search
        ? {
            $or: [
                {name: {$regex: req.query.search, $options: "i"}},
                {email: {$regex: req.query.search, $options: "i"}},
            ],
        }
        : {};

    try {
        const users = await User.find(keyword).find({
            _id: {$ne: req.user._id},
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({message: "Search failed", error: err.message});
    }
})

const userLogin = asyncHandler(async (req, res) => {
    const {email, password} = req.body;

    const user = await User.findOne({email});
    if (!user) {
        return res.status(400).json({message: "User not found"});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({message: "Invalid credentials"});
    }

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto ? user.profilePhoto : null,
        profilePhotoType: "image/jpeg", // optional: detect dynamically
        secretKey: user.secretKey,
        twoFactorEnabled:user.twoFactorEnabled,
        token,
        gender:user.gender
    });
})

const userRegister = asyncHandler(async (req, res) => {
    const {name, email, password, pic, secretKey} = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({message: "Please enter all fields"});
    }

    const userExists = await User.findOne({email});
    if (userExists) {
        return res.status(400).json({message: "User already exists"});
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        pic,
        secretKey: secretKey || null,
    });

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
        secretKey: user.secretKey,
        token,
    });
})

const verifyOtp = asyncHandler(async (req, res) => {
    const {email, otpCode} = req.body;

    if (!email || !otpCode) {
        return res.status(400).json({message: "Email and OTP are required."});
    }

    const user = await User.findOne({email});

    if (!user) {
        return res.status(404).json({message: "No user found with this email."});
    }

    if (!user.otp || !user.otpExpiry) {
        return res.status(400).json({message: "OTP has not been generated or has expired."});
    }

    // Check if OTP is expired
    const now = new Date();
    if (now > user.otpExpiry) {
        // Clear expired OTP
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        return res.status(400).json({message: "OTP has expired. Please request a new one."});
    }

    // Check if OTP matches
    if (user.otp !== otpCode) {
        return res.status(400).json({message: "Invalid OTP."});
    }
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    // OTP is valid - clear OTP fields
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.token = token;
    await user.save();
    return res.status(200).json({message: "OTP verified successfully.", userData:user});
});

const update2fAuthentication = asyncHandler(async (req, res) => {
    const { email, enabled } = req.body;

    if (!email || typeof enabled === "undefined") {
        return res.status(400).json({ message: "Email and enabled status are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Update 2FA field (assuming it's stored as a string like in the DB screenshot)
    user.twoFactorEnabled = enabled.toString(); // convert boolean to string ("true"/"false")
    await user.save();

    res.status(200).json({
        message: "Two-factor authentication updated successfully",
        _id: user._id,
        email: user.email,
        name: user.name,
        twoFactorEnabled: user.twoFactorEnabled,
    });
});

module.exports = {
    updatePassword,
    sendOtp,
    updateSecretKey,
    userSearch,
    userLogin,
    userRegister,
    verifyOtp,
    uploadProfilePhoto,
    getUserProfile,
    update2fAuthentication,
    router
};
