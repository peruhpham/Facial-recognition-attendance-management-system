const express = require("express");
const router = express.Router();
const {
  saveFaceFeatures,
  getClassFaceFeatures,
  verifyAttendance,
  manualAttendance,
} = require("../controllers/faceRecognition.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// @route   POST /api/face-recognition/save-features
// @desc    Lưu đặc trưng khuôn mặt
router.post("/save-features", protect, saveFaceFeatures);

// @route   GET /api/face-recognition/class-features/:classId
// @desc    Lấy đặc trưng khuôn mặt của sinh viên trong một lớp
router.get(
  "/class-features/:classId",
  protect,
  authorize("teacher", "admin"),
  getClassFaceFeatures
);

// @route   POST /api/face-recognition/verify-attendance
// @desc    Xác nhận điểm danh bằng khuôn mặt
router.post("/verify-attendance", protect, verifyAttendance);

// @route   POST /api/face-recognition/manual-attendance
// @desc    Điểm danh thủ công
router.post(
  "/manual-attendance",
  protect,
  authorize("teacher", "admin"),
  manualAttendance
);

module.exports = router;
