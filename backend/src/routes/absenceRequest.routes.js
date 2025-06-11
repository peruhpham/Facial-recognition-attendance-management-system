const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const {
  createAbsenceRequest,
  getMyAbsenceRequests,
  getAllAbsenceRequests,
  updateAbsenceRequestStatus,
  cancelAbsenceRequest,
  updateMyAbsenceRequest,
  getAbsenceRequestsBySession,
} = require("../controllers/absenceRequest.controller");
const { uploadToCloudinary } = require("../middlewares/upload.middleware");

// Giả định controllers
// XÓA HOẶC COMMENT OUT ĐOẠN NÀY
// router.get("/", protect, (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "API yêu cầu vắng mặt hoạt động",
//   });
// });

// @route   POST /api/v1/absence-requests
// @desc    Student creates an absence request
// @access  Private (Student - role: 'student')
router.post(
  "/",
  protect,
  authorize(["student"]),
  uploadToCloudinary("evidence_file"),
  createAbsenceRequest
);

// @route   GET /api/v1/absence-requests/my
// @desc    Student gets their own absence requests
// @access  Private (Student - role: 'student')
router.get("/my", protect, authorize(["student"]), getMyAbsenceRequests);

// @route   GET /api/v1/absence-requests
// @desc    Admin/Teacher gets all absence requests (with filters and pagination)
// @access  Private (Admin, Teacher)
router.get(
  "/",
  protect,
  authorize(["admin", "teacher"]),
  getAllAbsenceRequests
);

// @route   PUT /api/v1/absence-requests/:id/status
// @desc    Admin/Teacher updates status of an absence request
// @access  Private (Admin, Teacher)
router.put(
  "/:id/status",
  protect,
  authorize(["admin", "teacher"]),
  updateAbsenceRequestStatus
);

// @route   DELETE /api/v1/absence-requests/:id
// @desc    Student cancels their own pending absence request
// @access  Private (Student)
router.delete("/:id", protect, authorize(["student"]), cancelAbsenceRequest);

// @route   PUT /api/v1/absence-requests/:id
// @desc    Student updates their own pending absence request
// @access  Private (Student)
router.put(
  "/:id",
  protect,
  authorize(["student"]),
  uploadToCloudinary("evidence_file"),
  updateMyAbsenceRequest
);

// @route   GET /api/v1/absence-requests/session/:sessionId
// @desc    Get all absence requests for a specific session
// @access  Private (Teacher, Admin)
router.get(
  "/session/:sessionId",
  protect,
  authorize(["admin", "teacher"]),
  getAbsenceRequestsBySession
);

// Các routes khác cho get, update status bởi teacher/admin sẽ được thêm ở đây
// Ví dụ:
// router.get("/", protect, authorize(["admin", "teacher"]), getAllAbsenceRequests);
// router.get("/:id", protect, authorize(["student", "admin", "teacher"]), getAbsenceRequestById);
// router.put("/:id/status", protect, authorize(["admin", "teacher"]), updateAbsenceRequestStatus);

module.exports = router;
