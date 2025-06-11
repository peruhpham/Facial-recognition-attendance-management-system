const { Subject, Department } = require("../models/schemas");
const mongoose = require("mongoose");

/**
 * @desc    Lấy danh sách tất cả môn học
 * @route   GET /api/subjects
 * @access  Private
 */
exports.getAllSubjects = async (req, res) => {
  try {
    const { department_id, status } = req.query;
    const query = {};

    if (department_id) {
      query.department_id = department_id;
    }

    if (status) {
      query.status = status;
    }

    const subjects = await Subject.find(query)
      .populate("department_id", "name code")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách môn học",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy môn học theo ID
 * @route   GET /api/subjects/:id
 * @access  Private
 */
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate(
      "department_id",
      "name code"
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học với ID này",
      });
    }

    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin môn học",
      error: error.message,
    });
  }
};

/**
 * @desc    Tạo môn học mới
 * @route   POST /api/subjects
 * @access  Private (Admin)
 */
exports.createSubject = async (req, res) => {
  try {
    const { name, code, credits, department_id, description, status } =
      req.body;

    // Kiểm tra mã môn học đã tồn tại chưa
    const existingSubject = await Subject.findOne({ code });
    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: "Mã môn học này đã tồn tại",
      });
    }

    // Kiểm tra department tồn tại (nếu có)
    if (department_id) {
      const dept = await Department.findById(department_id);
      if (!dept) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khoa với ID này",
        });
      }
    }

    const subject = await Subject.create({
      name,
      code,
      credits: credits || 3,
      department_id,
      description,
      status: status || "đang dạy",
    });

    res.status(201).json({
      success: true,
      data: subject,
      message: "Tạo môn học thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo môn học mới:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo môn học mới",
      error: error.message,
    });
  }
};

/**
 * @desc    Cập nhật môn học
 * @route   PUT /api/subjects/:id
 * @access  Private (Admin)
 */
exports.updateSubject = async (req, res) => {
  try {
    const { name, code, credits, department_id, description, status } =
      req.body;
    const subjectId = req.params.id;

    // Kiểm tra mã môn học đã tồn tại chưa (trừ môn học hiện tại)
    if (code) {
      const existingSubject = await Subject.findOne({
        code,
        _id: { $ne: subjectId },
      });

      if (existingSubject) {
        return res.status(400).json({
          success: false,
          message: "Mã môn học này đã tồn tại",
        });
      }
    }

    // Kiểm tra department tồn tại (nếu có)
    if (department_id) {
      const dept = await Department.findById(department_id);
      if (!dept) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khoa với ID này",
        });
      }
    }

    const subject = await Subject.findByIdAndUpdate(
      subjectId,
      {
        name,
        code,
        credits,
        department_id,
        description,
        status,
        updated_at: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học với ID này",
      });
    }

    res.status(200).json({
      success: true,
      data: subject,
      message: "Cập nhật môn học thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật môn học",
      error: error.message,
    });
  }
};

/**
 * @desc    Xóa môn học
 * @route   DELETE /api/subjects/:id
 * @access  Private (Admin)
 */
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học với ID này",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa môn học thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa môn học",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy môn học theo khoa
 * @route   GET /api/subjects/department/:departmentId
 * @access  Private
 */
exports.getSubjectsByDepartment = async (req, res) => {
  try {
    const departmentId = req.params.departmentId;

    // Kiểm tra department tồn tại
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khoa với ID này",
      });
    }

    const subjects = await Subject.find({ department_id: departmentId }).sort({
      name: 1,
    });

    if (!subjects || subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học nào thuộc khoa này",
      });
    }

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error("Lỗi khi lấy môn học theo khoa:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy môn học theo khoa",
      error: error.message,
    });
  }
};
