const mongoose = require('mongoose');
require('dotenv').config();

// Import Notification and User models
const Notifications = require('../models/Notification');
const Users = require('../models/User');

const seedNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing notifications to start fresh
    await Notifications.deleteMany({});
    console.log('🧹 Cleared existing notifications.');

    // Fetch sender users
    const pdp = await Users.findOne({ email: 'pdp@fpt.edu.vn' });
    const chairman = await Users.findOne({ email: 'chairman@fpt.edu.vn' });
    const deptleader = await Users.findOne({ email: 'deptleader@fpt.edu.vn' });

    // Fetch all student users (including Google logged in users)
    const students = await Users.find({ permission: 'Student' });
    console.log(`Found ${students.length} student users in database.`);

    const items = [];

    // Seed notifications for all students found in the database
    for (const student of students) {
      items.push(
        {
          title: 'Chào mừng thành viên mới',
          content: 'Chào mừng bạn đến với CLB Lập Trình (DevClub). Hãy tham gia buổi sinh hoạt đầu tiên vào tối thứ 6 tuần này.',
          receiver: student._id,
          sender: chairman ? chairman._id : null,
          priority: 'MEDIUM',
          status: 'UNREAD',
        },
        {
          title: 'Nhiệm vụ mới được giao',
          content: 'Bạn được giao nhiệm vụ "Phát triển giao diện Member Dashboard". Hạn chót hoàn thành là 20/06/2026.',
          receiver: student._id,
          sender: deptleader ? deptleader._id : null,
          priority: 'HIGH',
          status: 'UNREAD',
        },
        {
          title: 'Thông báo khảo sát sự kiện',
          content: 'Vui lòng hoàn thành khảo sát phản hồi về Workshop MERN Stack 2026 để nhận điểm hoạt động tích cực.',
          receiver: student._id,
          sender: pdp ? pdp._id : null,
          priority: 'LOW',
          status: 'READ',
        }
      );
    }

    // Seed notifications for Chairman (chairman@fpt.edu.vn)
    if (chairman) {
      items.push(
        {
          title: 'Đề xuất thành lập CLB được phê duyệt',
          content: 'Hồ sơ đề xuất cập nhật thông tin CLB Lập Trình đã được Phòng Công tác Sinh viên (PDP) phê duyệt.',
          receiver: chairman._id,
          sender: pdp ? pdp._id : null,
          priority: 'HIGH',
          status: 'UNREAD',
        },
        {
          title: 'Yêu cầu rút khỏi CLB',
          content: 'Sinh viên gửi yêu cầu rút khỏi CLB Lập Trình.',
          receiver: chairman._id,
          sender: students[0] ? students[0]._id : null,
          priority: 'MEDIUM',
          status: 'READ',
        }
      );
    }

    // Seed notifications for PDP Staff (pdp@fpt.edu.vn)
    if (pdp) {
      items.push(
        {
          title: 'Yêu cầu phê duyệt sự kiện mới',
          content: 'CLB Lập Trình gửi đề xuất phê duyệt sự kiện "Hackathon: Code For Future".',
          receiver: pdp._id,
          sender: chairman ? chairman._id : null,
          priority: 'HIGH',
          status: 'UNREAD',
        },
        {
          title: 'Báo cáo định kỳ tháng 5',
          content: 'Báo cáo hoạt động CLB định kỳ tháng 5 đã được tải lên hệ thống.',
          receiver: pdp._id,
          sender: chairman ? chairman._id : null,
          priority: 'MEDIUM',
          status: 'UNREAD',
        }
      );
    }

    if (items.length > 0) {
      await Notifications.insertMany(items);
      console.log(`✅ Successfully seeded ${items.length} notifications!`);
    } else {
      console.log('⚠️ No notifications seeded (no target users found).');
    }

  } catch (error) {
    console.error('❌ Error seeding notifications:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedNotifications();
