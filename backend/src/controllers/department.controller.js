const { Department, User } = require("../models/schemas");

/**
 * @desc    Lấy danh sách tất cả phòng ban
 * @route   GET /api/departments
 * @access  Private (Admin)
 */
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("head_id", "full_name email")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách khoa:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách khoa",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy phòng ban theo ID
 * @route   GET /api/departments/:id
 * @access  Private
 */
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate(
      "head_id",
      "full_name email"
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoa với ID này",
      });
    }

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin khoa:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin khoa",
      error: error.message,
    });
  }
};

/**
 * @desc    Tạo phòng ban mới
 * @route   POST /api/departments
 * @access  Private (Admin)
 */
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description, head_id } = req.body;

    // Kiểm tra mã khoa đã tồn tại chưa
    const existingDepartment = await Department.findOne({ code });
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: "Mã khoa này đã tồn tại",
      });
    }

    // Kiểm tra trưởng khoa là giáo viên
    if (head_id) {
      const head = await User.findById(head_id);
      if (!head || head.role !== "teacher") {
        return res.status(400).json({
          success: false,
          message: "Trưởng khoa phải là giáo viên",
        });
      }
    }

    const department = await Department.create({
      name,
      code,
      description,
      head_id,
    });

    res.status(201).json({
      success: true,
      data: department,
      message: "Tạo khoa thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo khoa mới:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo khoa mới",
      error: error.message,
    });
  }
};

/**
 * @desc    Cập nhật phòng ban
 * @route   PUT /api/departments/:id
 * @access  Private (Admin)
 */
exports.updateDepartment = async (req, res) => {
  try {
    const { name, code, description, head_id } = req.body;
    const departmentId = req.params.id;

    // Kiểm tra mã khoa đã tồn tại chưa (trừ khoa hiện tại)
    if (code) {
      const existingDepartment = await Department.findOne({
        code,
        _id: { $ne: departmentId },
      });

      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: "Mã khoa này đã tồn tại",
        });
      }
    }

    // Kiểm tra trưởng khoa là giáo viên
    if (head_id) {
      const head = await User.findById(head_id);
      if (!head || head.role !== "teacher") {
        return res.status(400).json({
          success: false,
          message: "Trưởng khoa phải là giáo viên",
        });
      }
    }

    const department = await Department.findByIdAndUpdate(
      departmentId,
      {
        name,
        code,
        description,
        head_id,
      },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoa với ID này",
      });
    }

    res.status(200).json({
      success: true,
      data: department,
      message: "Cập nhật khoa thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật khoa:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật khoa",
      error: error.message,
    });
  }
};

/**
 * @desc    Xóa phòng ban
 * @route   DELETE /api/departments/:id
 * @access  Private (Admin)
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoa với ID này",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa khoa thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa khoa:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa khoa",
      error: error.message,
    });
  }
};
