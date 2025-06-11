const {
  TeachingClass,
  User,
  Subject,
  Semester,
  StudentScore,
} = require("../models/schemas");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

/**
 * Controller quản lý đăng ký môn học
 */

// @desc    Lấy danh sách môn học có thể đăng ký trong kỳ hiện tại
// @route   GET /api/course-registration/available
// @access  Private (Student)
exports.getAvailableCourses = async (req, res) => {
  try {
    // Lấy kỳ học hiện tại
    const currentSemester = await Semester.findOne({ is_current: true });

    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kỳ học hiện tại",
      });
    }

    // Lấy danh sách lớp học được mở trong kỳ hiện tại
    const availableClasses = await TeachingClass.find({
      semester_id: currentSemester._id,
      // Có thể thêm điều kiện kiểm tra số lượng sinh viên đã đăng ký chưa đạt tối đa
    })
      .populate("subject_id", "name code credits")
      .populate("teacher_id", "full_name")
      .populate("main_class_id", "name class_code");

    res.status(200).json({
      success: true,
      count: availableClasses.length,
      data: availableClasses,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách môn học có thể đăng ký:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách môn học có thể đăng ký",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách môn học đã đăng ký của sinh viên
// @route   GET /api/course-registration/my-courses
// @access  Private (Student)
exports.getMyRegisteredCourses = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { semester_id } = req.query;

    const query = {
      students: studentId,
    };

    if (semester_id) {
      query.semester_id = semester_id;
    } else {
      // Mặc định lấy kỳ hiện tại
      const currentSemester = await Semester.findOne({ is_current: true });
      if (currentSemester) {
        query.semester_id = currentSemester._id;
      }
    }

    const registeredClasses = await TeachingClass.find(query)
      .populate("subject_id", "name code credits")
      .populate("teacher_id", "full_name")
      .populate("semester_id", "name academic_year");

    res.status(200).json({
      success: true,
      count: registeredClasses.length,
      data: registeredClasses,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách môn học đã đăng ký:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách môn học đã đăng ký",
      error: error.message,
    });
  }
};

// @desc    Đăng ký môn học
// @route   POST /api/course-registration/register
// @access  Private (Student)
exports.registerCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const studentId = req.user._id;
    const { class_ids } = req.body;

    if (!class_ids || !Array.isArray(class_ids) || class_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp danh sách ID lớp học cần đăng ký",
      });
    }

    // Kiểm tra người dùng có phải sinh viên không
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Chỉ sinh viên mới có thể đăng ký môn học",
      });
    }

    // Lấy kỳ học hiện tại
    const currentSemester = await Semester.findOne({ is_current: true });
    if (!currentSemester) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kỳ học hiện tại",
      });
    }

    // Kiểm tra và đăng ký từng lớp
    const registrationResults = [];
    const studentScoresToCreate = [];

    for (const classId of class_ids) {
      // Kiểm tra lớp học tồn tại và thuộc kỳ hiện tại
      const teachingClass = await TeachingClass.findOne({
        _id: classId,
        semester_id: currentSemester._id,
      });

      if (!teachingClass) {
        registrationResults.push({
          class_id: classId,
          success: false,
          message: "Lớp học không tồn tại hoặc không thuộc kỳ hiện tại",
        });
        continue;
      }

      // Kiểm tra sinh viên đã đăng ký lớp này chưa
      if (teachingClass.students.includes(studentId)) {
        registrationResults.push({
          class_id: classId,
          class_name: teachingClass.class_name,
          success: false,
          message: "Bạn đã đăng ký lớp học này rồi",
        });
        continue;
      }

      // Kiểm tra xung đột lịch học
      // (code kiểm tra xung đột lịch ở đây - phức tạp hơn)

      // Đăng ký sinh viên vào lớp
      teachingClass.students.push(studentId);
      await teachingClass.save({ session });

      // Tạo bản ghi điểm cho sinh viên
      studentScoresToCreate.push({
        student_id: studentId,
        teaching_class_id: teachingClass._id,
        total_sessions: teachingClass.total_sessions,
        absent_sessions: 0,
        attendance_score: 10,
        max_absent_allowed: teachingClass.max_absent_allowed || 3,
      });

      registrationResults.push({
        class_id: classId,
        class_name: teachingClass.class_name,
        subject: teachingClass.subject_id,
        success: true,
        message: "Đăng ký thành công",
      });
    }

    // Tạo bảng điểm cho sinh viên
    if (studentScoresToCreate.length > 0) {
      await StudentScore.insertMany(studentScoresToCreate, { session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Quá trình đăng ký môn học đã hoàn tất",
      results: registrationResults,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi đăng ký môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng ký môn học",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// @desc    Hủy đăng ký môn học
// @route   DELETE /api/course-registration/drop/:class_id
// @access  Private (Student)
exports.dropCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const studentId = req.user._id;
    const { class_id } = req.params;

    // Kiểm tra người dùng có phải sinh viên không
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Chỉ sinh viên mới có thể hủy đăng ký môn học",
      });
    }

    // Kiểm tra lớp học tồn tại
    const teachingClass = await TeachingClass.findById(class_id);
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra sinh viên đã đăng ký lớp này chưa
    if (!teachingClass.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa đăng ký lớp học này",
      });
    }

    // Kiểm tra thời gian hủy đăng ký còn hợp lệ không
    // (có thể thêm logic kiểm tra thời gian đăng ký ở đây)

    // Xóa sinh viên khỏi danh sách lớp
    teachingClass.students = teachingClass.students.filter(
      (id) => id.toString() !== studentId.toString()
    );
    await teachingClass.save({ session });

    // Xóa bản ghi điểm của sinh viên trong lớp này
    await StudentScore.findOneAndDelete(
      {
        student_id: studentId,
        teaching_class_id: class_id,
      },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Hủy đăng ký môn học thành công",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi khi hủy đăng ký môn học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi hủy đăng ký môn học",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// @desc    Lấy thông tin về thời khóa biểu của sinh viên
// @route   GET /api/course-registration/schedule
// @access  Private (Student)
exports.getMySchedule = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { semester_id } = req.query;

    let semesterId;
    if (semester_id) {
      semesterId = semester_id;
    } else {
      // Mặc định lấy kỳ hiện tại
      const currentSemester = await Semester.findOne({ is_current: true });
      if (!currentSemester) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy kỳ học hiện tại",
        });
      }
      semesterId = currentSemester._id;
    }

    // Lấy danh sách lớp học sinh viên đã đăng ký trong kỳ
    const registeredClasses = await TeachingClass.find({
      students: studentId,
      semester_id: semesterId,
    })
      .populate("subject_id", "name code credits")
      .populate("teacher_id", "full_name")
      .populate("semester_id", "name academic_year");

    // Tạo thời khóa biểu theo ngày trong tuần
    const weekSchedule = [[], [], [], [], [], [], []]; // 0 = Chủ nhật, 1-6 = Thứ 2 đến Thứ 7

    registeredClasses.forEach((cls) => {
      if (cls.schedule && cls.schedule.length > 0) {
        cls.schedule.forEach((scheduleItem) => {
          const dayIndex = scheduleItem.day_of_week;
          if (dayIndex >= 0 && dayIndex <= 6) {
            weekSchedule[dayIndex].push({
              class_id: cls._id,
              class_name: cls.class_name,
              subject: cls.subject_id,
              teacher: cls.teacher_id,
              room: cls.room,
              start_period: scheduleItem.start_period,
              end_period: scheduleItem.end_period,
              start_time: scheduleItem.start_time,
              end_time: scheduleItem.end_time,
            });
          }
        });
      }
    });

    // Sắp xếp các môn học trong mỗi ngày theo thời gian bắt đầu
    for (let i = 0; i < 7; i++) {
      weekSchedule[i].sort((a, b) => a.start_period - b.start_period);
    }

    res.status(200).json({
      success: true,
      data: {
        classes: registeredClasses,
        weekSchedule,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin thời khóa biểu:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin thời khóa biểu",
      error: error.message,
    });
  }
};
