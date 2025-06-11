const { Semester, TeachingClass } = require("../models/schemas");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Controller quản lý học kỳ
 */

// @desc    Lấy danh sách tất cả học kỳ
// @route   GET /api/semesters
// @access  Private
exports.getAllSemesters = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const year = req.query.year || "";
    const is_current = req.query.is_current;
    const sort = req.query.sort || "-start_date";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { academic_year: { $regex: search, $options: "i" } },
      ];
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (is_current !== undefined) {
      query.is_current = is_current === "true";
    }

    const sortOptions = {};
    if (sort) {
      if (sort.startsWith("-")) {
        sortOptions[sort.substring(1)] = -1;
      } else {
        sortOptions[sort] = 1;
      }
    } else {
      sortOptions.start_date = -1;
    }

    const total = await Semester.countDocuments(query);
    const semestersFromDB = await Semester.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sortOptions);

    const semesters = semestersFromDB.map((sem) => {
      const semObject = sem.toObject();
      semObject.calculated_status = calculateSemesterStatus(
        semObject.start_date,
        semObject.end_date
      );
      return semObject;
    });

    res.status(200).json({
      success: true,
      count: semesters.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: semesters,
    });
  } catch (error) {
    console.error("Error in getAllSemesters:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy học kỳ theo ID
// @route   GET /api/semesters/:id
// @access  Private
exports.getSemesterById = async (req, res) => {
  try {
    const semesterFromDB = await Semester.findById(req.params.id);

    if (!semesterFromDB) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ",
      });
    }

    const semester = semesterFromDB.toObject();
    semester.calculated_status = calculateSemesterStatus(
      semester.start_date,
      semester.end_date
    );

    res.status(200).json({
      success: true,
      data: semester,
    });
  } catch (error) {
    console.error("Error in getSemesterById:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy học kỳ hiện tại
// @route   GET /api/semesters/current
// @access  Private
exports.getCurrentSemester = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ is_current: true });

    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ hiện tại",
      });
    }

    res.status(200).json({
      success: true,
      data: currentSemester,
    });
  } catch (error) {
    console.error("Error in getCurrentSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tạo học kỳ mới
// @route   POST /api/semesters
// @access  Private (Admin)
exports.createSemester = async (req, res) => {
  try {
    const {
      name,
      start_date,
      end_date,
      year,
      semester_number,
      academic_year,
      registration_start_date,
      registration_end_date,
    } = req.body;

    // Kiểm tra học kỳ đã tồn tại chưa
    const yearForCheck = year;
    const academicYearForCheck =
      academic_year || getAcademicYearByDate(end_date);

    const existingSemester = await Semester.findOne({
      name,
      year: yearForCheck,
      academic_year: academicYearForCheck,
      semester_number,
    });

    if (existingSemester) {
      return res.status(400).json({
        success: false,
        message:
          "Học kỳ này đã tồn tại trong năm học đã chọn với cùng tên, năm và số kỳ",
      });
    }

    // Thiết lập thời gian đăng ký mặc định nếu không có
    let regStartDate = registration_start_date;
    let regEndDate = registration_end_date;

    if (!regStartDate && start_date) {
      regStartDate = new Date(start_date);
      regStartDate.setDate(regStartDate.getDate() - 14);
    }

    if (!regEndDate && start_date) {
      regEndDate = new Date(start_date);
      regEndDate.setDate(regEndDate.getDate() + 7);
    }

    const currentStatusEnum = getSemesterStatusEnum(start_date, end_date);
    const newIsCurrent = currentStatusEnum === "ONGOING";

    const finalAcademicYear = academic_year || getAcademicYearByDate(end_date);

    const semester = await Semester.create({
      name,
      start_date,
      end_date,
      year,
      semester_number: semester_number || 1,
      academic_year: finalAcademicYear,
      is_current: newIsCurrent,
      registration_start_date: regStartDate,
      registration_end_date: regEndDate,
      status: currentStatusEnum,
    });

    if (newIsCurrent) {
      // Nếu học kỳ này là ONGOING, đặt tất cả các học kỳ khác thành is_current: false
      await Semester.updateMany(
        { _id: { $ne: semester._id } },
        { is_current: false }
      );
    }

    const createdSemesterObject = semester.toObject();
    createdSemesterObject.calculated_status = calculateSemesterStatus(
      createdSemesterObject.start_date,
      createdSemesterObject.end_date
    );
    // Đảm bảo is_current được phản ánh đúng trong object trả về
    createdSemesterObject.is_current = newIsCurrent;

    res.status(201).json({
      success: true,
      data: createdSemesterObject,
      message: "Tạo học kỳ thành công",
    });
  } catch (error) {
    console.error("Error in createSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Thêm hàm helper để tính toán năm học dựa vào ngày kết thúc
function getAcademicYearByDate(endDateStr) {
  if (!endDateStr) return null;

  const endDate = new Date(endDateStr);
  if (isNaN(endDate.getTime())) return null; // Kiểm tra ngày hợp lệ

  const endMonth = endDate.getMonth() + 1; // getMonth() trả về 0-11
  const endYear = endDate.getFullYear();

  // Quy tắc: Từ tháng 8/YYYY đến hết tháng 7/(YYYY+1) là thuộc năm học YYYY - YYYY+1
  if (endMonth >= 8) {
    // Nếu tháng kết thúc từ tháng 8 trở đi, năm học là YYYY-(YYYY+1)
    return `${endYear}-${endYear + 1}`;
  } else {
    // Nếu tháng kết thúc trước tháng 8 (tức là từ tháng 1 đến tháng 7), năm học là (YYYY-1)-YYYY
    return `${endYear - 1}-${endYear}`;
  }
}

// @desc    Cập nhật học kỳ
// @route   PUT /api/semesters/:id
// @access  Private (Admin)
exports.updateSemester = async (req, res) => {
  try {
    const {
      name,
      start_date,
      end_date,
      year,
      semester_number,
      registration_start_date,
      registration_end_date,
    } = req.body;
    const academic_year_from_request = req.body.academic_year;

    const semesterId = req.params.id;

    const existingSemesterData = await Semester.findById(semesterId);
    if (!existingSemesterData) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ",
      });
    }

    let finalAcademicYear;

    if (
      academic_year_from_request !== undefined &&
      academic_year_from_request !== null &&
      academic_year_from_request.trim() !== ""
    ) {
      finalAcademicYear = academic_year_from_request;
    } else if (req.body.hasOwnProperty("end_date")) {
      if (end_date === null || end_date === "") {
        finalAcademicYear = null;
      } else {
        finalAcademicYear = getAcademicYearByDate(end_date);
      }
    } else {
      finalAcademicYear = existingSemesterData.academic_year;
    }

    const checkName = name !== undefined ? name : existingSemesterData.name;
    const checkYear = year !== undefined ? year : existingSemesterData.year;
    const checkSemesterNumber =
      semester_number !== undefined
        ? semester_number
        : existingSemesterData.semester_number;
    const academicYearHasChanged =
      finalAcademicYear !== existingSemesterData.academic_year;
    const otherFieldsForConflictCheckChanged =
      (name !== undefined && name !== existingSemesterData.name) ||
      (year !== undefined && year !== existingSemesterData.year) ||
      (semester_number !== undefined &&
        semester_number !== existingSemesterData.semester_number);

    if (academicYearHasChanged || otherFieldsForConflictCheckChanged) {
      const conflictingSemester = await Semester.findOne({
        name: checkName,
        year: checkYear,
        academic_year: finalAcademicYear,
        semester_number: checkSemesterNumber,
        _id: { $ne: semesterId },
      });

      if (conflictingSemester) {
        return res.status(400).json({
          success: false,
          message: "Học kỳ này đã tồn tại với cùng tên, năm, năm học và số kỳ.",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (req.body.hasOwnProperty("end_date")) updateData.end_date = end_date;
    if (year !== undefined) updateData.year = year;
    if (semester_number !== undefined)
      updateData.semester_number = semester_number;

    if (
      academic_year_from_request !== undefined ||
      req.body.hasOwnProperty("end_date")
    ) {
      updateData.academic_year = finalAcademicYear;
    }

    if (registration_start_date !== undefined)
      updateData.registration_start_date = registration_start_date;
    if (registration_end_date !== undefined)
      updateData.registration_end_date = registration_end_date;

    const effectiveStartDate =
      updateData.start_date !== undefined
        ? updateData.start_date
        : existingSemesterData.start_date;
    const effectiveEndDate =
      updateData.end_date !== undefined
        ? updateData.end_date
        : existingSemesterData.end_date;

    if (
      updateData.start_date !== undefined ||
      updateData.end_date !== undefined
    ) {
      updateData.status = getSemesterStatusEnum(
        effectiveStartDate,
        effectiveEndDate
      );
      updateData.is_current = updateData.status === "ONGOING";
    }

    const updatedSemester = await Semester.findByIdAndUpdate(
      semesterId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedSemester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ sau khi cập nhật",
      });
    }

    if (updatedSemester.is_current) {
      await Semester.updateMany(
        { _id: { $ne: updatedSemester._id } },
        { is_current: false }
      );
    }

    const responseSemesterObject = updatedSemester.toObject();
    responseSemesterObject.calculated_status = calculateSemesterStatus(
      responseSemesterObject.start_date,
      responseSemesterObject.end_date
    );
    responseSemesterObject.is_current = updatedSemester.is_current;

    res.status(200).json({
      success: true,
      data: responseSemesterObject,
      message: "Cập nhật học kỳ thành công",
    });
  } catch (error) {
    console.error("Error in updateSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Xóa học kỳ
// @route   DELETE /api/semesters/:id
// @access  Private (Admin)
exports.deleteSemester = async (req, res) => {
  try {
    const semesterId = req.params.id;

    // Kiểm tra xem học kỳ có được sử dụng trong lớp giảng dạy không
    const usedInClass = await TeachingClass.findOne({
      semester_id: semesterId,
    });
    if (usedInClass) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa học kỳ này vì đang được sử dụng trong lớp giảng dạy",
      });
    }

    const semester = await Semester.findByIdAndDelete(semesterId);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy học kỳ",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa học kỳ thành công",
    });
  } catch (error) {
    console.error("Error in deleteSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy thống kê về học kỳ
// @route   GET /api/semesters/statistics
// @access  Private (Admin)
exports.getSemesterStatistics = async (req, res) => {
  try {
    const totalCount = await Semester.countDocuments();

    // Thống kê theo năm học
    const yearStats = await Semester.aggregate([
      {
        $group: {
          _id: "$year",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    // Thống kê số lớp học trong mỗi học kỳ
    const classesPerSemester = await TeachingClass.aggregate([
      {
        $group: {
          _id: "$semester_id",
          classCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "semesters",
          localField: "_id",
          foreignField: "_id",
          as: "semester",
        },
      },
      {
        $unwind: {
          path: "$semester",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          semesterName: "$semester.name",
          semesterYear: "$semester.year",
          classCount: 1,
        },
      },
      {
        $sort: { semesterYear: -1, semesterName: 1 },
      },
    ]);

    // Lấy học kỳ hiện tại
    const currentSemester = await Semester.findOne({ is_current: true });

    res.status(200).json({
      success: true,
      totalCount,
      yearStats,
      classesPerSemester,
      currentSemester,
    });
  } catch (error) {
    console.error("Error in getSemesterStatistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê học kỳ",
      error: error.message,
    });
  }
};

// @desc    Kiểm tra thời gian đăng ký môn học của kỳ hiện tại
// @route   GET /api/semesters/registration-status
// @access  Private
exports.getRegistrationStatus = async (req, res) => {
  try {
    // Lấy kỳ hiện tại
    const currentSemester = await Semester.findOne({ is_current: true });

    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kỳ học hiện tại",
      });
    }

    // Lấy ngày hiện tại
    const currentDate = new Date();

    // Sử dụng trường thời gian đăng ký trong schema nếu có
    // Nếu không có, sử dụng logic mặc định
    const registrationStartDate =
      currentSemester.registration_start_date ||
      (() => {
        const date = new Date(currentSemester.start_date);
        date.setDate(date.getDate() - 14);
        return date;
      })();

    const registrationEndDate =
      currentSemester.registration_end_date ||
      (() => {
        const date = new Date(currentSemester.start_date);
        date.setDate(date.getDate() + 7);
        return date;
      })();

    // Kiểm tra hiện tại có trong thời gian đăng ký không
    const isRegistrationOpen =
      currentDate >= registrationStartDate &&
      currentDate <= registrationEndDate;

    // Tính toán số ngày còn lại cho đăng ký
    let daysRemaining = 0;
    if (isRegistrationOpen) {
      const diffTime = Math.abs(registrationEndDate - currentDate);
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    res.status(200).json({
      success: true,
      data: {
        semester: {
          _id: currentSemester._id,
          name: currentSemester.name,
          start_date: currentSemester.start_date,
          end_date: currentSemester.end_date,
          academic_year: currentSemester.academic_year,
        },
        registration: {
          is_open: isRegistrationOpen,
          start_date: registrationStartDate,
          end_date: registrationEndDate,
          days_remaining: isRegistrationOpen ? daysRemaining : 0,
          status: isRegistrationOpen
            ? "open"
            : currentDate < registrationStartDate
            ? "upcoming"
            : "closed",
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi kiểm tra thời gian đăng ký môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra thời gian đăng ký môn học",
      error: error.message,
    });
  }
};

// Hàm helper tính toán trạng thái học kỳ
const calculateSemesterStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Đặt giờ của end về cuối ngày để so sánh chính xác
  end.setHours(23, 59, 59, 999);

  if (now < start) {
    return "Chưa bắt đầu";
  } else if (now >= start && now <= end) {
    return "Đang diễn ra";
  } else {
    return "Đã kết thúc";
  }
};

// Hàm helper mới để tính toán trạng thái enum của học kỳ
const getSemesterStatusEnum = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Đặt giờ của end về cuối ngày

  if (now < start) {
    return "SCHEDULED";
  } else if (now >= start && now <= end) {
    return "ONGOING";
  } else {
    return "ENDED";
  }
};

// @access  Private (Admin)
exports.setCurrentSemester = async (req, res) => {
  try {
    return res.status(400).json({
      success: false,
      message: "is_current được đặt tự động. API này không còn được sử dụng.",
    });
  } catch (error) {
    console.error("Error in setCurrentSemester:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};
