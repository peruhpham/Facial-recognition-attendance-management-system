/**
 * Cấu hình chung cho ứng dụng
 */

// URL API backend
export const API_URL = process.env.REACT_APP_API_URL;

// Cấu hình thời gian hết hạn token (ms)
export const TOKEN_EXPIRATION = 24 * 60 * 60 * 1000; // 24 giờ

// Các cấu hình khác
export const APP_CONFIG = {
  appName: "Hệ thống điểm danh khuôn mặt",
  version: "1.0.0",
  defaultLanguage: "vi",
  timezone: "Asia/Ho_Chi_Minh",
};
