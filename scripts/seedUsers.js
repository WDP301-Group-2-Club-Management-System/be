// Script to seed multiple user accounts for testing
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const Users = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
    console.log('🌐 Database:', mongoose.connection.name);
    console.log('');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// User accounts to create
const usersToCreate = [
  {
    userId: 'ADMIN001',
    fullName: 'System Administrator',
    email: 'admin@fpt.edu.vn',
    password: 'admin123',
    dateOfBirth: new Date('1990-01-01'),
    permission: 'Admin',
    avatarSrc: 'https://i.pravatar.cc/150?img=1',
    status: true,
  },
  {
    userId: 'PDP001',
    fullName: 'Nguyễn Văn PDP Staff',
    email: 'pdp@fpt.edu.vn',
    password: 'pdp123',
    dateOfBirth: new Date('1995-05-15'),
    permission: 'PDP_Officer',
    avatarSrc: 'https://i.pravatar.cc/150?img=33',
    status: true,
  },
  {
    userId: 'SE160001',
    fullName: 'Trần Thị Chủ Nhiệm',
    email: 'chairman@fpt.edu.vn',
    password: 'chairman123',
    dateOfBirth: new Date('2002-01-15'),
    permission: 'Club_Chairman',
    avatarSrc: 'https://i.pravatar.cc/150?img=44',
    status: true,
  },
  {
    userId: 'SE160002',
    fullName: 'Lê Văn Trưởng Ban',
    email: 'deptleader@fpt.edu.vn',
    password: 'dept123',
    dateOfBirth: new Date('2002-03-20'),
    permission: 'Dept_Leader',
    avatarSrc: 'https://i.pravatar.cc/150?img=55',
    status: true,
  },
  {
    userId: 'SE160003',
    fullName: 'Phạm Thị Sinh Viên',
    email: 'student@fpt.edu.vn',
    password: 'student123',
    dateOfBirth: new Date('2003-06-10'),
    permission: 'Student',
    avatarSrc: 'https://i.pravatar.cc/150?img=20',
    status: true,
  },
];

// Create user accounts
const seedUsers = async () => {
  console.log('🌱 Starting to seed user accounts...\n');
  
  let createdCount = 0;
  let existingCount = 0;
  
  for (const userData of usersToCreate) {
    try {
      // Check if user already exists
      const existingUser = await Users.findOne({ email: userData.email });
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      if (existingUser) {
        console.log(`🔄 Updating existing account: ${userData.email}`);
        existingUser.password = hashedPassword;
        existingUser.fullName = userData.fullName;
        existingUser.userId = userData.userId;
        existingUser.permission = userData.permission;
        existingUser.status = userData.status;
        existingUser.avatarSrc = userData.avatarSrc;
        existingUser.dateOfBirth = userData.dateOfBirth;
        await existingUser.save();
        existingCount++;
        continue;
      }

      // Create new user
      const newUser = new Users({
        ...userData,
        password: hashedPassword,
      });

      await newUser.save();
      
      console.log(`✅ Created: ${userData.permission.toUpperCase()}`);
      console.log(`   📧 Email: ${userData.email}`);
      console.log(`   🔑 Password: ${userData.password}`);
      console.log(`   👤 Name: ${userData.fullName}`);
      console.log(`   🆔 User ID: ${userData.userId}`);
      console.log('');
      
      createdCount++;
      
    } catch (error) {
      console.error(`❌ Error creating ${userData.email}:`, error.message);
      console.log('');
    }
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Created: ${createdCount} accounts`);
  console.log(`   ⚠️  Already existed: ${existingCount} accounts`);
  console.log(`   📝 Total processed: ${usersToCreate.length} accounts`);
  console.log('═══════════════════════════════════════════════════');
};

// Main execution
const main = async () => {
  await connectDB();
  await seedUsers();
  
  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 All Test Accounts:');
  console.log('┌─────────────────┬──────────────────────────┬─────────────────┐');
  console.log('│ Role            │ Email                    │ Password        │');
  console.log('├─────────────────┼──────────────────────────┼─────────────────┤');
  console.log('│ Admin           │ admin@fpt.edu.vn         │ admin123        │');
  console.log('│ PDP Staff       │ pdp@fpt.edu.vn           │ pdp123          │');
  console.log('│ Club Chairman   │ chairman@fpt.edu.vn      │ chairman123     │');
  console.log('│ Dept Leader     │ deptleader@fpt.edu.vn    │ dept123         │');
  console.log('│ Student         │ student@fpt.edu.vn       │ student123      │');
  console.log('└─────────────────┴──────────────────────────┴─────────────────┘');
  console.log('\n💡 Tip: Use these accounts to test different role screens!');
  console.log('');
  
  process.exit(0);
};

main();
