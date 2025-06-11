const { Course } = require("../models/schemas");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Controller quản lý môn học
 */

// @desc    Lấy danh sách tất cả môn học
// @route   GET /api/courses
// @access  Private
exports.getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const department = req.query.department || "";
    const sort = req.query.sort || "name";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    if (department) {
      query.department_id = department;
    }

    const sortOptions = {};
    if (sort === "name") {
      sortOptions.name = 1;
    } else if (sort === "code") {
      sortOptions.code = 1;
    } else if (sort === "credit") {
      sortOptions.credit = 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate("department_id", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: courses,
    });
  } catch (error) {
    console.error("Error in getAllCourses:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy môn học theo ID
// @route   GET /api/courses/:id
// @access  Private
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "department_id",
      "name"
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Error in getCourseById:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tạo môn học mới
// @route   POST /api/courses
// @access  Private (Admin)
exports.createCourse = async (req, res) => {
  try {
    const { name, code, credit, description, department_id } = req.body;

    // Kiểm tra môn học đã tồn tại chưa
    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: "Mã môn học đã tồn tại",
      });
    }

    const course = await Course.create({
      name,
      code,
      credit,
      description,
      department_id,
    });

    res.status(201).json({
      success: true,
      data: course,
      message: "Tạo môn học thành công",
    });
  } catch (error) {
    console.error("Error in createCourse:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Cập nhật môn học
// @route   PUT /api/courses/:id
// @access  Private (Admin)
exports.updateCourse = async (req, res) => {
  try {
    const { name, code, credit, description, department_id } = req.body;
    const courseId = req.params.id;

    // Kiểm tra mã môn học đã tồn tại chưa (trừ môn học hiện tại)
    if (code) {
      const existingCourse = await Course.findOne({
        code,
        _id: { $ne: courseId },
      });

      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: "Mã môn học đã tồn tại",
        });
      }
    }

    const course = await Course.findByIdAndUpdate(
      courseId,
      { name, code, credit, description, department_id },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
      message: "Cập nhật môn học thành công",
    });
  } catch (error) {
    console.error("Error in updateCourse:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Xóa môn học
// @route   DELETE /api/courses/:id
// @access  Private (Admin)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy môn học",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa môn học thành công",
    });
  } catch (error) {
    console.error("Error in deleteCourse:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy thống kê về môn học
// @route   GET /api/courses/statistics
// @access  Private (Admin)
exports.getCourseStatistics = async (req, res) => {
  try {
    const totalCount = await Course.countDocuments();

    // Thống kê theo khoa
    const departmentStats = await Course.aggregate([
      {
        $match: {
          department_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$department_id",
          count: { $sum: 1 },
          avgCredit: { $avg: "$credit" },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          departmentName: "$department.name",
          count: 1,
          avgCredit: 1,
        },
      },
    ]);

    // Thống kê tín chỉ
    const creditStats = await Course.aggregate([
      {
        $group: {
          _id: null,
          avgCredit: { $avg: "$credit" },
          minCredit: { $min: "$credit" },
          maxCredit: { $max: "$credit" },
          totalCredits: { $sum: "$credit" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCount,
      departmentStats,
      creditStats: creditStats.length > 0 ? creditStats[0] : null,
    });
  } catch (error) {
    console.error("Error in getCourseStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê môn học",
      error: error.message,
    });
  }
};
