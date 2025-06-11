const express = require("express");
const router = express.Router();
const {
  login,
  register,
  getCurrentUser,
  googleCallback,
  completeGoogleSignup,
  approveUser,
  rejectUser,
  getPendingUsers,
  checkUserStatus,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");
const passport = require("passport");

// @route   POST /api/auth/login
// @desc    Đăng nhập người dùng
router.post("/login", login);

// @route   POST /api/auth/register
// @desc    Đăng ký người dùng
router.post("/register", register);

// @route   GET /api/auth/me
// @desc    Lấy thông tin người dùng hiện tại
router.get("/me", protect, getCurrentUser);

// @route   GET /api/auth/google
// @desc    Đăng nhập bằng Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account", // Thêm option để luôn hiển thị trang chọn tài khoản Google
  })
);

// @route   GET /api/auth/google/callback
// @desc    Callback sau khi đăng nhập Google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login/error",
    session: false,
  }),
  googleCallback
);

// @route   POST /api/auth/google-complete
// @desc    Hoàn tất đăng ký với Google sau khi chọn vai trò
router.post("/google-complete", completeGoogleSignup);

// @route   GET /api/auth/pending
// @desc    Lấy danh sách người dùng chờ phê duyệt
router.get(
  "/pending",
  protect,
  authorize(["admin", "teacher"]),
  getPendingUsers
);

// @route   PUT /api/auth/approve/:id
// @desc    Phê duyệt người dùng
router.put(
  "/approve/:id",
  protect,
  authorize(["admin", "teacher"]),
  approveUser
);

// @route   PUT /api/auth/reject/:id
// @desc    Từ chối người dùng
router.put("/reject/:id", protect, authorize(["admin", "teacher"]), rejectUser);

// @route   GET /api/auth/check-status
// @desc    Kiểm tra trạng thái người dùng theo email hoặc Google ID
router.get("/check-status", checkUserStatus);

// @route   POST /api/auth/forgot-password
// @desc    Quên mật khẩu
router.post("/forgot-password", forgotPassword);

// @route   PUT /api/auth/reset-password/:token
// @desc    Đặt lại mật khẩu
router.put("/reset-password/:token", resetPassword);

module.exports = router;
