require("dotenv").config(); // Xóa hoặc comment dòng này
const cloudinary = require("cloudinary").v2;

// Log giá trị biến môi trường ngay trước khi config
console.log(
  "[cloudinary.config.js] CLOUDINARY_CLOUD_NAME:",
  process.env.CLOUDINARY_CLOUD_NAME
);
console.log(
  "[cloudinary.config.js] CLOUDINARY_API_KEY:",
  process.env.CLOUDINARY_API_KEY
);
console.log(
  "[cloudinary.config.js] CLOUDINARY_API_SECRET:",
  process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Sử dụng HTTPS
});

module.exports = cloudinary;
