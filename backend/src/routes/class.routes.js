const express = require("express");
const router = express.Router();
const classController = require("../controllers/class.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// =================== MAIN CLASS ROUTES (Moved Up) ===================
// Lấy danh sách tất cả lớp chính (moved before /:id)
router.get("/main", protect, classController.getAllMainClasses);

// API công khai để lấy danh sách lớp chính
router.get("/main/public", classController.getAllMainClasses);

// Lấy thống kê lớp chính
router.get(
  "/main-statistics",
  protect,
  authorize(["admin"]),
  classController.getMainClassStatistics
);

// Lấy thống kê chi tiết của lớp chính
router.get(
  "/main/:id/detailed-statistics",
  protect,
  authorize(["admin", "teacher"]),
  classController.getMainClassDetailedStatistics
);

// Export danh sách sinh viên lớp chính
router.get(
  "/main/:id/export-students",
  protect,
  authorize(["admin", "teacher"]),
  classController.exportMainClassStudents
);

// Lấy chi tiết điểm danh của sinh viên
router.get(
  "/teaching/:id/students/:studentId/attendance-detail",
  protect,
  authorize(["admin", "teacher"]),
  classController.getStudentAttendanceDetail
);

// Cập nhật điểm danh sinh viên
router.put(
  "/teaching/:id/sessions/:sessionId/attendance/:studentId",
  protect,
  authorize(["admin", "teacher"]),
  classController.updateStudentAttendance
);

// API đã được tích hợp vào getStudentAttendanceDetail - không cần API riêng

// Lấy lớp chính theo ID
router.get("/main/:id", protect, classController.getMainClassById);

// Tạo lớp chính mới
router.post(
  "/main",
  protect,
  authorize(["admin", "teacher"]),
  classController.createMainClass
);

// Cập nhật lớp chính
router.put(
  "/main/:id",
  protect,
  authorize(["admin", "teacher"]),
  classController.updateMainClass
);

// Xóa lớp chính
router.delete(
  "/main/:id",
  protect,
  authorize(["admin", "teacher"]),
  classController.deleteMainClass
);

// Xóa sinh viên khỏi lớp chính
router.delete(
  "/main/:id/students/:studentId",
  protect,
  authorize(["admin", "teacher"]),
  classController.removeStudentFromMainClass
);

// =================== CLASS COMMON ROUTES ===================
// Route để lấy lớp học thông qua ID (chuyển hướng tới getTeachingClassById)
// Đảm bảo route này nằm SAU các route /main cụ thể hơn

// =================== TEACHING CLASS ROUTES ===================
// Lấy thống kê lớp giảng dạy (tách riêng route)
router.get(
  "/teaching-statistics",
  protect,
  authorize(["admin"]),
  classController.getTeachingClassStatistics
);

// Lấy danh sách tất cả lớp giảng dạy
router.get("/teaching", protect, classController.getAllTeachingClasses);

// Lấy các lớp giảng dạy của giáo viên
router.get(
  "/teaching/teacher/:id",
  protect,
  classController.getTeachingClassesByTeacher
);

// Lấy các lớp giảng dạy của sinh viên
router.get(
  "/teaching/student/:id",
  protect,
  classController.getTeachingClassesByStudent
);

// Lấy lớp giảng dạy theo ID
router.get("/teaching/:id", protect, classController.getTeachingClassById);

// Kiểm tra xung đột lịch học
router.post(
  "/teaching/check-conflicts",
  protect,
  classController.checkScheduleConflicts
);

// Tạo lớp giảng dạy mới
router.post(
  "/teaching",
  protect,
  authorize(["admin", "teacher"]),
  classController.createTeachingClass
);

// Cập nhật lớp giảng dạy
router.put(
  "/teaching/:id",
  protect,
  authorize(["admin", "teacher"]),
  classController.updateTeachingClass
);

// Tạo lại buổi điểm danh theo lịch học
router.post(
  "/teaching/:id/generate-sessions",
  protect,
  authorize(["admin", "teacher"]),
  classController.regenerateAttendanceSessions
);

// Xóa lớp giảng dạy
router.delete(
  "/teaching/:id",
  protect,
  authorize(["admin", "teacher"]),
  classController.deleteTeachingClass
);

// =================== STUDENT MANAGEMENT ROUTES ===================
// Thêm sinh viên vào lớp
router.post(
  "/teaching/:id/students",
  protect,
  authorize(["admin", "teacher"]),
  classController.addStudentToClass
);

// Thêm nhiều sinh viên vào lớp cùng lúc
router.post(
  "/teaching/:id/students/batch",
  protect,
  authorize(["admin", "teacher"]),
  classController.addStudentsBatch
);

// Xóa sinh viên khỏi lớp
router.delete(
  "/teaching/:id/students/:studentId",
  protect,
  authorize(["admin", "teacher"]),
  classController.removeStudentFromClass
);

// =================== STUDENT APPROVAL ROUTES ===================
// Lấy danh sách sinh viên đang chờ duyệt vào lớp chính
router.get(
  "/main/:id/pending-students",
  protect,
  authorize(["admin", "teacher"]),
  classController.getPendingStudents
);

// Lấy danh sách sinh viên đã được duyệt trong lớp chính
router.get(
  "/main/:id/approved-students",
  protect,
  authorize(["admin", "teacher"]),
  classController.getApprovedStudents
);

// Phê duyệt sinh viên vào lớp chính
router.put(
  "/main/:id/approve-student/:studentId",
  protect,
  authorize(["admin", "teacher"]),
  classController.approveStudent
);

// Từ chối sinh viên vào lớp chính
router.put(
  "/main/:id/reject-student/:studentId",
  protect,
  authorize(["admin", "teacher"]),
  classController.rejectStudent
);

// =================== CLASS STUDENT MANAGEMENT ROUTES ===================
// Lấy danh sách sinh viên trong lớp học
router.get(
  "/teaching/:id/students",
  protect,
  authorize(["admin", "teacher"]),
  classController.getClassStudents
);

// Cập nhật điểm của sinh viên
router.put(
  "/teaching/:id/students/:studentId/score",
  protect,
  authorize(["admin", "teacher"]),
  classController.updateStudentScore
);

// Thống kê điểm danh của lớp học
router.get(
  "/teaching/:id/attendance-stats",
  protect,
  authorize(["admin", "teacher"]),
  classController.getClassAttendanceStats
);

// API mới: Lấy các buổi học có thể xin nghỉ của sinh viên cho một lớp học cụ thể
router.get(
  "/teaching/:teachingClassId/schedulable-sessions-for-student",
  protect,
  authorize(["student"]), // Chỉ sinh viên mới có quyền gọi API này cho chính mình
  classController.getSchedulableSessionsForStudent
);

module.exports = router;
