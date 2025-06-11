const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subject.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// @route   GET /api/subjects
// @desc    Lấy tất cả môn học
router.get("/", protect, subjectController.getAllSubjects);

// @route   GET /api/subjects/:id
// @desc    Lấy môn học theo ID
router.get("/:id", protect, subjectController.getSubjectById);

// @route   GET /api/subjects/department/:departmentId
// @desc    Lấy môn học theo khoa
router.get(
  "/department/:departmentId",
  protect,
  subjectController.getSubjectsByDepartment
);

// @route   POST /api/subjects
// @desc    Tạo môn học mới
router.post(
  "/",
  protect,
  authorize(["admin"]),
  subjectController.createSubject
);

// @route   PUT /api/subjects/:id
// @desc    Cập nhật môn học
router.put(
  "/:id",
  protect,
  authorize(["admin"]),
  subjectController.updateSubject
);

// @route   DELETE /api/subjects/:id
// @desc    Xóa môn học
router.delete(
  "/:id",
  protect,
  authorize(["admin"]),
  subjectController.deleteSubject
);

module.exports = router;
