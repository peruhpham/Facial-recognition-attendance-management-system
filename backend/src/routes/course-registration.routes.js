const express = require("express");
const router = express.Router();
const courseRegistrationController = require("../controllers/course-registration.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// Lấy danh sách môn học có thể đăng ký
router.get(
  "/available",
  protect,
  authorize(["student"]),
  courseRegistrationController.getAvailableCourses
);

// Lấy danh sách môn học đã đăng ký
router.get(
  "/my-courses",
  protect,
  authorize(["student"]),
  courseRegistrationController.getMyRegisteredCourses
);

// Đăng ký môn học
router.post(
  "/register",
  protect,
  authorize(["student"]),
  courseRegistrationController.registerCourse
);

// Hủy đăng ký môn học
router.delete(
  "/drop/:class_id",
  protect,
  authorize(["student"]),
  courseRegistrationController.dropCourse
);

// Lấy thời khóa biểu
router.get(
  "/schedule",
  protect,
  authorize(["student"]),
  courseRegistrationController.getMySchedule
);

module.exports = router;
