const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const attendanceController = require("../controllers/attendance.controller");

// @route   GET /api/attendance/sessions
// @desc    Lấy tất cả các phiên điểm danh
router.get(
  "/sessions",
  protect,
  authorize(["admin", "teacher"]),
  attendanceController.getAllAttendanceSessions
);

// @route   POST /api/attendance/sessions
// @desc    Tạo phiên điểm danh mới
router.post(
  "/sessions",
  protect,
  authorize("teacher", "admin"),
  attendanceController.createAttendanceSession
);

// @route   GET /api/attendance/sessions/:id
// @desc    Lấy thông tin phiên điểm danh
router.get("/sessions/:id", protect, attendanceController.getAttendanceSession);

// @route   PUT /api/attendance/sessions/:id
// @desc    Cập nhật phiên điểm danh
router.put(
  "/sessions/:id",
  protect,
  authorize("teacher", "admin"),
  attendanceController.updateAttendanceSession
);

// @route   PUT /api/attendance/sessions/:id/status
// @desc    Cập nhật trạng thái phiên điểm danh
router.put(
  "/sessions/:id/status",
  protect,
  authorize("teacher", "admin"),
  attendanceController.updateSessionStatus
);

// @route   GET /api/attendance/teaching-class/:id/sessions
// @desc    Lấy danh sách phiên điểm danh của lớp học
router.get(
  "/teaching-class/:id/sessions",
  protect,
  attendanceController.getClassAttendanceSessions
);

// @route   GET /api/attendance/logs/:sessionId
// @desc    Lấy danh sách logs điểm danh trong một phiên
router.get("/logs/:sessionId", protect, attendanceController.getAttendanceLogs);

// @route   GET /api/attendance/logs/:sessionId/student/:studentId
// @desc    Kiểm tra log điểm danh của một sinh viên cụ thể trong session
router.get(
  "/logs/:sessionId/student/:studentId",
  protect,
  attendanceController.checkStudentAttendanceLog
);

// @route   GET /api/attendance/student/:studentId/logs
// @desc    Lấy lịch sử điểm danh của sinh viên
router.get(
  "/student/:studentId/logs",
  protect,
  attendanceController.getStudentAttendanceLogs
);

// @route   GET /api/attendance/student/:studentId/scores
// @desc    Lấy điểm chuyên cần của sinh viên
router.get(
  "/student/:studentId/scores",
  protect,
  attendanceController.getStudentScores
);

// @route   POST /api/attendance/scores/calculate
// @desc    Tính toán lại điểm chuyên cần
router.post(
  "/scores/calculate",
  protect,
  authorize("teacher", "admin"),
  attendanceController.calculateAttendanceScores
);

// @route   POST /api/attendance/logs/:sessionId
// @desc    Tạo log điểm danh mới
router.post(
  "/logs/:sessionId",
  protect,
  authorize("teacher", "admin"),
  attendanceController.createAttendanceLog
);

// @route   DELETE /api/attendance/logs/:logId
// @desc    Xóa một log điểm danh cụ thể (ví dụ: do nhận diện sai)
// @access  Private (Chỉ giáo viên của lớp hoặc admin)
router.delete(
  "/logs/:logId",
  protect,
  authorize("teacher", "admin"), // Sẽ cần logic kiểm tra chi tiết hơn trong controller
  attendanceController.deleteAttendanceLog
);

module.exports = router;
