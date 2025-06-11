// Các biến cấu hình toàn cục cho ứng dụng

// API URL từ biến môi trường hoặc URL mặc định
export const API_URL = process.env.REACT_APP_API_URL;

// Các biến cấu hình khác
export const APP_NAME = "FaceReg Attendance System";
export const TOKEN_KEY = "token";
export const USER_KEY = "user";

// Thời gian hết hạn token (ms)
export const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 giờ

// Cấu hình Face API - CẢI THIỆN ĐỘ TIN CẬY
export const FACE_DETECTION_OPTIONS = {
  scoreThreshold: 0.6, // Tăng từ 0.5 lên 0.6
  inputSize: 320, // Tăng từ 224 lên 320 để detection chính xác hơn
  scale: 0.8,
};

// Thời gian tự động refresh token (ms)
export const REFRESH_TOKEN_INTERVAL = 30 * 60 * 1000; // 30 phút
