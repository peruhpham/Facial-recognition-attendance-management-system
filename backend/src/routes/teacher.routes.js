const express = require("express");
const teacherController = require("../controllers/teacher.controller");
const { protect, authorize } = require("../middlewares/auth.middleware"); // Giả sử middleware là authenticate và authorize

const router = express.Router();

// GET /api/teachers - Lấy danh sách giảng viên (chỉ student và admin được truy cập)
router.get(
  "/",
  protect, // Xác thực người dùng đã đăng nhập
  authorize(["student", "admin", "teacher"]), // Chỉ cho phép student, admin, teacher truy cập (có thể điều chỉnh)
  teacherController.getAllTeachers
);

// Có thể thêm các route khác cho teacher sau này (ví dụ: GET /:id)

module.exports = router;
