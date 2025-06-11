const {
  MainClass,
  TeachingClass,
  User,
  Notification,
  StudentScore,
  AttendanceSession,
  AttendanceLog,
  Semester,
  Major,
  Department,
} = require("../models/schemas");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Controller quản lý lớp học
 */

// =================== MAIN CLASS CONTROLLERS ===================

// @desc    Lấy danh sách tất cả lớp chính
// @route   GET /api/classes/main
// @access  Private
exports.getAllMainClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const majorIdFilter = req.query.major_id || "";
    const departmentIdFilter = req.query.department_id || "";
    const getAllWithoutPagination = req.query.all === "true";
    const advisorId = req.query.advisor_id || "";
    const yearStartFilter = req.query.year_start || "";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { class_code: { $regex: search, $options: "i" } },
      ];
    }

    if (majorIdFilter) {
      if (!mongoose.Types.ObjectId.isValid(majorIdFilter)) {
        return res.status(400).json({
          success: false,
          message: "ID Ngành không hợp lệ",
        });
      }
      query.major_id = majorIdFilter;
    } else if (departmentIdFilter) {
      if (!mongoose.Types.ObjectId.isValid(departmentIdFilter)) {
        return res.status(400).json({
          success: false,
          message: "ID Khoa không hợp lệ",
        });
      }
      const majorsInDepartment = await Major.find({
        department_id: departmentIdFilter,
      }).select("_id");
      if (majorsInDepartment.length > 0) {
        query.major_id = { $in: majorsInDepartment.map((m) => m._id) };
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          totalPages: 1,
          currentPage: page,
          data: [],
        });
      }
    }

    if (yearStartFilter) {
      const year = parseInt(yearStartFilter, 10);
      if (!isNaN(year)) {
        query.year_start = year;
      }
    }

    if (advisorId) {
      if (!mongoose.Types.ObjectId.isValid(advisorId)) {
        return res.status(400).json({
          success: false,
          message: "ID giáo viên cố vấn không hợp lệ",
        });
      }
      query.advisor_id = advisorId;
    }

    const populateOptions = [
      {
        path: "major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      },
      { path: "advisor_id", select: "full_name email" },
    ];

    if (getAllWithoutPagination) {
      const mainClasses = await MainClass.find(query)
        .populate(populateOptions)
        .sort({ name: 1 });

      return res.status(200).json({
        success: true,
        count: mainClasses.length,
        data: mainClasses,
      });
    }

    const total = await MainClass.countDocuments(query);
    const mainClasses = await MainClass.find(query)
      .populate(populateOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mainClasses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: mainClasses,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách lớp chính",
      error: error.message,
    });
  }
};

// @desc    Lấy lớp chính theo ID
// @route   GET /api/classes/main/:id
// @access  Private
exports.getMainClassById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID lớp chính không hợp lệ" });
    }
    const mainClass = await MainClass.findById(req.params.id)
      .populate({
        path: "major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      })
      .populate("advisor_id", "full_name email")
      .populate("students", "full_name email student_id avatar_url");

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    res.status(200).json({
      success: true,
      data: mainClass,
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tạo lớp chính mới
// @route   POST /api/classes/main
// @access  Private (Admin)
exports.createMainClass = async (req, res) => {
  try {
    const {
      name,
      class_code,
      major_id,
      advisor_id,
      students,
      year_start,
      year_end,
    } = req.body;

    if (!name || !class_code || !major_id || !year_start) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp đủ thông tin bắt buộc: tên lớp, mã lớp, ngành và năm bắt đầu.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(major_id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID Ngành không hợp lệ." });
    }
    const majorExists = await Major.findById(major_id);
    if (!majorExists) {
      return res
        .status(404)
        .json({ success: false, message: "Ngành học không tồn tại." });
    }

    if (advisor_id && !mongoose.Types.ObjectId.isValid(advisor_id)) {
      return res
        .status(400)
        .json({ success: false, message: "ID Cố vấn không hợp lệ." });
    }
    if (advisor_id) {
      const advisorExists = await User.findById(advisor_id);
      if (!advisorExists || advisorExists.role !== "teacher") {
        return res.status(404).json({
          success: false,
          message: "Cố vấn không tồn tại hoặc không phải là giáo viên.",
        });
      }
    }

    const existingClass = await MainClass.findOne({ class_code });
    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: "Mã lớp đã tồn tại",
      });
    }

    const mainClass = await MainClass.create({
      name,
      class_code,
      major_id,
      advisor_id: advisor_id || null,
      students: students || [],
      year_start,
      year_end,
    });

    const populatedMainClass = await MainClass.findById(mainClass._id)
      .populate({
        path: "major_id",
        select: "name code department_id",
        populate: { path: "department_id", select: "name code" },
      })
      .populate("advisor_id", "full_name email");

    res.status(201).json({
      success: true,
      data: populatedMainClass,
      message: "Tạo lớp chính thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tạo lớp chính",
      error: error.message,
    });
  }
};

// @desc    Cập nhật lớp chính
// @route   PUT /api/classes/main/:id
// @access  Private (Admin, Teacher)
exports.updateMainClass = async (req, res) => {
  try {
    const {
      name,
      class_code,
      major_id,
      advisor_id,
      students,
      year_start,
      year_end,
    } = req.body;
    const mainClassId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(mainClassId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID lớp chính không hợp lệ" });
    }

    const existingClass = await MainClass.findById(mainClassId);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    if (
      req.user.role === "teacher" &&
      (!existingClass.advisor_id ||
        existingClass.advisor_id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không có quyền cập nhật lớp này vì bạn không phải là cố vấn của lớp",
      });
    }

    if (major_id) {
      if (!mongoose.Types.ObjectId.isValid(major_id)) {
        return res
          .status(400)
          .json({ success: false, message: "ID Ngành không hợp lệ." });
      }
      const majorExists = await Major.findById(major_id);
      if (!majorExists) {
        return res
          .status(404)
          .json({ success: false, message: "Ngành học không tồn tại." });
      }
    }

    if (req.user.role === "admin" && advisor_id) {
      if (!mongoose.Types.ObjectId.isValid(advisor_id)) {
        return res
          .status(400)
          .json({ success: false, message: "ID Cố vấn không hợp lệ." });
      }
      const advisorExists = await User.findById(advisor_id);
      if (!advisorExists || advisorExists.role !== "teacher") {
        return res.status(404).json({
          success: false,
          message: "Cố vấn không tồn tại hoặc không phải là giáo viên.",
        });
      }
    }

    if (class_code && class_code !== existingClass.class_code) {
      const duplicateCode = await MainClass.findOne({
        class_code: class_code,
        _id: { $ne: mainClassId },
      });
      if (duplicateCode) {
        return res.status(400).json({
          success: false,
          message: "Mã lớp đã tồn tại cho lớp khác",
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (class_code) updateData.class_code = class_code;
    if (major_id) updateData.major_id = major_id;
    if (year_start) updateData.year_start = year_start;
    if (year_end) updateData.year_end = year_end;

    if (req.user.role === "admin") {
      if (advisor_id !== undefined) updateData.advisor_id = advisor_id;
    } else {
      // Giáo viên không được tự ý đổi ngành, năm học, cố vấn, hoặc danh sách sinh viên của lớp.
      // Họ chỉ có thể sửa tên, mã lớp (nếu logic cho phép).
      // Để đơn giản, hiện tại không cho giáo viên sửa gì ở đây ngoài việc xem.
      // Nếu muốn cho sửa, cần check kỹ các trường được phép.
    }

    const updatedMainClass = await MainClass.findByIdAndUpdate(
      mainClassId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: "major_id",
        select: "name code department_id",
        populate: { path: "department_id", select: "name code" },
      })
      .populate("advisor_id", "full_name email");

    // Gửi thông báo cho sinh viên trong lớp nếu có sự thay đổi quan trọng
    if (
      updatedMainClass &&
      existingClass.students &&
      existingClass.students.length > 0
    ) {
      const studentIds = existingClass.students.map(
        (student) => student._id || student
      ); // student có thể là ObjectId hoặc object User đã populate
      const notifications = studentIds.map((studentId) => ({
        receiver_id: studentId,
        sender_id: req.user.id, // Người thực hiện thay đổi
        type: "SCHEDULE_UPDATE", // Hoặc một type phù hợp hơn như 'CLASS_INFO_UPDATE'
        content: `Thông tin lớp chính '${existingClass.name}' đã được cập nhật.`,
        link: `/class-details/${mainClassId}`, // Link tới trang chi tiết lớp học
        data: {
          mainClassId: mainClassId,
          className: existingClass.name,
        },
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(200).json({
      success: true,
      data: updatedMainClass,
      message: "Cập nhật lớp chính thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật lớp chính",
      error: error.message,
    });
  }
};

// @desc    Xóa lớp chính
// @route   DELETE /api/classes/main/:id
// @access  Private (Admin)
exports.deleteMainClass = async (req, res) => {
  try {
    const mainClassId = req.params.id;

    const mainClass = await MainClass.findById(mainClassId);

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Kiểm tra quyền: Admin có thể xóa bất kỳ lớp nào.
    // Giáo viên chỉ có thể xóa lớp chính mà họ làm cố vấn.
    if (req.user.role === "teacher") {
      if (
        !mainClass.advisor_id ||
        mainClass.advisor_id.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn không có quyền xóa lớp chính này vì bạn không phải là cố vấn của lớp.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này.",
      });
    }

    // 1. Cập nhật User: gỡ bỏ main_class_id của các sinh viên thuộc lớp này
    await User.updateMany(
      { main_class_id: mainClassId },
      { $unset: { main_class_id: "" } }
    );

    // 2. Cập nhật TeachingClass: đặt main_class_id thành null
    await TeachingClass.updateMany(
      { main_class_id: mainClassId },
      { $set: { main_class_id: null } }
    );

    // 3. Xóa Notification liên quan đến việc phê duyệt/từ chối vào lớp này
    await Notification.deleteMany({
      type: "CLASS_ENROLLMENT", // Cập nhật type
      "data.mainClassId": mainClassId, // Cập nhật đường dẫn trong data
    });

    // 4. Xóa Lớp chính
    await MainClass.findByIdAndDelete(mainClassId);

    res.status(200).json({
      success: true,
      message: "Xóa lớp chính và các dữ liệu liên quan thành công",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Lỗi khi xóa lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa lớp chính",
      error: error.message,
    });
  }
};

// @desc    Lấy thông kê của lớp chính
// @route   GET /api/classes/main-statistics
// @access  Private (Admin)
exports.getMainClassStatistics = async (req, res) => {
  try {
    const totalCount = await MainClass.countDocuments();

    // Lưu ý: trong schema, trường code được đặt tên là class_code
    const departmentStats = await MainClass.aggregate([
      {
        $match: {
          department_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$department_id",
          count: { $sum: 1 },
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
        },
      },
    ]);

    // Tính số lượng sinh viên trong tất cả các lớp chính
    const totalStudents = await MainClass.aggregate([
      {
        $project: {
          studentCount: {
            $cond: {
              if: { $isArray: "$students" },
              then: { $size: "$students" },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: "$studentCount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCount,
      departmentStats,
      totalStudents:
        totalStudents.length > 0 ? totalStudents[0].totalStudents : 0,
    });
  } catch (error) {
    console.error("Error in getMainClassStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê lớp chính",
      error: error.message,
    });
  }
};

// =================== TEACHING CLASS CONTROLLERS ===================

// @desc    Lấy danh sách tất cả lớp giảng dạy
// @route   GET /api/classes/teaching
// @access  Private
exports.getAllTeachingClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const subjectId = req.query.subject_id || "";
    const teacherId = req.query.teacher_id || "";
    const semesterId = req.query.semester || "";
    const mainClassId = req.query.main_class_id || "";

    const query = {};

    if (search) {
      query.$or = [{ class_name: { $regex: search, $options: "i" } }];
    }

    if (subjectId) {
      query.subject_id = subjectId;
    }

    if (teacherId) {
      query.teacher_id = teacherId;
    }

    if (semesterId) {
      query.semester_id = semesterId;
    }

    if (mainClassId) {
      query.main_class_id = mainClassId;
    }

    const total = await TeachingClass.countDocuments(query);
    const teachingClasses = await TeachingClass.find(query)
      .populate("subject_id", "name code")
      .populate("teacher_id", "full_name email")
      .populate("main_class_id", "name class_code")
      .populate("semester_id", "name year academic_year start_date end_date")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const classesWithStatus = await Promise.all(
      teachingClasses.map(async (cls) => {
        const classObj = cls.toObject();

        if (classObj.semester_id) {
          const currentDate = new Date();
          const startDate = new Date(classObj.semester_id.start_date);
          const endDate = new Date(classObj.semester_id.end_date);

          if (currentDate < startDate) {
            classObj.is_active = false;
            classObj.status = "chưa bắt đầu";
          } else if (currentDate > endDate) {
            classObj.is_active = false;
            classObj.status = "đã kết thúc";
          } else {
            classObj.is_active = true;
            classObj.status = "đang học";
          }
        } else {
          classObj.is_active = false;
          classObj.status = "không xác định";
        }

        return classObj;
      })
    );

    res.status(200).json({
      success: true,
      count: classesWithStatus.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: classesWithStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy lớp giảng dạy theo ID
// @route   GET /api/classes/teaching/:id
// @access  Private
exports.getTeachingClassById = async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID lớp học không hợp lệ",
      });
    }

    const teachingClass = await TeachingClass.findById(id)
      .populate("subject_id", "name code")
      .populate("teacher_id", "full_name email")
      .populate("main_class_id", "name class_code")
      .populate("semester_id", "name year")
      .populate("students", "full_name email school_info avatar_url");

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    res.status(200).json({
      success: true,
      data: teachingClass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy các lớp giảng dạy của giáo viên
// @route   GET /api/classes/teaching/teacher/:id
// @access  Private
exports.getTeachingClassesByTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const semester_id = req.query.semester_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = { teacher_id: teacherId };

    if (semester_id) {
      if (!mongoose.Types.ObjectId.isValid(semester_id)) {
        return res
          .status(400)
          .json({ success: false, message: "ID học kỳ không hợp lệ" });
      }
      query.semester_id = semester_id;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      const subjectIds = await mongoose
        .model("Subject")
        .find({
          $or: [{ name: searchRegex }, { code: searchRegex }],
        })
        .select("_id");

      query.$or = [
        { class_name: searchRegex },
        { class_code: searchRegex },
        { subject_id: { $in: subjectIds.map((s) => s._id) } },
      ];
    }

    const total = await TeachingClass.countDocuments(query);
    const teachingClasses = await TeachingClass.find(query)
      .populate("subject_id", "name code credits")
      .populate("teacher_id", "full_name email")
      .populate("main_class_id", "name class_code")
      .populate("semester_id", "name year start_date end_date")
      .populate({
        path: "students",
        select: "full_name email school_info.student_id",
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const classesWithStatus = await Promise.all(
      teachingClasses.map(async (cls) => {
        const classObj = cls.toObject();

        if (
          classObj.semester_id &&
          classObj.semester_id.start_date &&
          classObj.semester_id.end_date
        ) {
          const currentDate = new Date();
          const startDate = new Date(classObj.semester_id.start_date);
          const endDate = new Date(classObj.semester_id.end_date);

          if (currentDate < startDate) {
            classObj.is_active = false;
            classObj.status = "chưa bắt đầu";
          } else if (currentDate > endDate) {
            classObj.is_active = false;
            classObj.status = "đã kết thúc";
          } else {
            classObj.is_active = true;
            classObj.status = "đang học";
          }
        } else {
          classObj.is_active = false;
          classObj.status = "không xác định";
        }

        if (classObj.subject_id === null) {
          classObj.subject_id = { name: "N/A", code: "N/A", credits: 0 };
        }
        if (classObj.teacher_id === null) {
          classObj.teacher_id = { full_name: "N/A", email: "N/A" };
        }
        if (classObj.semester_id === null) {
          classObj.semester_id = {
            name: "N/A",
            year: "N/A",
            start_date: null,
            end_date: null,
          };
        }
        if (classObj.main_class_id === null) {
          classObj.main_class_id = { name: "N/A", class_code: "N/A" };
        }

        return classObj;
      })
    );

    res.status(200).json({
      success: true,
      count: classesWithStatus.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: classesWithStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy các lớp giảng dạy của sinh viên
// @route   GET /api/classes/teaching/student/:id
// @access  Private
exports.getTeachingClassesByStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const semesterId = req.query.semester;
    const academicYear = req.query.academicYear;
    const search = req.query.search || "";

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID sinh viên không hợp lệ" });
    }

    const pipeline = [];

    let semesterIdsToFilter = [];
    if (semesterId && mongoose.Types.ObjectId.isValid(semesterId)) {
      semesterIdsToFilter.push(new ObjectId(semesterId));
    } else if (academicYear) {
      const semestersInYear = await Semester.find({
        academic_year: academicYear,
      }).select("_id");
      semesterIdsToFilter = semestersInYear.map((s) => s._id);
      if (semesterIdsToFilter.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
    }

    const matchStage = {
      $match: {
        students: new ObjectId(studentId),
      },
    };
    if (semesterIdsToFilter.length > 0) {
      matchStage.$match.semester_id = { $in: semesterIdsToFilter };
    }
    pipeline.push(matchStage);

    pipeline.push({
      $lookup: {
        from: "subjects",
        localField: "subject_id",
        foreignField: "_id",
        as: "subjectInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true },
    });

    pipeline.push({
      $lookup: {
        from: "users",
        localField: "teacher_id",
        foreignField: "_id",
        as: "teacherInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$teacherInfo", preserveNullAndEmptyArrays: true },
    });

    pipeline.push({
      $lookup: {
        from: "semesters",
        localField: "semester_id",
        foreignField: "_id",
        as: "semesterInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$semesterInfo", preserveNullAndEmptyArrays: true },
    });

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      pipeline.push({
        $match: {
          $or: [
            { class_name: searchRegex },
            { class_code: searchRegex },
            { "subjectInfo.name": searchRegex },
            { "subjectInfo.code": searchRegex },
            { "teacherInfo.full_name": searchRegex },
          ],
        },
      });
    }

    pipeline.push({
      $project: {
        _id: 1,
        class_name: 1,
        class_code: 1,
        students: 1,
        total_sessions: 1,
        max_absent_allowed: 1,
        schedule: 1,
        course_start_date: 1,
        course_end_date: 1,
        created_at: 1,
        updated_at: 1,
        subject_id: {
          _id: "$subjectInfo._id",
          name: "$subjectInfo.name",
          code: "$subjectInfo.code",
          credits: "$subjectInfo.credits",
        },
        teacher_id: {
          _id: "$teacherInfo._id",
          full_name: "$teacherInfo.full_name",
          email: "$teacherInfo.email",
        },
        semester_id: {
          _id: "$semesterInfo._id",
          name: "$semesterInfo.name",
          year: "$semesterInfo.year",
          academic_year: "$semesterInfo.academic_year",
          start_date: "$semesterInfo.start_date",
          end_date: "$semesterInfo.end_date",
        },
      },
    });

    pipeline.push({ $sort: { created_at: -1 } });

    console.log("Executing pipeline:", JSON.stringify(pipeline, null, 2));
    const teachingClasses = await TeachingClass.aggregate(pipeline);

    const classesWithStatus = teachingClasses.map((cls) => {
      const currentDate = new Date();
      const startDate = cls.semester_id?.start_date
        ? new Date(cls.semester_id.start_date)
        : null;
      const endDate = cls.semester_id?.end_date
        ? new Date(cls.semester_id.end_date)
        : null;

      if (startDate && endDate) {
        if (currentDate < startDate) {
          cls.status = "chưa bắt đầu";
        } else if (currentDate > endDate) {
          cls.status = "đã kết thúc";
        } else {
          cls.status = "đang học";
        }
      } else {
        cls.status = "không xác định";
      }
      return cls;
    });

    res.status(200).json({
      success: true,
      count: classesWithStatus.length,
      data: classesWithStatus,
    });
  } catch (error) {
    console.error("Lỗi khi lấy lớp học của sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tạo lớp giảng dạy mới
// @route   POST /api/classes/teaching
// @access  Private (Admin, Teacher)
exports.createTeachingClass = async (req, res) => {
  try {
    const {
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id,
      semester_id,
      total_sessions,
      students,
      schedule,
      course_start_date,
      course_end_date,
      auto_generate_sessions,
    } = req.body;

    const semester = await Semester.findById(semester_id);
    if (!semester) {
      return res.status(400).json({
        success: false,
        message: "Học kỳ không tồn tại",
      });
    }

    if (course_start_date && course_end_date) {
      const startDate = new Date(course_start_date);
      const endDate = new Date(course_end_date);
      const semesterStartDate = new Date(semester.start_date);
      const semesterEndDate = new Date(semester.end_date);

      if (startDate < semesterStartDate || endDate > semesterEndDate) {
        return res.status(400).json({
          success: false,
          message:
            "Thời gian khóa học phải nằm trong khoảng thời gian của học kỳ",
          details: {
            semester_start: semester.start_date,
            semester_end: semester.end_date,
            course_start: course_start_date,
            course_end: course_end_date,
          },
        });
      }
    }

    if (schedule && Array.isArray(schedule)) {
      for (const item of schedule) {
        if (!item.room_id) {
          return res.status(400).json({
            success: false,
            message: `Vui lòng chọn phòng học cho buổi học vào ${getDayOfWeekName(
              item.day_of_week
            )}`,
          });
        }
      }
    }

    const teachingClass = await TeachingClass.create({
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id: main_class_id || null,
      semester_id,
      total_sessions: total_sessions || 15,
      students: students || [],
      schedule: schedule || [],
      course_start_date,
      course_end_date,
      auto_generate_sessions:
        auto_generate_sessions !== undefined ? auto_generate_sessions : true,
      updated_at: Date.now(),
    });

    if (
      teachingClass.auto_generate_sessions &&
      schedule &&
      schedule.length > 0 &&
      course_start_date &&
      course_end_date
    ) {
      await generateAttendanceSessions(teachingClass);
    }

    res.status(201).json({
      success: true,
      data: teachingClass,
      message: "Tạo lớp giảng dạy thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Cập nhật lớp giảng dạy
// @route   PUT /api/classes/teaching/:id
// @access  Private (Admin, Teacher)
exports.updateTeachingClass = async (req, res) => {
  try {
    const {
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id,
      semester_id,
      total_sessions,
      schedule,
      students,
      course_start_date,
      course_end_date,
      auto_generate_sessions,
    } = req.body;

    const teachingClass = await TeachingClass.findById(req.params.id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật lớp này",
      });
    }

    const semesterId = semester_id || teachingClass.semester_id;

    const semester = await Semester.findById(semesterId);
    if (!semester) {
      return res.status(400).json({
        success: false,
        message: "Học kỳ không tồn tại",
      });
    }

    if (course_start_date && course_end_date) {
      const startDate = new Date(course_start_date);
      const endDate = new Date(course_end_date);
      const semesterStartDate = new Date(semester.start_date);
      const semesterEndDate = new Date(semester.end_date);

      if (startDate < semesterStartDate || endDate > semesterEndDate) {
        return res.status(400).json({
          success: false,
          message:
            "Thời gian khóa học phải nằm trong khoảng thời gian của học kỳ",
          details: {
            semester_start: semester.start_date,
            semester_end: semester.end_date,
            course_start: course_start_date,
            course_end: course_end_date,
          },
        });
      }
    }

    if (schedule && Array.isArray(schedule)) {
      for (const item of schedule) {
        if (!item.room_id) {
          return res.status(400).json({
            success: false,
            message: `Vui lòng chọn phòng học cho buổi học vào ${getDayOfWeekName(
              item.day_of_week
            )}`,
          });
        }
      }
    }

    const updateData = {
      class_name,
      class_code,
      subject_id,
      teacher_id,
      main_class_id: main_class_id || null,
      semester_id,
      total_sessions,
      schedule,
      students,
      course_start_date,
      course_end_date,
      updated_at: Date.now(),
    };

    if (auto_generate_sessions !== undefined) {
      updateData.auto_generate_sessions = auto_generate_sessions;
    }

    const updatedClass = await TeachingClass.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (
      updatedClass.auto_generate_sessions &&
      schedule &&
      schedule.length > 0 &&
      course_start_date &&
      course_end_date
    ) {
      await generateAttendanceSessions(updatedClass);
    }

    // Gửi thông báo cho sinh viên trong lớp nếu có sự thay đổi quan trọng
    if (
      updatedClass &&
      teachingClass.students &&
      teachingClass.students.length > 0
    ) {
      const studentIds = teachingClass.students.map(
        (student) => student._id || student
      ); // student có thể là ObjectId hoặc object User đã populate

      const notifications = studentIds.map((studentId) => ({
        receiver_id: studentId,
        sender_id: req.user.id, // Người thực hiện thay đổi
        type: "SCHEDULE_UPDATE", // Hoặc một type phù hợp hơn như 'CLASS_INFO_UPDATE'
        content: `Thông tin lớp học phần '${teachingClass.class_name}' đã được cập nhật.`,
        link: `/teaching-class-details/${updatedClass._id}`, // Link tới trang chi tiết lớp học phần
        data: {
          teachingClassId: updatedClass._id,
          className: teachingClass.class_name,
        },
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(200).json({
      success: true,
      data: updatedClass,
      message: "Cập nhật lớp giảng dạy thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Xóa lớp giảng dạy
// @route   DELETE /api/classes/teaching/:id
// @access  Private (Admin, Teacher)
exports.deleteTeachingClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const teachingClass = await TeachingClass.findById(classId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (req.user.role !== "admin") {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: "Xác thực không thành công hoặc thiếu thông tin người dùng.",
        });
      }
      if (
        !teachingClass.teacher_id ||
        teachingClass.teacher_id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn không có quyền xóa lớp giảng dạy này. Lớp có thể không có giáo viên được phân công, hoặc bạn không phải là giáo viên của lớp.",
        });
      }
    }

    const sessions = await AttendanceSession.find({
      teaching_class_id: classId,
    });
    const sessionIds = sessions.map((s) => s._id);

    if (sessionIds.length > 0) {
      await AttendanceLog.deleteMany({ session_id: { $in: sessionIds } });
    }
    await AttendanceSession.deleteMany({ teaching_class_id: classId });

    await StudentScore.deleteMany({ teaching_class_id: classId });

    await TeachingClass.findByIdAndDelete(classId);

    res.status(200).json({
      success: true,
      message: "Xóa lớp giảng dạy và các dữ liệu liên quan thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa lớp giảng dạy:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa lớp giảng dạy",
      error: error.message,
    });
  }
};

// @desc    Kiểm tra xung đột lịch học
// @route   POST /api/classes/teaching/check-conflicts
// @access  Private
exports.checkScheduleConflicts = async (req, res) => {
  try {
    const { teacher_id, schedule, class_id } = req.body;

    if (
      !teacher_id ||
      !schedule ||
      !Array.isArray(schedule) ||
      schedule.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cần thiết để kiểm tra xung đột lịch",
      });
    }

    const conflicts = [];

    for (const scheduleItem of schedule) {
      const { day_of_week, start_time, end_time, room_id } = scheduleItem;

      if (!day_of_week || !start_time || !end_time || !room_id) {
        continue;
      }

      const teacherClassesQuery = {
        teacher_id,
        schedule: {
          $elemMatch: {
            day_of_week: day_of_week,
            $or: [
              {
                start_time: { $lte: start_time },
                end_time: { $gte: start_time },
              },
              {
                start_time: { $lte: end_time },
                end_time: { $gte: end_time },
              },
              {
                start_time: { $gte: start_time },
                end_time: { $lte: end_time },
              },
            ],
          },
        },
      };

      if (class_id) {
        teacherClassesQuery._id = { $ne: class_id };
      }

      const teacherConflicts = await TeachingClass.find(teacherClassesQuery)
        .populate("subject_id", "name code")
        .select("class_name class_code subject_id schedule");

      if (teacherConflicts.length > 0) {
        teacherConflicts.forEach((conflictClass) => {
          const conflictSchedule = conflictClass.schedule.find(
            (item) =>
              item.day_of_week === day_of_week &&
              ((item.start_time <= start_time && item.end_time >= start_time) ||
                (item.start_time <= end_time && item.end_time >= end_time) ||
                (item.start_time >= start_time && item.end_time <= end_time))
          );

          if (conflictSchedule) {
            conflicts.push({
              type: "teacher",
              day_of_week,
              time: `${conflictSchedule.start_time} - ${conflictSchedule.end_time}`,
              class_info: {
                id: conflictClass._id,
                name: conflictClass.class_name,
                code: conflictClass.class_code,
                subject: conflictClass.subject_id?.name || "Không xác định",
              },
              message: `Giáo viên đã có lịch dạy lớp ${
                conflictClass.class_name
              } (${
                conflictClass.subject_id?.name || "Không xác định"
              }) vào ${getDayOfWeekName(day_of_week)} lúc ${
                conflictSchedule.start_time
              } - ${conflictSchedule.end_time}`,
            });
          }
        });
      }

      const roomQuery = {
        schedule: {
          $elemMatch: {
            room_id: new mongoose.Types.ObjectId(room_id),
            day_of_week: day_of_week,
            $or: [
              {
                start_time: { $lte: start_time },
                end_time: { $gte: start_time },
              },
              {
                start_time: { $lte: end_time },
                end_time: { $gte: end_time },
              },
              {
                start_time: { $gte: start_time },
                end_time: { $lte: end_time },
              },
            ],
          },
        },
      };

      if (class_id) {
        roomQuery._id = { $ne: class_id };
      }

      const roomConflicts = await TeachingClass.find(roomQuery)
        .populate("subject_id", "name code")
        .populate("teacher_id", "full_name")
        .select("class_name class_code subject_id teacher_id schedule");

      if (roomConflicts.length > 0) {
        roomConflicts.forEach((conflictClass) => {
          const conflictSchedule = conflictClass.schedule.find(
            (item) =>
              item.room_id.toString() === room_id.toString() &&
              item.day_of_week === day_of_week &&
              ((item.start_time <= start_time && item.end_time >= start_time) ||
                (item.start_time <= end_time && item.end_time >= end_time) ||
                (item.start_time >= start_time && item.end_time <= end_time))
          );

          if (conflictSchedule) {
            conflicts.push({
              type: "room",
              day_of_week,
              time: `${conflictSchedule.start_time} - ${conflictSchedule.end_time}`,
              room_id,
              class_info: {
                id: conflictClass._id,
                name: conflictClass.class_name,
                code: conflictClass.class_code,
                subject: conflictClass.subject_id?.name || "Không xác định",
                teacher:
                  conflictClass.teacher_id?.full_name || "Không xác định",
              },
              message: `Phòng học đã được đặt cho lớp ${
                conflictClass.class_name
              } (${
                conflictClass.subject_id?.name || "Không xác định"
              }) của giảng viên ${
                conflictClass.teacher_id?.full_name || "Không xác định"
              } vào ${getDayOfWeekName(day_of_week)} lúc ${
                conflictSchedule.start_time
              } - ${conflictSchedule.end_time}`,
            });
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      has_conflicts: conflicts.length > 0,
      conflicts,
    });
  } catch (error) {
    console.error("Lỗi khi kiểm tra xung đột lịch học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi kiểm tra xung đột lịch học",
      error: error.message,
    });
  }
};

// Hàm hỗ trợ để lấy tên thứ trong tuần từ số
const getDayOfWeekName = (day) => {
  const days = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  return days[day] || "Không xác định";
};

// Hàm hỗ trợ tạo các buổi điểm danh dựa vào lịch học
async function generateAttendanceSessions(teachingClass) {
  try {
    await AttendanceSession.deleteMany({
      teaching_class_id: teachingClass._id,
      status: "pending",
    });

    if (!teachingClass.schedule || teachingClass.schedule.length === 0) {
      return;
    }

    const startDate = new Date(teachingClass.course_start_date);
    const endDate = new Date(teachingClass.course_end_date);

    if (!startDate || !endDate) {
      return;
    }

    for (const scheduleItem of teachingClass.schedule) {
      if (!scheduleItem.is_recurring) {
        if (
          scheduleItem.specific_dates &&
          scheduleItem.specific_dates.length > 0
        ) {
          for (const specificDate of scheduleItem.specific_dates) {
            const sessionDate = new Date(specificDate);
            await createAttendanceSession(
              teachingClass,
              scheduleItem,
              sessionDate
            );
          }
        }
        continue;
      }

      const currentDate = new Date(startDate);
      let sessionCount = 0;

      while (
        currentDate <= endDate &&
        sessionCount < teachingClass.total_sessions
      ) {
        if (currentDate.getDay() === scheduleItem.day_of_week) {
          const isExcluded =
            scheduleItem.excluded_dates &&
            scheduleItem.excluded_dates.some(
              (date) =>
                new Date(date).toDateString() === currentDate.toDateString()
            );

          if (!isExcluded) {
            await createAttendanceSession(
              teachingClass,
              scheduleItem,
              new Date(currentDate)
            );
            sessionCount++;
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  } catch (error) {
    console.error("Lỗi khi tạo buổi điểm danh:", error);
  }
}

async function createAttendanceSession(
  teachingClass,
  scheduleItem,
  sessionDate
) {
  const [startHour, startMinute] = scheduleItem.start_time
    .split(":")
    .map(Number);
  const [endHour, endMinute] = scheduleItem.end_time.split(":").map(Number);

  const startTime = new Date(sessionDate);
  startTime.setHours(startHour, startMinute, 0);

  const endTime = new Date(sessionDate);
  endTime.setHours(endHour, endMinute, 0);

  const sessionNumber =
    (await AttendanceSession.countDocuments({
      teaching_class_id: teachingClass._id,
    })) + 1;

  await AttendanceSession.create({
    teaching_class_id: teachingClass._id,
    session_number: sessionNumber,
    date: sessionDate,
    room: scheduleItem.room_id,
    start_time: startTime,
    end_time: endTime,
    status: "pending",
    students_absent: [...teachingClass.students],
  });
}

// @desc    Tạo lại tất cả các buổi điểm danh theo lịch học
// @route   POST /api/classes/teaching/:id/generate-sessions
// @access  Private (Admin, Teacher)
exports.regenerateAttendanceSessions = async (req, res) => {
  try {
    const teachingClass = await TeachingClass.findById(req.params.id).populate(
      "students",
      "_id"
    );

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    await generateAttendanceSessions(teachingClass);

    res.status(200).json({
      success: true,
      message: "Tạo lại các buổi điểm danh thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy thông kê của lớp giảng dạy
// @route   GET /api/classes/teaching-statistics
// @access  Private (Admin)
exports.getTeachingClassStatistics = async (req, res) => {
  try {
    const totalCount = await TeachingClass.countDocuments();

    const subjectStats = await TeachingClass.aggregate([
      {
        $match: {
          subject_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$subject_id",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "subjects",
          localField: "_id",
          foreignField: "_id",
          as: "subject",
        },
      },
      {
        $unwind: {
          path: "$subject",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          subjectName: "$subject.name",
          subjectCode: "$subject.code",
          count: 1,
        },
      },
    ]);

    const teacherStats = await TeachingClass.aggregate([
      {
        $match: {
          teacher_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$teacher_id",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
      {
        $unwind: {
          path: "$teacher",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          teacherName: "$teacher.full_name",
          teacherEmail: "$teacher.email",
          count: 1,
        },
      },
    ]);

    const totalStudents = await TeachingClass.aggregate([
      {
        $project: {
          studentCount: {
            $cond: {
              if: { $isArray: "$students" },
              then: { $size: "$students" },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: "$studentCount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalCount,
      subjectStats,
      teacherStats,
      totalStudents:
        totalStudents.length > 0 ? totalStudents[0].totalStudents : 0,
    });
  } catch (error) {
    console.error("Error in getTeachingClassStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê lớp giảng dạy",
      error: error.message,
    });
  }
};

// =================== STUDENT MANAGEMENT CONTROLLERS ===================

// @desc    Thêm sinh viên vào lớp giảng dạy
// @route   POST /api/classes/teaching/:id/students
// @access  Private (Admin, Teacher)
exports.addStudentToClass = async (req, res) => {
  try {
    const { student_id } = req.body;
    const classId = req.params.id;

    const teachingClass = await TeachingClass.findById(classId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thêm sinh viên vào lớp này",
      });
    }

    if (teachingClass.students.includes(student_id)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên đã có trong lớp",
      });
    }

    teachingClass.students.push(student_id);
    await teachingClass.save();

    res.status(200).json({
      success: true,
      message: "Thêm sinh viên vào lớp thành công",
      data: teachingClass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Thêm nhiều sinh viên vào lớp giảng dạy
// @route   POST /api/classes/teaching/:id/students/batch
// @access  Private (Admin, Teacher)
exports.addStudentsBatch = async (req, res) => {
  try {
    const { student_ids } = req.body;
    const classId = req.params.id;

    if (!student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp danh sách ID sinh viên",
      });
    }

    const teachingClass = await TeachingClass.findById(classId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thêm sinh viên vào lớp này",
      });
    }

    const newStudents = student_ids.filter(
      (id) => !teachingClass.students.includes(id)
    );

    teachingClass.students = [...teachingClass.students, ...newStudents];
    await teachingClass.save();

    res.status(200).json({
      success: true,
      message: `Đã thêm ${newStudents.length} sinh viên vào lớp`,
      data: teachingClass,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Xóa sinh viên khỏi lớp giảng dạy
// @route   DELETE /api/classes/teaching/:id/students/:studentId
// @access  Private (Admin, Teacher)
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    const teachingClass = await TeachingClass.findById(classId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa sinh viên khỏi lớp này",
      });
    }

    if (!teachingClass.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên không có trong lớp",
      });
    }

    teachingClass.students = teachingClass.students.filter(
      (id) => id.toString() !== studentId
    );
    await teachingClass.save();

    await StudentScore.deleteOne({
      teaching_class_id: classId,
      student_id: studentId,
    });

    const sessions = await AttendanceSession.find({
      teaching_class_id: classId,
    });

    for (const session of sessions) {
      await AttendanceLog.deleteMany({
        session_id: session._id,
        student_id: studentId,
      });

      session.students_present = session.students_present.filter(
        (id) => id.toString() !== studentId
      );
      session.students_absent = session.students_absent.filter(
        (id) => id.toString() !== studentId
      );
      await session.save();
    }

    res.status(200).json({
      success: true,
      message: "Xóa sinh viên khỏi lớp và các dữ liệu liên quan thành công",
      data: teachingClass,
    });
  } catch (error) {
    console.error("Lỗi khi xóa sinh viên khỏi lớp giảng dạy:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa sinh viên",
      error: error.message,
    });
  }
};

// =================== STUDENT APPROVAL CONTROLLERS ===================

// @desc    Get pending students of a main class
// @route   GET /api/classes/main/:id/pending-students
// @access  Private (Admin, Advisor)
exports.getPendingStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const mainClass = await MainClass.findById(id);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    if (
      req.user.role !== "admin" &&
      (req.user.role !== "teacher" ||
        !mainClass.advisor_id ||
        !mainClass.advisor_id.equals(req.user.id))
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không có quyền xem danh sách sinh viên chờ duyệt của lớp này",
      });
    }

    if (!mainClass.pending_students) {
      mainClass.pending_students = [];
      await mainClass.save();

      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const pendingStudents = await User.find({
      _id: { $in: mainClass.pending_students },
      role: "student",
      status: "pending",
    })
      .select("-password -refresh_token") // Không loại bỏ faceFeatures để kiểm tra has_face_data
      .populate({
        path: "school_info.class_id",
        select: "name class_code major_id year_start",
        populate: {
          path: "major_id",
          select: "name code department_id",
          populate: {
            path: "department_id",
            select: "name code",
          },
        },
      })
      .populate("contact") // Populate thông tin liên hệ
      .sort({ created_at: -1 }); // Sắp xếp theo ngày tạo mới nhất lên trước

    const pendingStudentsWithFaceInfo = pendingStudents.map((student) => {
      const studentObj = student.toObject();

      // Kiểm tra has_face_data dựa trên faceFeatures đầy đủ
      studentObj.has_face_data = !!(
        studentObj.faceFeatures &&
        studentObj.faceFeatures.descriptors &&
        studentObj.faceFeatures.descriptors.length > 0
      );

      // Loại bỏ descriptors khỏi response để giảm dung lượng nhưng vẫn giữ lastUpdated
      if (studentObj.faceFeatures && studentObj.faceFeatures.descriptors) {
        delete studentObj.faceFeatures.descriptors;
      }

      if (
        studentObj.has_face_data &&
        studentObj.faceImages &&
        studentObj.faceImages.length > 0
      ) {
        studentObj.faceImages = studentObj.faceImages;
      } else {
        studentObj.faceImages = [];
      }

      return studentObj;
    });

    return res.status(200).json({
      success: true,
      data: pendingStudentsWithFaceInfo,
    });
  } catch (error) {
    console.error("Error getting pending students:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Approve a student to join a main class
// @route   PUT /api/classes/main/:id/approve-student/:studentId
// @access  Private (Admin, Advisor)
exports.approveStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const mainClass = await MainClass.findById(id);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    if (
      req.user.role !== "admin" &&
      (req.user.role !== "teacher" ||
        !mainClass.advisor_id ||
        !mainClass.advisor_id.equals(req.user.id))
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền phê duyệt sinh viên vào lớp này",
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sinh viên",
      });
    }

    if (!mainClass.pending_students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên không nằm trong danh sách chờ duyệt",
      });
    }

    if (mainClass.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên đã được phê duyệt vào lớp này trước đó",
      });
    }

    student.status = "approved";
    student.main_class_id = id;
    await student.save();

    mainClass.students.push(studentId);
    mainClass.pending_students = mainClass.pending_students.filter(
      (id) => id.toString() !== studentId.toString()
    );
    await mainClass.save();

    try {
      await Notification.create({
        title: "Đăng ký lớp học được chấp nhận",
        content: `Yêu cầu tham gia lớp ${mainClass.name} (${mainClass.class_code}) của bạn đã được chấp nhận.`,
        type: "CLASS_ENROLLMENT",
        sender_id: req.user.id,
        receiver_id: studentId,
        data: {
          studentId: studentId,
          studentName: student.full_name, // Giả sử student đã được populate hoặc lấy thông tin trước đó
          mainClassId: id,
          mainClassName: mainClass.name,
          mainClassCode: mainClass.class_code,
          status: "approved",
        },
        link: `/student/classes/main/${id}`, // Link tới trang chi tiết lớp chính của sinh viên
      });
    } catch (notifError) {
      console.error(
        "Lỗi khi tạo thông báo phê duyệt sinh viên vào lớp:",
        notifError
      );
    }

    return res.status(200).json({
      success: true,
      message: "Phê duyệt sinh viên thành công",
      data: {
        student: {
          id: student._id,
          fullName: student.fullName,
          email: student.email,
          status: student.status,
        },
        main_class: {
          id: mainClass._id,
          name: mainClass.name,
        },
      },
    });
  } catch (error) {
    console.error("Error approving student:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// @desc    Từ chối sinh viên vào lớp chính
// @route   PUT /api/classes/main/:id/reject-student/:studentId
// @access  Private (Admin, Teacher)
exports.rejectStudent = async (req, res) => {
  try {
    const mainClassId = req.params.id;
    const studentId = req.params.studentId;
    const { reason } = req.body;

    const mainClass = await MainClass.findById(mainClassId).populate(
      "advisor_id",
      "full_name email"
    );

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền từ chối sinh viên vào lớp này",
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sinh viên",
      });
    }

    await User.findByIdAndUpdate(studentId, {
      status: "rejected",
      approved_by: req.user.id,
      approval_date: Date.now(),
    });

    if (mainClass.pending_students && mainClass.pending_students.length > 0) {
      mainClass.pending_students = mainClass.pending_students.filter(
        (id) => id.toString() !== studentId.toString()
      );
      await mainClass.save();
    }

    try {
      await Notification.create({
        title: "Đăng ký lớp học bị từ chối",
        content: `Yêu cầu tham gia lớp ${mainClass.name} (${
          mainClass.class_code
        }) của bạn đã bị từ chối. ${
          reason
            ? "Lý do: " + reason
            : "Vui lòng liên hệ giáo viên cố vấn hoặc quản trị viên để biết thêm chi tiết."
        }`,
        type: "CLASS_ENROLLMENT",
        sender_id: req.user.id,
        receiver_id: studentId,
        // main_class_id: mainClassId, // Loại bỏ, đã đưa vào data
        data: {
          studentId: studentId,
          studentName: student.full_name, // Giả sử student đã được populate hoặc lấy thông tin trước đó
          mainClassId: mainClassId,
          mainClassName: mainClass.name,
          mainClassCode: mainClass.class_code,
          reason: reason || null,
          status: "rejected",
        },
        link: "/student/class-registration", // Link tới trang đăng ký lớp để SV tìm lớp khác
      });
    } catch (notifError) {
      console.error(
        "Lỗi khi tạo thông báo từ chối sinh viên vào lớp:",
        notifError
      );
    }

    res.status(200).json({
      success: true,
      message: "Đã từ chối sinh viên",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách sinh viên đã được duyệt trong lớp chính
// @route   GET /api/classes/main/:id/approved-students
// @access  Private (Admin, Advisor)
exports.getApprovedStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { search, page = 1, limit = 10, sort = "full_name" } = req.query;
    const mainClass = await MainClass.findById(id);

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    if (
      req.user.role !== "admin" &&
      req.user.role !== "teacher" &&
      (!mainClass.advisor_id || mainClass.advisor_id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem danh sách này",
      });
    }

    const query = {
      _id: { $in: mainClass.students },
      role: "student",
    };

    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "school_info.student_id": { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    const approvedStudents = await User.find(query)
      .select("-password -refresh_token") // Không loại bỏ faceFeatures để kiểm tra has_face_data
      .populate({
        path: "school_info.class_id",
        select: "name class_code major_id year_start year_end",
        populate: {
          path: "major_id",
          select: "name code department_id",
          populate: {
            path: "department_id",
            select: "name code",
          },
        },
      })
      .populate("contact") // Populate thông tin liên hệ
      .populate("advisor_id", "full_name email") // Populate thông tin cố vấn
      .sort({ [sort]: 1 })
      .skip(skip)
      .limit(limitInt);

    const approvedStudentsWithFaceInfo = approvedStudents.map((student) => {
      const studentObj = student.toObject();

      // Kiểm tra has_face_data dựa trên faceFeatures đầy đủ
      studentObj.has_face_data = !!(
        studentObj.faceFeatures &&
        studentObj.faceFeatures.descriptors &&
        studentObj.faceFeatures.descriptors.length > 0
      );

      // Loại bỏ descriptors khỏi response để giảm dung lượng nhưng vẫn giữ lastUpdated
      if (studentObj.faceFeatures && studentObj.faceFeatures.descriptors) {
        delete studentObj.faceFeatures.descriptors;
      }

      if (
        studentObj.has_face_data &&
        studentObj.faceImages &&
        studentObj.faceImages.length > 0
      ) {
        studentObj.faceImages = studentObj.faceImages;
      } else {
        studentObj.faceImages = [];
      }

      return studentObj;
    });

    res.status(200).json({
      success: true,
      data: {
        students: approvedStudentsWithFaceInfo,
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách sinh viên đăng ký trong một lớp giảng dạy
// @route   GET /api/classes/teaching/:id/students
// @access  Private (Teacher, Admin)
exports.getClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const teachingClass = await TeachingClass.findById(id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông tin lớp này",
      });
    }

    // *** THÊM: Cập nhật điểm chuyên cần trước khi lấy danh sách ***
    try {
      const attendanceController = require("./attendance.controller");
      if (typeof attendanceController.updateAttendanceScores === "function") {
        await attendanceController.updateAttendanceScores(id);
        console.log(
          `[getClassStudents] Đã cập nhật điểm chuyên cần cho class ${id}`
        );
      }
    } catch (scoreError) {
      console.error(
        `[getClassStudents] Lỗi khi cập nhật điểm chuyên cần:`,
        scoreError
      );
      // Tiếp tục với logic cũ nếu có lỗi
    }

    const students = await User.find({
      _id: { $in: teachingClass.students },
    }).select("_id full_name email avatar_url school_info.student_id");

    const studentScores = await StudentScore.find({
      teaching_class_id: id,
    });

    const studentsWithScores = students.map((student) => {
      const score = studentScores.find(
        (score) => score.student_id.toString() === student._id.toString()
      );

      return {
        ...student.toObject(),
        score: score
          ? {
              attendance_score: score.attendance_score,
              absent_sessions: score.absent_sessions,
              final_score: score.final_score,
              is_failed_due_to_absent: score.is_failed_due_to_absent,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: students.length,
      data: studentsWithScores,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sinh viên trong lớp:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách sinh viên trong lớp",
      error: error.message,
    });
  }
};

// @desc    Cập nhật điểm môn học cho sinh viên
// @route   PUT /api/classes/teaching/:id/students/:studentId/score
// @access  Private (Teacher)
exports.updateStudentScore = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const { final_score, attendance_score, note } = req.body;

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      teachingClass.teacher_id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật điểm cho lớp này",
      });
    }

    if (!teachingClass.students.includes(studentId)) {
      return res.status(404).json({
        success: false,
        message: "Sinh viên không thuộc lớp học này",
      });
    }

    let scoreRecord = await StudentScore.findOne({
      teaching_class_id: id,
      student_id: studentId,
    });

    if (!scoreRecord) {
      scoreRecord = new StudentScore({
        teaching_class_id: id,
        student_id: studentId,
        total_sessions: teachingClass.total_sessions,
        max_absent_allowed: teachingClass.max_absent_allowed || 3,
      });
    }

    if (final_score !== undefined) {
      scoreRecord.final_score = final_score;
    }

    if (attendance_score !== undefined) {
      scoreRecord.attendance_score = attendance_score;
    }

    if (note) {
      scoreRecord.note = note;
    }

    scoreRecord.last_updated = Date.now();
    await scoreRecord.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật điểm thành công",
      data: scoreRecord,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật điểm sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật điểm sinh viên",
      error: error.message,
    });
  }
};

// @desc    Lấy thông tin về tình trạng vắng mặt trong lớp học
// @route   GET /api/classes/teaching/:id/attendance-stats
// @access  Private (Teacher, Admin)
exports.getClassAttendanceStats = async (req, res) => {
  try {
    const { id } = req.params;

    const teachingClass = await TeachingClass.findById(id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông tin lớp này",
      });
    }

    const sessions = await AttendanceSession.find({
      teaching_class_id: id,
    }).sort({ session_number: 1 });

    const studentScores = await StudentScore.find({
      teaching_class_id: id,
    });

    const students = await User.find({
      _id: { $in: teachingClass.students },
    }).select("_id full_name school_info.student_id");

    const attendanceLogs = await AttendanceLog.find({
      session_id: { $in: sessions.map((s) => s._id) },
    });

    const studentStats = students.map((student) => {
      const score = studentScores.find(
        (s) => s.student_id.toString() === student._id.toString()
      );

      const sessionStats = sessions.map((session) => {
        const log = attendanceLogs.find(
          (log) =>
            log.session_id.toString() === session._id.toString() &&
            log.student_id.toString() === student._id.toString()
        );

        return {
          session_id: session._id,
          session_number: session.session_number,
          date: session.date,
          status: log ? log.status : "absent",
          note: log ? log.note : null,
        };
      });

      return {
        student_id: student._id,
        full_name: student.full_name,
        student_id: student.school_info?.student_id,
        absent_sessions: score ? score.absent_sessions : 0,
        attendance_score: score ? score.attendance_score : 10,
        is_failed_due_to_absent: score ? score.is_failed_due_to_absent : false,
        sessions: sessionStats,
      };
    });

    const sessionStats = sessions.map((session) => {
      const presentCount = session.students_present.length;
      const absentCount = session.students_absent.length;
      const totalStudents = teachingClass.students.length;

      return {
        session_id: session._id,
        session_number: session.session_number,
        date: session.date,
        present_count: presentCount,
        absent_count: absentCount,
        attendance_rate:
          totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        class_info: {
          _id: teachingClass._id,
          class_name: teachingClass.class_name,
          class_code: teachingClass.class_code,
          total_sessions: teachingClass.total_sessions,
          max_absent_allowed: teachingClass.max_absent_allowed,
        },
        sessions_completed: sessions.filter((s) => s.status === "completed")
          .length,
        total_sessions: teachingClass.total_sessions,
        student_stats: studentStats,
        session_stats: sessionStats,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê điểm danh",
      error: error.message,
    });
  }
};

// @desc    Xóa sinh viên khỏi lớp chính và cập nhật các liên kết
// @route   DELETE /api/classes/main/:id/students/:studentId
// @access  Private (Admin, Advisor)
exports.removeStudentFromMainClass = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    const mainClass = await MainClass.findById(classId);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    if (
      req.user.role !== "admin" &&
      (!mainClass.advisor_id || mainClass.advisor_id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa sinh viên khỏi lớp này",
      });
    }

    if (!mainClass.students.map((s) => s.toString()).includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên không có trong lớp chính này",
      });
    }

    mainClass.students = mainClass.students.filter(
      (sId) => sId.toString() !== studentId
    );
    await mainClass.save();

    await User.findByIdAndUpdate(studentId, { $unset: { main_class_id: "" } });

    await Notification.deleteMany({
      recipient_id: studentId,
      type: "class_approval",
      "data.class_id": classId,
    });

    res.status(200).json({
      success: true,
      message: "Xóa sinh viên khỏi lớp chính và cập nhật liên kết thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa sinh viên khỏi lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa sinh viên khỏi lớp chính",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách các buổi học có thể xin nghỉ của sinh viên cho một lớp học cụ thể
// @route   GET /api/v1/classes/teaching/:teachingClassId/schedulable-sessions-for-student
// @access  Private (Student)
exports.getSchedulableSessionsForStudent = async (req, res) => {
  try {
    const { teachingClassId } = req.params;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(teachingClassId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID lớp học không hợp lệ." });
    }

    // 1. Lấy TeachingClass đầy đủ, bao gồm cả 'schedule'
    const teachingClass = await TeachingClass.findById(teachingClassId)
      .select("+schedule") // Đảm bảo lấy trường schedule
      .lean();

    if (!teachingClass) {
      return res
        .status(404)
        .json({ success: false, message: "Lớp học không tồn tại." });
    }

    const isStudentInClass = teachingClass.students.some(
      (sId) => sId.toString() === studentId
    );
    if (!isStudentInClass) {
      return res.status(403).json({
        success: false,
        message: "Sinh viên không thuộc lớp học này.",
      });
    }

    // 2. Lấy các buổi học (AttendanceSession) của lớp đó có trạng thái "pending"
    const sessions = await AttendanceSession.find({
      teaching_class_id: teachingClassId,
      status: "pending", // CHỈ LẤY CÁC BUỔI HỌC SẮP DIỄN RA
    })
      .populate({
        path: "teaching_class_id",
        select: "class_name subject_id",
        populate: {
          path: "subject_id",
          select: "name code",
        },
      })
      .populate("room", "room_number")
      .sort({ date: 1, start_period: 1 })
      .lean();

    if (!sessions || sessions.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Không cần logic lọc phức tạp ở dưới nữa vì đã lọc bằng status
    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách buổi học có thể xin nghỉ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách buổi học.",
      error: error.message,
    });
  }
};

// @desc    Lấy thông kê chi tiết của lớp chính
// @route   GET /api/classes/main/:id/detailed-statistics
// @access  Private (Admin, Advisor)
exports.getMainClassDetailedStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID lớp chính không hợp lệ",
      });
    }

    const mainClass = await MainClass.findById(id)
      .populate({
        path: "major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      })
      .populate("advisor_id", "full_name email")
      .populate(
        "students",
        "full_name email status avatar_url school_info.student_id"
      );

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Kiểm tra quyền truy cập
    if (
      req.user.role !== "admin" &&
      (!mainClass.advisor_id ||
        mainClass.advisor_id._id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thống kê này",
      });
    }

    // Thống kê sinh viên theo trạng thái
    const pendingStudentsCount = await User.countDocuments({
      _id: { $in: mainClass.pending_students || [] },
      status: "pending",
    });

    const approvedStudentsCount = mainClass.students?.length || 0;

    // Thống kê sinh viên có/không có dữ liệu khuôn mặt
    const studentsWithFaceData = await User.countDocuments({
      _id: { $in: mainClass.students || [] },
      "faceFeatures.descriptors.0": { $exists: true },
    });

    const studentsWithoutFaceData =
      approvedStudentsCount - studentsWithFaceData;

    // Thống kê theo giới tính
    const genderStats = await User.aggregate([
      { $match: { _id: { $in: mainClass.students || [] } } },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ]);

    // Thống kê số lượng lớp giảng dạy liên quan
    const relatedTeachingClasses = await TeachingClass.countDocuments({
      main_class_id: id,
    });

    // Thống kê điểm danh trung bình (nếu có)
    const attendanceStats = await StudentScore.aggregate([
      {
        $lookup: {
          from: "teachingclasses",
          localField: "teaching_class_id",
          foreignField: "_id",
          as: "teaching_class",
        },
      },
      {
        $match: {
          "teaching_class.main_class_id": new mongoose.Types.ObjectId(id),
        },
      },
      {
        $group: {
          _id: null,
          averageAttendanceScore: { $avg: "$attendance_score" },
          totalAbsentSessions: { $sum: "$absent_sessions" },
          studentsWithAttendanceIssues: {
            $sum: { $cond: ["$is_failed_due_to_absent", 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        classInfo: {
          _id: mainClass._id,
          name: mainClass.name,
          class_code: mainClass.class_code,
          year_start: mainClass.year_start,
          year_end: mainClass.year_end,
          major: mainClass.major_id,
          advisor: mainClass.advisor_id,
        },
        studentStats: {
          total: approvedStudentsCount + pendingStudentsCount,
          approved: approvedStudentsCount,
          pending: pendingStudentsCount,
          withFaceData: studentsWithFaceData,
          withoutFaceData: studentsWithoutFaceData,
          faceDataPercentage:
            approvedStudentsCount > 0
              ? Math.round((studentsWithFaceData / approvedStudentsCount) * 100)
              : 0,
        },
        genderDistribution: genderStats.reduce((acc, item) => {
          acc[item._id || "unknown"] = item.count;
          return acc;
        }, {}),
        academicStats: {
          relatedTeachingClasses,
          averageAttendanceScore:
            attendanceStats[0]?.averageAttendanceScore || 0,
          totalAbsentSessions: attendanceStats[0]?.totalAbsentSessions || 0,
          studentsWithAttendanceIssues:
            attendanceStats[0]?.studentsWithAttendanceIssues || 0,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê chi tiết lớp chính:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê",
      error: error.message,
    });
  }
};

// @desc    Export danh sách sinh viên lớp chính ra Excel
// @route   GET /api/classes/main/:id/export-students
// @access  Private (Admin, Advisor)
exports.exportMainClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "approved" } = req.query; // approved, pending, all

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID lớp chính không hợp lệ",
      });
    }

    const mainClass = await MainClass.findById(id)
      .populate({
        path: "major_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      })
      .populate("advisor_id", "full_name email");

    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp chính",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      (!mainClass.advisor_id ||
        mainClass.advisor_id._id.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền export dữ liệu này",
      });
    }

    let studentQuery = {};

    if (type === "approved") {
      studentQuery = {
        _id: { $in: mainClass.students || [] },
        status: "approved",
      };
    } else if (type === "pending") {
      studentQuery = {
        _id: { $in: mainClass.pending_students || [] },
        status: "pending",
      };
    } else if (type === "all") {
      const allStudentIds = [
        ...(mainClass.students || []),
        ...(mainClass.pending_students || []),
      ];
      studentQuery = {
        _id: { $in: allStudentIds },
      };
    }

    const students = await User.find(studentQuery)
      .select("-password -refresh_token -faceFeatures")
      .populate({
        path: "school_info.class_id",
        select: "name class_code major_id",
        populate: {
          path: "major_id",
          select: "name code department_id",
          populate: {
            path: "department_id",
            select: "name code",
          },
        },
      })
      .populate("contact")
      .sort({ full_name: 1 });

    // Chuẩn bị dữ liệu export
    const exportData = students.map((student, index) => ({
      STT: index + 1,
      "Họ và tên": student.full_name || "",
      MSSV: student.school_info?.student_id || "",
      Email: student.email || "",
      "Số điện thoại": student.contact?.phone || "",
      "Địa chỉ": student.contact?.address || "",
      "Giới tính":
        student.gender === "male"
          ? "Nam"
          : student.gender === "female"
          ? "Nữ"
          : student.gender === "other"
          ? "Khác"
          : "Chưa cập nhật",
      "Ngày sinh": student.date_of_birth
        ? new Date(student.date_of_birth).toLocaleDateString("vi-VN")
        : "",
      "Lớp đăng ký": student.school_info?.class_id?.name || "",
      "Mã lớp ĐK": student.school_info?.class_id?.class_code || "",
      Ngành: student.school_info?.class_id?.major_id?.name || "",
      "Mã ngành": student.school_info?.class_id?.major_id?.code || "",
      Khoa: student.school_info?.class_id?.major_id?.department_id?.name || "",
      "Khóa học": student.school_info?.year || "",
      "Trạng thái":
        student.status === "approved"
          ? "Đã duyệt"
          : student.status === "pending"
          ? "Chờ duyệt"
          : student.status === "rejected"
          ? "Đã từ chối"
          : "Không xác định",
      "Đã đăng ký khuôn mặt":
        student.faceFeatures?.descriptors?.length > 0 ? "Có" : "Chưa",
      "Ngày tạo": student.created_at
        ? new Date(student.created_at).toLocaleDateString("vi-VN")
        : "",
      "Ghi chú": student.notes || "",
    }));

    // Thêm thông tin header
    const headerInfo = {
      "Tên lớp": mainClass.name,
      "Mã lớp": mainClass.class_code,
      Ngành: mainClass.major_id?.name || "",
      Khoa: mainClass.major_id?.department_id?.name || "",
      "Cố vấn": mainClass.advisor_id?.full_name || "",
      "Khóa học": `${mainClass.year_start} - ${mainClass.year_end}`,
      "Loại dữ liệu":
        type === "approved"
          ? "Sinh viên đã duyệt"
          : type === "pending"
          ? "Sinh viên chờ duyệt"
          : "Tất cả sinh viên",
      "Tổng số sinh viên": exportData.length,
      "Ngày xuất": new Date().toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    res.status(200).json({
      success: true,
      data: {
        headerInfo,
        students: exportData,
        filename: `DanhSachSinhVien_${
          mainClass.class_code
        }_${type}_${new Date().getTime()}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Lỗi khi export danh sách sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi export dữ liệu",
      error: error.message,
    });
  }
};

// @desc    Lấy chi tiết điểm danh của một sinh viên trong lớp
// @route   GET /api/classes/teaching/:id/students/:studentId/attendance-detail
// @access  Private (Teacher, Admin)
exports.getStudentAttendanceDetail = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(classId) ||
      !mongoose.Types.ObjectId.isValid(studentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "ID lớp học hoặc ID sinh viên không hợp lệ",
      });
    }

    const teachingClass = await TeachingClass.findById(classId)
      .populate("subject_id", "name code")
      .populate("teacher_id", "full_name email");

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền truy cập
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông tin lớp này",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    if (!teachingClass.students.map((s) => s.toString()).includes(studentId)) {
      return res.status(404).json({
        success: false,
        message: "Sinh viên không thuộc lớp học này",
      });
    }

    // Lấy thông tin sinh viên
    const student = await User.findById(studentId)
      .select("full_name email avatar_url school_info.student_id")
      .populate("school_info.class_id", "name class_code");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sinh viên",
      });
    }

    // Lấy tất cả sessions của lớp
    const sessions = await AttendanceSession.find({
      teaching_class_id: classId,
    })
      .populate("room", "room_number building_id")
      .sort({ session_number: 1 });

    // Lấy attendance logs của sinh viên này
    const attendanceLogs = await AttendanceLog.find({
      session_id: { $in: sessions.map((s) => s._id) },
      student_id: studentId,
    });

    // Tạo chi tiết điểm danh cho từng buổi
    const attendanceDetails = sessions.map((session) => {
      const log = attendanceLogs.find(
        (log) => log.session_id.toString() === session._id.toString()
      );

      // Xác định trạng thái điểm danh
      let status = "absent"; // Mặc định là vắng
      let note = null;
      let timestamp = null;

      if (log) {
        status = log.status;
        note = log.note;
        timestamp = log.timestamp;
      } else {
        // Nếu không có log, kiểm tra trong session
        if (
          session.students_present &&
          session.students_present.includes(studentId)
        ) {
          status = "present";
        } else if (
          session.students_absent &&
          session.students_absent.includes(studentId)
        ) {
          status = "absent";
        }
      }

      return {
        session_id: session._id,
        session_number: session.session_number,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        room: session.room,
        session_status: session.status, // pending, completed, cancelled
        attendance_status: status, // present, absent, late, excused
        note: note,
        timestamp: timestamp,
        can_mark_attendance:
          session.status === "in_progress" || session.status === "completed",
      };
    });

    // *** SỬA LOGIC: CHỈ ĐẾM BUỔI VẮNG TRONG CÁC SESSION ĐÃ HOÀN THÀNH ***
    const completedAttendanceDetails = attendanceDetails.filter(
      (detail) => detail.session_status === "completed"
    );

    const absentCountInCompletedSessions = completedAttendanceDetails.filter(
      (a) => a.attendance_status === "absent"
    ).length;

    const presentCountInCompletedSessions = completedAttendanceDetails.filter(
      (a) => a.attendance_status === "present"
    ).length;

    const totalCompletedSessions = completedAttendanceDetails.length;
    const attendanceScore = Math.max(
      0,
      10 - absentCountInCompletedSessions * 2
    );
    const isFailedDueToAbsent =
      absentCountInCompletedSessions > (teachingClass.max_absent_allowed || 3);

    // Cập nhật vào database với logic mới
    await StudentScore.findOneAndUpdate(
      {
        teaching_class_id: classId,
        student_id: studentId,
      },
      {
        $set: {
          total_sessions: totalCompletedSessions, // Số buổi đã hoàn thành
          absent_sessions: absentCountInCompletedSessions, // Chỉ đếm vắng trong completed
          attendance_score: attendanceScore,
          max_absent_allowed: teachingClass.max_absent_allowed || 3,
          is_failed_due_to_absent: isFailedDueToAbsent,
          last_updated: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    // Lấy điểm số đã cập nhật
    const studentScore = {
      attendance_score: attendanceScore,
      is_failed_due_to_absent: isFailedDueToAbsent,
    };

    // Thống kê tổng quan (cập nhật để sử dụng logic mới)
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed"
    ).length;

    // Chỉ đếm trong completed sessions
    const lateCountInCompleted = completedAttendanceDetails.filter(
      (a) => a.attendance_status === "late"
    ).length;
    const excusedCountInCompleted = completedAttendanceDetails.filter(
      (a) => a.attendance_status === "excused"
    ).length;

    const attendanceRate =
      totalCompletedSessions > 0
        ? (presentCountInCompletedSessions / totalCompletedSessions) * 100
        : 0;

    res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          full_name: student.full_name,
          email: student.email,
          avatar_url: student.avatar_url,
          student_id: student.school_info?.student_id,
          class_info: student.school_info?.class_id,
        },
        class: {
          _id: teachingClass._id,
          class_name: teachingClass.class_name,
          class_code: teachingClass.class_code,
          subject: teachingClass.subject_id,
          teacher: teachingClass.teacher_id,
          total_sessions: teachingClass.total_sessions,
          max_absent_allowed: teachingClass.max_absent_allowed || 3,
        },
        attendance_summary: {
          total_sessions: totalSessions, // Tổng sessions dự kiến
          completed_sessions: totalCompletedSessions, // Số sessions đã hoàn thành
          present_count: presentCountInCompletedSessions, // Có mặt trong completed sessions
          absent_count: absentCountInCompletedSessions, // Vắng trong completed sessions
          late_count: lateCountInCompleted, // Muộn trong completed sessions
          excused_count: excusedCountInCompleted, // Có phép trong completed sessions
          attendance_rate: Math.round(attendanceRate * 100) / 100,
          attendance_score: studentScore.attendance_score,
          is_failed_due_to_absent: studentScore.is_failed_due_to_absent,
        },
        attendance_details: attendanceDetails,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết điểm danh sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy chi tiết điểm danh",
      error: error.message,
    });
  }
};

// @desc    Cập nhật trạng thái điểm danh cho sinh viên trong một buổi học
// @route   PUT /api/classes/teaching/:id/sessions/:sessionId/attendance/:studentId
// @access  Private (Teacher, Admin)
exports.updateStudentAttendance = async (req, res) => {
  try {
    const { id: classId, sessionId, studentId } = req.params;
    const { status, note } = req.body;

    if (!["present", "absent", "late", "excused"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái điểm danh không hợp lệ",
      });
    }

    const teachingClass = await TeachingClass.findById(classId);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật điểm danh",
      });
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy buổi học",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    if (!teachingClass.students.map((s) => s.toString()).includes(studentId)) {
      return res.status(404).json({
        success: false,
        message: "Sinh viên không thuộc lớp học này",
      });
    }

    // Cập nhật hoặc tạo attendance log
    let attendanceLog = await AttendanceLog.findOne({
      session_id: sessionId,
      student_id: studentId,
    });

    if (attendanceLog) {
      attendanceLog.status = status;
      attendanceLog.note = note || attendanceLog.note;
      attendanceLog.timestamp = new Date();
    } else {
      attendanceLog = new AttendanceLog({
        session_id: sessionId,
        student_id: studentId,
        status: status,
        note: note,
        timestamp: new Date(),
      });
    }

    await attendanceLog.save();

    // Cập nhật lists trong session
    const studentIdObj = new mongoose.Types.ObjectId(studentId);

    // Xóa khỏi tất cả lists trước
    session.students_present = session.students_present.filter(
      (id) => !id.equals(studentIdObj)
    );
    session.students_absent = session.students_absent.filter(
      (id) => !id.equals(studentIdObj)
    );

    // Thêm vào list tương ứng
    if (status === "present" || status === "late") {
      session.students_present.push(studentIdObj);
    } else {
      session.students_absent.push(studentIdObj);
    }

    await session.save();

    // *** SỬA: Cập nhật điểm chuyên cần bằng logic mới ***
    let updatedScore = null;
    try {
      const attendanceController = require("./attendance.controller");
      if (typeof attendanceController.updateAttendanceScores === "function") {
        const allScores = await attendanceController.updateAttendanceScores(
          classId,
          null // Không truyền session object vì chưa completed
        );
        // Tìm score của sinh viên này trong kết quả
        updatedScore =
          allScores.find(
            (score) =>
              score.student_id &&
              score.student_id.toString() === studentId.toString()
          ) || null;
        console.log(
          `[updateStudentAttendance] Đã cập nhật điểm chuyên cần cho class ${classId}`
        );
      }
    } catch (scoreError) {
      console.error(
        `[updateStudentAttendance] Lỗi khi cập nhật điểm chuyên cần:`,
        scoreError
      );
      // Fallback to old logic
      updatedScore = await this.updateStudentAttendanceScore(
        classId,
        studentId
      );
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật điểm danh thành công",
      data: {
        attendanceLog,
        updatedScore,
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật điểm danh sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật điểm danh",
      error: error.message,
    });
  }
};

// @desc    Cập nhật điểm chuyên cần dựa trên số buổi vắng
// @route   Helper function (internal)
exports.updateStudentAttendanceScore = async (classId, studentId) => {
  try {
    const teachingClass = await TeachingClass.findById(classId);
    if (!teachingClass) return;

    // CHỈ LẤY SESSIONS ĐÃ HOÀN THÀNH
    const completedSessions = await AttendanceSession.find({
      teaching_class_id: classId,
      status: "completed", // CHỈ những buổi đã hoàn thành
    });

    const completedSessionIds = completedSessions.map((s) => s._id);
    const totalCompletedSessions = completedSessions.length;

    // Đếm số buổi có mặt từ AttendanceLog (chỉ trong completed sessions)
    const presentCount = await AttendanceLog.countDocuments({
      session_id: { $in: completedSessionIds },
      student_id: studentId,
      status: "present",
    });

    // Tính số buổi vắng = tổng buổi hoàn thành - số buổi có mặt
    const absentCount = totalCompletedSessions - presentCount;

    // Tính điểm chuyên cần (10 - số buổi vắng * 2, tối thiểu 0)
    const attendanceScore = Math.max(0, 10 - absentCount * 2);

    // Kiểm tra có bị hỏng môn do vắng quá nhiều không
    const maxAbsentAllowed = teachingClass.max_absent_allowed || 3;
    const isFailedDueToAbsent = absentCount > maxAbsentAllowed;

    // Cập nhật hoặc tạo student score
    const updatedScore = await StudentScore.findOneAndUpdate(
      {
        teaching_class_id: classId,
        student_id: studentId,
      },
      {
        $set: {
          total_sessions: totalCompletedSessions, // Thêm field này
          absent_sessions: absentCount,
          attendance_score: attendanceScore,
          max_absent_allowed: maxAbsentAllowed, // Thêm field này
          is_failed_due_to_absent: isFailedDueToAbsent,
          last_updated: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return updatedScore;
  } catch (error) {
    console.error("Lỗi khi cập nhật điểm chuyên cần:", error);
  }
};

// @desc    Recalculate điểm chuyên cần cho một sinh viên
// @route   PUT /api/classes/teaching/:id/students/:studentId/recalculate-attendance
// @access  Private (Teacher, Admin)
exports.recalculateStudentAttendanceScore = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    const teachingClass = await TeachingClass.findById(classId);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật điểm chuyên cần",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    if (!teachingClass.students.map((s) => s.toString()).includes(studentId)) {
      return res.status(404).json({
        success: false,
        message: "Sinh viên không thuộc lớp học này",
      });
    }

    // Recalculate điểm chuyên cần
    const updatedScore = await this.updateStudentAttendanceScore(
      classId,
      studentId
    );

    res.status(200).json({
      success: true,
      message: "Tính lại điểm chuyên cần thành công",
      data: updatedScore,
    });
  } catch (error) {
    console.error("Lỗi khi tính lại điểm chuyên cần:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tính lại điểm chuyên cần",
      error: error.message,
    });
  }
};

// @desc    Recalculate điểm chuyên cần cho tất cả sinh viên trong lớp
// @route   PUT /api/classes/teaching/:id/recalculate-all-attendance
// @access  Private (Teacher, Admin)
exports.recalculateAllStudentsAttendanceScore = async (req, res) => {
  try {
    const { id: classId } = req.params;

    const teachingClass = await TeachingClass.findById(classId);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra quyền
    if (
      req.user.role !== "admin" &&
      teachingClass.teacher_id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật điểm chuyên cần",
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Recalculate cho tất cả sinh viên
    for (const studentId of teachingClass.students) {
      try {
        const updatedScore = await this.updateStudentAttendanceScore(
          classId,
          studentId.toString()
        );
        results.push({
          studentId: studentId.toString(),
          success: true,
          score: updatedScore,
        });
        successCount++;
      } catch (error) {
        console.error(`Lỗi khi tính điểm cho sinh viên ${studentId}:`, error);
        results.push({
          studentId: studentId.toString(),
          success: false,
          error: error.message,
        });
        errorCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Tính lại điểm chuyên cần hoàn tất. Thành công: ${successCount}, Lỗi: ${errorCount}`,
      data: {
        totalStudents: teachingClass.students.length,
        successCount,
        errorCount,
        results,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi khi tính lại điểm chuyên cần cho tất cả sinh viên:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tính lại điểm chuyên cần",
      error: error.message,
    });
  }
};

// @desc    Lấy điểm chuyên cần của sinh viên (cho student dashboard)
// @route   GET /api/classes/teaching/:id/my-attendance-score
// @access  Private (Student)
exports.getMyAttendanceScore = async (req, res) => {
  try {
    const { id: classId } = req.params;
    const studentId = req.user.id;

    const teachingClass = await TeachingClass.findById(classId)
      .populate("subject_id", "name code")
      .populate("teacher_id", "full_name");

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp giảng dạy",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    if (!teachingClass.students.map((s) => s.toString()).includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không thuộc lớp học này",
      });
    }

    // Tự động recalculate điểm chuyên cần
    await this.updateStudentAttendanceScore(classId, studentId);

    // Lấy điểm số đã cập nhật
    const studentScore = await StudentScore.findOne({
      teaching_class_id: classId,
      student_id: studentId,
    });

    // Lấy thống kê từ getStudentAttendanceDetail (reuse logic)
    const sessions = await AttendanceSession.find({
      teaching_class_id: classId,
    }).sort({ session_number: 1 });

    const attendanceLogs = await AttendanceLog.find({
      session_id: { $in: sessions.map((s) => s._id) },
      student_id: studentId,
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    for (const session of sessions) {
      const log = attendanceLogs.find(
        (log) => log.session_id.toString() === session._id.toString()
      );

      let status = "absent";
      if (log) {
        status = log.status;
      } else {
        if (
          session.students_present &&
          session.students_present.includes(studentId)
        ) {
          status = "present";
        } else if (
          session.students_absent &&
          session.students_absent.includes(studentId)
        ) {
          status = "absent";
        }
      }

      switch (status) {
        case "present":
          presentCount++;
          break;
        case "absent":
          absentCount++;
          break;
        case "late":
          lateCount++;
          break;
        case "excused":
          excusedCount++;
          break;
      }
    }

    const totalSessions = sessions.length;
    const attendanceRate =
      totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        class: {
          _id: teachingClass._id,
          class_name: teachingClass.class_name,
          subject: teachingClass.subject_id,
          teacher: teachingClass.teacher_id,
          total_sessions: teachingClass.total_sessions,
          max_absent_allowed: teachingClass.max_absent_allowed || 3,
        },
        attendance_stats: {
          total_sessions: totalSessions,
          present_count: presentCount,
          absent_count: absentCount,
          late_count: lateCount,
          excused_count: excusedCount,
          attendance_rate: Math.round(attendanceRate * 100) / 100,
          attendance_score: studentScore?.attendance_score || 10,
          is_failed_due_to_absent:
            studentScore?.is_failed_due_to_absent || false,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy điểm chuyên cần:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy điểm chuyên cần",
      error: error.message,
    });
  }
};
