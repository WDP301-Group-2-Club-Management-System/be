const mongoose = require('mongoose');
require('dotenv').config();

const printNotifications = async () => {
  const uri = process.env.MONGO_URI
  try {
    await mongoose.connect(uri);
    const Notifications = mongoose.model('Notifications', new mongoose.Schema({}, { strict: false }));
    const Users = mongoose.model('Users', new mongoose.Schema({}, { strict: false }));
    const notis = await Notifications.find({});
    const users = await Users.find({});
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = `${u.fullName} (${u.email})`;
    });

    console.log('--- ALL NOTIFICATIONS ---');
    notis.forEach(n => {
      const receiverName = userMap[n.receiver ? n.receiver.toString() : ''] || n.receiver || 'N/A';
      const senderName = userMap[n.sender ? n.sender.toString() : ''] || n.sender || 'System';
      console.log(`ID: ${n._id} | Receiver: ${receiverName} | Sender: ${senderName} | Title: "${n.title}" | Status: ${n.status}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

printNotifications();
