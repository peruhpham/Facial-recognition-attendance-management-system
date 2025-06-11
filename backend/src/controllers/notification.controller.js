const { Notification, User } = require("../models/schemas");
const mongoose = require("mongoose");

/**
 * @desc    Lấy danh sách thông báo của người dùng hiện tại
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const isRead = req.query.is_read; // true, false, hoặc undefined (lấy tất cả)

    const query = { receiver_id: userId };
    if (isRead !== undefined) {
      query.is_read = isRead === "true";
    }

    const notifications = await Notification.find(query)
      .populate("sender_id", "full_name avatar_url role")
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Sử dụng lean để tăng tốc độ và trả về plain JS objects

    const totalNotifications = await Notification.countDocuments(query);

    // Tính toán thêm thông tin is_new (ví dụ: tạo trong vòng 24h qua)
    const now = new Date();
    const notificationsWithDetails = notifications.map((notification) => {
      const createdAt = new Date(notification.created_at);
      const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
      return {
        ...notification,
        is_new: hoursDiff <= 24, // Ví dụ: thông báo mới trong 24 giờ
      };
    });

    res.status(200).json({
      success: true,
      data: notificationsWithDetails,
      total: totalNotifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thông báo.",
      error: error.message,
    });
  }
};

/**
 * @desc    Đánh dấu một thông báo là đã đọc
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID thông báo không hợp lệ." });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, receiver_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
      { new: true }
    ).populate("sender_id", "full_name avatar_url role");

    if (!notification) {
      // Có thể là thông báo không tồn tại, không thuộc về user, hoặc đã được đọc
      const existingNotification = await Notification.findOne({
        _id: notificationId,
        receiver_id: userId,
      });
      if (!existingNotification) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy thông báo." });
      }
      if (existingNotification.is_read) {
        return res.status(200).json({
          success: true,
          message: "Thông báo đã được đánh dấu đọc trước đó.",
          data: existingNotification,
        });
      }
      // Trường hợp khác không rõ
      return res.status(404).json({
        success: false,
        message:
          "Không thể cập nhật thông báo hoặc thông báo không thuộc về bạn.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu thông báo là đã đọc.",
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi đánh dấu thông báo.",
      error: error.message,
    });
  }
};

/**
 * @desc    Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { receiver_id: userId, is_read: false },
      { is_read: true, read_at: new Date() }
    );

    res.status(200).json({
      success: true,
      message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc.`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi đánh dấu tất cả thông báo.",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy số lượng thông báo chưa đọc của người dùng
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadNotificationsCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({
      receiver_id: userId,
      is_read: false,
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    console.error("Error getting unread notifications count:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy số lượng thông báo chưa đọc.",
      error: error.message,
    });
  }
};

/**
 * @desc    Xóa một thông báo
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID thông báo không hợp lệ." });
    }

    const deletedNotification = await Notification.findOneAndDelete({
      _id: notificationId,
      receiver_id: userId,
    });

    if (!deletedNotification) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo hoặc bạn không có quyền xóa.",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Thông báo đã được xóa thành công." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa thông báo.",
      error: error.message,
    });
  }
};
