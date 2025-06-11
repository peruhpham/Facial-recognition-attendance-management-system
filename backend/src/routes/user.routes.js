const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  approveUser,
  rejectUser,
  updateUserRole,
  getPendingUsers,
  getAdvisors,
  getTeachers,
  getUserStats,
  registerClass,
  getPublicAdvisors,
  checkIdentifier,
} = require("../controllers/user.controller");

// PUBLIC ROUTE - Để kiểm tra xem mã định danh (student_id, teacher_code, email) đã tồn tại chưa
// Route này nên được đặt TRƯỚC bất kỳ middleware xác thực nào có thể áp dụng cho tất cả các route của user
router.get("/check-identifier", checkIdentifier);

// @route   GET /api/users
// @desc    Lấy tất cả người dùng (với phân trang và tìm kiếm)
router.get("/", protect, authorize(["admin"]), getAllUsers);

// @route   GET /api/users/stats
// @desc    Lấy thống kê người dùng theo vai trò
router.get("/stats", protect, authorize(["admin"]), getUserStats);

// @route   GET /api/users/pending
// @desc    Lấy danh sách người dùng chờ phê duyệt
router.get(
  "/pending",
  protect,
  authorize(["admin", "teacher"]),
  getPendingUsers
);

// @route   GET /api/users/advisors
// @desc    Lấy danh sách giáo viên cố vấn
router.get("/advisors", getAdvisors);

// @route   GET /api/users/teachers
// @desc    Lấy danh sách giáo viên cho sinh viên đăng ký
router.get("/teachers", getTeachers);

// @route   GET /api/users/teachers/public
// @desc    Lấy danh sách giáo viên cố vấn công khai
router.get("/teachers/public", getPublicAdvisors);

// @route   GET /api/users/:id
// @desc    Lấy thông tin người dùng theo ID
router.get("/:id", protect, getUserById);

// @route   PUT /api/users/:id
// @desc    Cập nhật thông tin người dùng
router.put("/:id", protect, updateUser);

// @route   DELETE /api/users/:id
// @desc    Xóa người dùng
router.delete("/:id", protect, authorize(["admin"]), deleteUser);

// @route   PUT /api/users/:id/approve
// @desc    Phê duyệt người dùng
router.put(
  "/:id/approve",
  protect,
  authorize(["admin", "teacher"]),
  approveUser
);

// @route   PUT /api/users/:id/reject
// @desc    Từ chối người dùng
router.put("/:id/reject", protect, authorize(["admin", "teacher"]), rejectUser);

// @route   PUT /api/users/:id/role
// @desc    Cập nhật vai trò người dùng
router.put("/:id/role", protect, authorize(["admin"]), updateUserRole);

// @route   POST /api/users/register-class
// @desc    Đăng ký lớp học
router.post("/register-class", protect, authorize(["student"]), registerClass);

module.exports = router;
