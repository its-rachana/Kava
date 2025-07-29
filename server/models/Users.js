const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    secretKey: {
      type: String,
      unique: true,
      sparse: true,
    },
      otp: String,
      otpExpiry: Date,
      profilePhoto: Buffer,
      twoFactorEnabled:Boolean,
      token:String,
      gender:String

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
