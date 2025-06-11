const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { protect } = require("../middlewares/auth.middleware"); // Middleware để bảo vệ route

// Lấy danh sách thông báo của người dùng hiện tại
router.get("/", protect, notificationController.getNotifications);

// Đánh dấu một thông báo là đã đọc
router.put("/:id/read", protect, notificationController.markNotificationAsRead);

// Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc
router.put(
  "/read-all",
  protect,
  notificationController.markAllNotificationsAsRead
);

// Lấy số lượng thông báo chưa đọc
router.get(
  "/unread-count",
  protect,
  notificationController.getUnreadNotificationsCount
);

// Xóa một thông báo
router.delete("/:id", protect, notificationController.deleteNotification);

module.exports = router;
