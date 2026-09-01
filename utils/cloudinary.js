const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const clubImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'clubs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  },
});

const uploadCloudinary = multer({
  storage: clubImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const eventImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'events',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  },
});

const uploadEventCloudinary = multer({
  storage: eventImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = {
  cloudinary,
  uploadCloudinary,
  uploadEventCloudinary,
};
