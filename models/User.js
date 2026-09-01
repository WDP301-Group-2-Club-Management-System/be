const mongoose = require("mongoose");
const { USER_PERMISSIONS } = require("../constrant/schema");

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarSrc: {
      type: String,
      default: "img/Hinh-anh-dai-dien-mac-dinh-Facebook.jpg",
    },
    dateOfBirth: { type: Date, default: null },
    permission: { type: String, enum: USER_PERMISSIONS, required: true },
    status: { type: Boolean, default: true, required: true },
    refreshToken: { type: String, default: null },
    resetToken: { type: String, default: null },
    tokenExpiry: { type: Date, default: null },
    // Default true (not false) so every pre-existing account (already-seeded
    // test users, anything created before this field existed) is implicitly
    // verified with zero migration — only the register flow explicitly sets
    // this to false for brand-new self-registered accounts.
    isVerified: { type: Boolean, default: true },
    verifyToken: { type: String, default: null },
    verifyTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

const Users = mongoose.model("Users", userSchema);
module.exports = Users;
