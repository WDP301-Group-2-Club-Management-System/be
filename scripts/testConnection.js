// Script to test MongoDB connection
const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  console.log('🔄 Testing MongoDB connection...\n');
  
  // Hiển thị connection string (ẩn password)
  const connectionString = process.env.MONGO_URI;
  const safeConnectionString = connectionString.replace(
    /\/\/([^:]+):([^@]+)@/,
    '//$1:****@'
  );
  console.log('📍 Connection String:', safeConnectionString);
  console.log('');

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('🌐 Database:', mongoose.connection.name);
    console.log('🖥️  Host:', mongoose.connection.host);
    console.log('📊 Ready State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📦 Collections in database:', collections.length);
    collections.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.name}`);
    });
    
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed!');
    console.error('Error:', error.message);
    
    // Helpful error messages
    if (error.message.includes('bad auth')) {
      console.log('\n💡 Fix: Username hoặc password không đúng. Kiểm tra lại file .env');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Fix: Connection string không đúng. Kiểm tra cluster name.');
    } else if (error.message.includes('not authorized')) {
      console.log('\n💡 Fix: User không có quyền truy cập database.');
    } else if (error.message.includes('IP')) {
      console.log('\n💡 Fix: IP chưa được whitelist trong MongoDB Atlas Network Access.');
    }
    
    console.log('\n📖 Xem hướng dẫn chi tiết: MONGODB_ATLAS_SETUP.md');
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

testConnection();
