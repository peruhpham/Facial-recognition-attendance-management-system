const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/department.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// Lấy danh sách tất cả khoa
router.get("/", protect, departmentController.getAllDepartments);

// API công khai cho việc đăng ký
router.get("/public", departmentController.getAllDepartments);

// Lấy khoa theo ID
router.get("/:id", protect, departmentController.getDepartmentById);

// Tạo khoa mới
router.post(
  "/",
  protect,
  authorize(["admin"]),
  departmentController.createDepartment
);

// Cập nhật khoa
router.put(
  "/:id",
  protect,
  authorize(["admin"]),
  departmentController.updateDepartment
);

// Xóa khoa
router.delete(
  "/:id",
  protect,
  authorize(["admin"]),
  departmentController.deleteDepartment
);

module.exports = router;
