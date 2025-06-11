const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// @route   GET /api/courses
// @desc    Lấy danh sách tất cả môn học
router.get("/", protect, courseController.getAllCourses);

// @route   GET /api/courses/statistics
// @desc    Lấy thống kê về môn học
router.get(
  "/statistics",
  protect,
  authorize(["admin"]),
  courseController.getCourseStatistics
);

// @route   GET /api/courses/:id
// @desc    Lấy môn học theo ID
router.get("/:id", protect, courseController.getCourseById);

// @route   POST /api/courses
// @desc    Tạo môn học mới
router.post("/", protect, authorize(["admin"]), courseController.createCourse);

// @route   PUT /api/courses/:id
// @desc    Cập nhật môn học
router.put(
  "/:id",
  protect,
  authorize(["admin"]),
  courseController.updateCourse
);

// @route   DELETE /api/courses/:id
// @desc    Xóa môn học
router.delete(
  "/:id",
  protect,
  authorize(["admin"]),
  courseController.deleteCourse
);

module.exports = router;
