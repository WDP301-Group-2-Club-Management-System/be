
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const UserClub = require("../models/UserClub");
const User = require("../models/User");
const Department = require("../models/Department");

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/wdp301");
    
    const clubId = "6a4a3a722aca2488b1cd7ffa";
    const userClubs = await UserClub.find({ club: clubId }).populate("user department");
    console.log("All Members in CLB L?p Trình (6a4a3a722aca2488b1cd7ffa):");
    userClubs.forEach(uc => {
      console.log(`- ${uc.user?.fullName} (${uc.user?.username} / ID: ${uc.user?._id}) - Dept: ${uc.department?.departmentName} (${uc.department?._id}) - Role: ${uc.role}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();

