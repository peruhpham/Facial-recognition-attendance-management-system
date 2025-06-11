const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const semesterController = require("../controllers/semester.controller");

// Lưu ý: Routing order ảnh hưởng đến việc xử lý request
// Đặt các route với đường dẫn cụ thể trước route với tham số động :id

// @route   GET /api/semesters/current
// @desc    Lấy học kỳ hiện tại
router.get("/current", semesterController.getCurrentSemester);

// @route   GET /api/semesters/statistics
// @desc    Lấy thống kê về học kỳ
router.get(
  "/statistics",
  protect,
  authorize(["admin"]),
  semesterController.getSemesterStatistics
);

// @route   GET /api/semesters/registration-status
// @desc    Kiểm tra thời gian đăng ký môn học
router.get(
  "/registration-status",
  protect,
  semesterController.getRegistrationStatus
);

// Route cơ bản
router
  .route("/")
  .get(semesterController.getAllSemesters)
  .post(protect, authorize("admin"), semesterController.createSemester);

router
  .route("/:id")
  .get(semesterController.getSemesterById)
  .put(protect, authorize("admin"), semesterController.updateSemester)
  .delete(protect, authorize("admin"), semesterController.deleteSemester);

module.exports = router;
