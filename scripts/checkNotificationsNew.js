const mongoose = require('mongoose');
require('dotenv').config();

const check = async () => {
  const uri = process.env.MONGO_URI
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to DB:', mongoose.connection.name);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const Notifications = mongoose.model('Notifications', new mongoose.Schema({}, { strict: false }));
    const count = await Notifications.countDocuments();
    console.log('Total notifications:', count);

    const items = await Notifications.find().limit(10);
    console.log('Sample notifications:', JSON.stringify(items, null, 2));

    const Users = mongoose.model('Users', new mongoose.Schema({}, { strict: false }));
    const allUsers = await Users.find().limit(10);
    console.log('Sample users info:', allUsers.map(u => ({ _id: u._id, email: u.email, fullName: u.fullName, permission: u.permission })));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

check();
