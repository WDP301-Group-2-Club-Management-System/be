const mongoose = require('mongoose');
require('dotenv').config();

const Notifications = require('../models/Notification');
const Users = require('../models/User');

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to DB:', mongoose.connection.name);
    
    const targetUser = await Users.findOne({ email: 'trungha14900@gmail.com' });
    console.log('Target User in DB:', targetUser);
    
    if (targetUser) {
      const items = await Notifications.find({ receiver: targetUser._id }).populate('receiver', 'email');
      console.log('Notifications for trungha14900@gmail.com:\n', JSON.stringify(items, null, 2));
    } else {
      console.log('Target user not found in DB!');
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

check();
