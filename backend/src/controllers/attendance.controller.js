const {
  AttendanceSession,
  AttendanceLog,
  TeachingClass,
  StudentScore,
  User,
} = require("../models/schemas");
const { deleteImageFromCloudinary } = require("../utils/cloudinary"); // Import hàm xóa ảnh

// @desc    Tạo phiên điểm danh mới
// @route   POST /api/attendance/sessions
// @access  Private (Chỉ giáo viên)
exports.createAttendanceSession = async (req, res) => {
  try {
    const { teaching_class_id, session_number, date, room } = req.body;

    // Tìm lớp học
    const teachingClass = await TeachingClass.findById(teaching_class_id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra xem người gửi request có phải giáo viên của lớp không
    if (
      teachingClass.teacher_id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải giáo viên của lớp này",
      });
    }

    // Kiểm tra session number
    if (session_number > teachingClass.total_sessions) {
      return res.status(400).json({
        success: false,
        message: "Số buổi vượt quá tổng số buổi học",
      });
    }

    // Kiểm tra xem đã tồn tại phiên điểm danh chưa
    const existingSession = await AttendanceSession.findOne({
      teaching_class_id,
      session_number,
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: "Phiên điểm danh đã tồn tại",
      });
    }

    // Tạo phiên điểm danh mới
    const attendanceSession = await AttendanceSession.create({
      teaching_class_id,
      session_number,
      date: date || new Date(),
      room,
      started_by: req.user.id,
      status: "active",
      start_time: new Date(),
      students_absent: [...teachingClass.students], // Ban đầu tất cả vắng mặt
      students_present: [],
    });

    res.status(201).json({
      success: true,
      data: attendanceSession,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy thông tin phiên điểm danh
// @route   GET /api/attendance/sessions/:id
// @access  Private
exports.getAttendanceSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id)
      .populate({
        path: "teaching_class_id",
        select: "class_name class_code subject_id teacher_id students",
        populate: [
          {
            path: "subject_id",
            select: "name code credits",
          },
          {
            path: "students",
            select: "full_name email school_info avatar_url",
          },
        ],
      })
      .populate({
        path: "students_present.student_id",
        select: "full_name student_id avatar_url school_info email",
      })
      .populate({
        path: "students_absent",
        select: "full_name student_id avatar_url school_info email",
      })
      .populate({
        path: "room",
        select: "room_number capacity building_id",
        populate: {
          path: "building_id",
          select: "name campus_id",
          populate: {
            path: "campus_id",
            select: "name",
          },
        },
      })
      .populate({
        path: "started_by",
        select: "full_name",
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    // Nếu phiên có trạng thái completed nhưng không có dữ liệu students_present hoặc students_absent
    // thì tính toán lại dựa trên danh sách lớp
    if (
      session.status === "completed" &&
      (!session.students_present || session.students_present.length === 0) &&
      (!session.students_absent || session.students_absent.length === 0)
    ) {
      // Lấy danh sách tất cả sinh viên trong lớp
      const allStudents = session.teaching_class_id.students || [];

      // Tạo danh sách students_present và students_absent (tạm thời coi mọi sinh viên là có mặt)
      const studentsPresent = allStudents.map((student) => ({
        student_id: student._id,
        timestamp: new Date(),
        check_type: "auto",
      }));

      const studentsAbsent = [];

      // Lưu lại các thay đổi
      await AttendanceSession.updateOne(
        { _id: session._id },
        {
          $set: {
            students_present: studentsPresent,
            students_absent: studentsAbsent,
          },
        }
      );

      // Lấy lại phiên sau khi cập nhật
      return res.status(200).json({
        success: true,
        data: {
          ...session.toObject(),
          students_present: studentsPresent.map((sp) => ({
            student_id: allStudents.find(
              (s) => s._id.toString() === sp.student_id.toString()
            ),
            timestamp: sp.timestamp,
            check_type: sp.check_type,
          })),
          students_absent: [],
        },
        message: "Dữ liệu đã được tính toán lại dựa trên danh sách lớp",
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Cập nhật phiên điểm danh
// @route   PUT /api/attendance/sessions/:id
// @access  Private (Chỉ giáo viên)
exports.updateAttendanceSession = async (req, res) => {
  try {
    const { status, notes, students_absent } = req.body;

    // Tìm phiên điểm danh
    const session = await AttendanceSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    // Xác minh quyền - chỉ giáo viên tạo hoặc admin có thể cập nhật
    const teachingClass = await TeachingClass.findById(
      session.teaching_class_id
    );

    if (
      teachingClass.teacher_id.toString() !== req.user.id &&
      session.started_by.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền cập nhật phiên điểm danh này",
      });
    }

    // Nếu có danh sách students_absent từ frontend, sử dụng nó trực tiếp
    if (students_absent && Array.isArray(students_absent)) {
      session.students_absent = students_absent;
    }

    // Cập nhật trạng thái
    if (status) {
      session.status = status;

      // Nếu hoàn thành và không có danh sách students_absent từ frontend,
      // tính toán lại dựa trên dữ liệu hiện tại
      if (status === "completed" && !students_absent) {
        const classWithStudents = await TeachingClass.findById(
          session.teaching_class_id
        )
          .select("students")
          .lean();

        if (classWithStudents && classWithStudents.students) {
          // Lấy danh sách ID sinh viên đã có mặt
          const presentStudentIds = session.students_present.map((p) =>
            p.student_id.toString()
          );

          // Tính toán sinh viên vắng mặt = tất cả sinh viên - sinh viên có mặt
          const absentStudents = classWithStudents.students.filter(
            (studentId) => !presentStudentIds.includes(studentId.toString())
          );

          // Cập nhật danh sách vắng mặt
          session.students_absent = absentStudents;
        }
      }
    }

    // Cập nhật ghi chú
    if (notes) {
      session.notes = notes;
    }

    await session.save();

    // Gọi cập nhật điểm SAU KHI LƯU, chỉ khi status là completed
    if (status === "completed") {
      try {
        if (typeof exports.updateAttendanceScores === "function") {
          await exports.updateAttendanceScores(
            session.teaching_class_id,
            session.toObject()
          );
        }
      } catch (scoreError) {
        console.error(
          `[updateAttendanceSession] Error calling updateAttendanceScores for class ${session.teaching_class_id}:`,
          scoreError
        );
        // Không nên trả lỗi cho client ở đây, chỉ log lại
      }
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách phiên điểm danh của lớp học
// @route   GET /api/attendance/teaching-class/:id/sessions
// @access  Private
exports.getClassAttendanceSessions = async (req, res) => {
  try {
    const teachingClassId = req.params.id;

    // Kiểm tra lớp học
    const teachingClass = await TeachingClass.findById(teachingClassId);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra quyền
    const isTeacher = teachingClass.teacher_id.toString() === req.user.id;
    const isStudent = teachingClass.students.includes(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem phiên điểm danh của lớp này",
      });
    }

    // Lấy danh sách phiên điểm danh
    const sessions = await AttendanceSession.find({
      teaching_class_id: teachingClassId,
    })
      .sort({ session_number: 1 })
      .populate({
        path: "started_by",
        select: "full_name",
      })
      .populate({
        path: "room",
        select: "room_number capacity building_id",
        populate: {
          path: "building_id",
          select: "name campus_id",
          populate: {
            path: "campus_id",
            select: "name",
          },
        },
      });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách điểm danh của một phiên
// @route   GET /api/attendance/logs/:sessionId
// @access  Private
exports.getAttendanceLogs = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const logs = await AttendanceLog.find({ session_id: sessionId })
      .populate({
        path: "student_id",
        select: "full_name school_info email",
      })
      .populate({
        path: "absence_request_id",
        select: "reason status created_at",
      })
      .sort({ timestamp: -1 });

    // Chuyển đổi dữ liệu để gộp thông tin đơn xin nghỉ phép vào student
    const formattedLogs = logs.map((log) => ({
      ...log.toObject(),
      student_id: {
        ...log.student_id.toObject(),
        absence_request: log.absence_request_id
          ? {
              reason: log.absence_request_id.reason,
              status: log.absence_request_id.status,
              created_at: log.absence_request_id.created_at,
            }
          : null,
      },
    }));

    res.status(200).json({
      success: true,
      data: formattedLogs,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách điểm danh",
      error: error.message,
    });
  }
};

// @desc    Kiểm tra log điểm danh của một sinh viên cụ thể trong session
// @route   GET /api/attendance/logs/:sessionId/student/:studentId
// @access  Private
exports.checkStudentAttendanceLog = async (req, res) => {
  try {
    const { sessionId, studentId } = req.params;

    // Tìm log điểm danh của sinh viên trong session này
    const attendanceLog = await AttendanceLog.findOne({
      session_id: sessionId,
      student_id: studentId,
    }).populate({
      path: "student_id",
      select: "full_name school_info email",
    });

    if (attendanceLog) {
      return res.status(200).json({
        success: true,
        data: attendanceLog,
        message: "Sinh viên đã có log điểm danh trong session này",
      });
    } else {
      return res.status(200).json({
        success: true,
        data: null,
        message: "Sinh viên chưa có log điểm danh trong session này",
      });
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra log điểm danh sinh viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kiểm tra log điểm danh sinh viên",
      error: error.message,
    });
  }
};

// @desc    Lấy lịch sử điểm danh của sinh viên (bao gồm cả vắng mặt)
// @route   GET /api/attendance/student/:studentId/logs
// @access  Private
exports.getStudentAttendanceLogs = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const teachingClassId = req.query.teaching_class;

    // Kiểm tra quyền
    const isStudent = req.user.id === studentId;
    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";

    if (!isStudent && !isAdmin && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem lịch sử điểm danh của sinh viên này",
      });
    }

    // Xác định các lớp học mà sinh viên này tham gia
    const studentClassesQuery = { students: studentId };
    if (teachingClassId) {
      studentClassesQuery._id = teachingClassId;
    }
    const studentClasses = await TeachingClass.find(studentClassesQuery).select(
      "_id"
    );
    const studentClassIds = studentClasses.map((cls) => cls._id);

    if (studentClassIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "Sinh viên không tham gia lớp học nào",
      });
    }

    // Tìm tất cả các phiên điểm danh đã hoàn thành của các lớp đó
    const completedSessions = await AttendanceSession.find({
      teaching_class_id: { $in: studentClassIds },
      status: "completed",
    })
      .populate({
        path: "teaching_class_id",
        select: "class_name class_code subject_id",
        populate: { path: "subject_id", select: "name code" },
      })
      .sort({ date: -1 }); // Sắp xếp theo ngày giảm dần

    // Lấy tất cả các log điểm danh liên quan của sinh viên
    const studentLogs = await AttendanceLog.find({
      student_id: studentId,
      session_id: { $in: completedSessions.map((s) => s._id) },
    });

    // Tạo map để dễ tra cứu log theo session_id
    const logMap = new Map();
    studentLogs.forEach((log) => logMap.set(log.session_id.toString(), log));

    // Tạo kết quả cuối cùng, bao gồm cả buổi vắng mặt
    const fullHistory = completedSessions.map((session) => {
      const log = logMap.get(session._id.toString());

      let status = "absent"; // Mặc định là vắng mặt
      let timestamp = session.date; // Sử dụng ngày của session làm timestamp mặc định cho buổi vắng
      let note = "-";
      let recognized = false;
      let captured_face_url = null;
      let recognized_confidence = null;

      if (log) {
        // Nếu tìm thấy log
        status = log.status;
        timestamp = log.timestamp;
        note = log.note || "-";
        recognized = log.recognized;
        captured_face_url = log.captured_face_url;
        recognized_confidence = log.recognized_confidence;
      }

      return {
        _id: log ? log._id : `${session._id}_absent_${studentId}`, // Tạo ID giả cho buổi vắng
        session_id: {
          _id: session._id,
          teaching_class_id: session.teaching_class_id,
          session_number: session.session_number,
          date: session.date,
          status: session.status, // Status của session (luôn là completed ở đây)
        },
        student_id: studentId, // Giữ studentId để biết của ai
        status: status, // Trạng thái điểm danh (present, absent, etc.)
        timestamp: timestamp, // Thời gian ghi nhận (log timestamp hoặc session date)
        note: note,
        recognized: recognized,
        captured_face_url: captured_face_url,
        recognized_confidence: recognized_confidence,
        // Thêm student_info nếu cần để hiển thị tên/avatar (tùy frontend)
        // student_info: { ... }
      };
    });

    res.status(200).json({
      success: true,
      count: fullHistory.length,
      data: fullHistory,
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử điểm danh đầy đủ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Lấy điểm chuyên cần của sinh viên
// @route   GET /api/attendance/student/:studentId/scores
// @access  Private
exports.getStudentScores = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Kiểm tra quyền
    const isStudent = req.user.id === studentId;
    const isAdmin = req.user.role === "admin";
    const isTeacher = req.user.role === "teacher";

    if (!isStudent && !isAdmin && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền xem điểm chuyên cần của sinh viên này",
      });
    }

    // *** THÊM: Cập nhật điểm chuyên cần trước khi lấy ***
    // Lấy danh sách các lớp mà sinh viên đang học
    const teachingClasses = await TeachingClass.find({
      students: studentId,
    }).select("_id");

    // Cập nhật điểm cho từng lớp
    for (const teachingClass of teachingClasses) {
      try {
        await exports.updateAttendanceScores(teachingClass._id);
      } catch (scoreError) {
        console.error(
          `[getStudentScores] Lỗi khi cập nhật điểm cho class ${teachingClass._id}:`,
          scoreError
        );
        // Tiếp tục với các lớp khác
      }
    }

    // Lấy danh sách điểm
    const scores = await StudentScore.find({ student_id: studentId })
      .populate({
        path: "teaching_class_id",
        select:
          "class_name class_code subject_id teacher_id total_sessions max_absent_allowed semester_id",
        populate: [
          {
            path: "subject_id",
            select: "name code credits",
          },
          {
            path: "teacher_id",
            select: "full_name email",
          },
          {
            path: "semester_id",
            select: "name year semester_number academic_year",
          },
        ],
      })
      // Populate thêm thông tin student_id để lấy tên, mã sinh viên
      .populate({
        path: "student_id",
        select: "full_name email school_info.student_id",
      })
      .sort({ last_updated: -1 })
      .lean(); // Sử dụng lean()

    // Thêm dữ liệu để hiển thị rõ ràng hơn
    const enhancedScores = scores.map((scoreObj) => {
      // scoreObj đã là plain object
      // Lấy các giá trị từ scoreObj
      const totalCompletedSessions = scoreObj.total_sessions || 0;
      const absentSessions = scoreObj.absent_sessions || 0;
      const attendanceScore = scoreObj.attendance_score ?? 10;
      const isFailedDueToAbsent = scoreObj.is_failed_due_to_absent || false;
      const maxAbsentAllowed =
        scoreObj.max_absent_allowed ||
        scoreObj.teaching_class_id?.max_absent_allowed ||
        3;
      const totalPlannedSessions =
        scoreObj.teaching_class_id?.total_sessions || 0;

      // Tính toán các giá trị phụ trợ
      const attendedSessions = totalCompletedSessions - absentSessions;
      const attendancePercentage =
        totalCompletedSessions > 0
          ? Math.round((attendedSessions / totalCompletedSessions) * 100)
          : 0;
      const courseProgress =
        totalPlannedSessions > 0
          ? Math.round((totalCompletedSessions / totalPlannedSessions) * 100)
          : 0;

      // Tạo công thức tính điểm
      const attendanceCalculation = `10 - (${absentSessions} vắng × 2) = ${attendanceScore}`;

      // Tạo trạng thái điểm danh
      const attendanceStatus = isFailedDueToAbsent
        ? `Cấm thi (vắng ${absentSessions}/${maxAbsentAllowed} buổi)`
        : "Đủ điều kiện dự thi";

      // Tạo đối tượng trả về
      return {
        _id: scoreObj._id,
        teaching_class_id: scoreObj.teaching_class_id?._id,
        student_id: scoreObj.student_id?._id,
        attendance_score: attendanceScore,
        total_sessions: totalCompletedSessions, // Tổng số buổi đã hoàn thành
        absent_sessions: absentSessions,
        attended_sessions: attendedSessions, // Số buổi có mặt
        max_absent_allowed: maxAbsentAllowed,
        is_failed_due_to_absent: isFailedDueToAbsent,
        last_updated: scoreObj.last_updated,
        // Dữ liệu đã populate và tính toán để hiển thị
        attendance_percentage: attendancePercentage,
        course_progress: courseProgress,
        attendance_calculation: attendanceCalculation, // Công thức tính điểm
        attendance_status: attendanceStatus, // Trạng thái (Cấm thi/Đủ điều kiện)
        class_info: scoreObj.teaching_class_id
          ? {
              _id: scoreObj.teaching_class_id._id,
              name: scoreObj.teaching_class_id.class_name,
              code: scoreObj.teaching_class_id.class_code,
              total_planned_sessions: totalPlannedSessions,
              subject: scoreObj.teaching_class_id.subject_id
                ? {
                    _id: scoreObj.teaching_class_id.subject_id._id,
                    name: scoreObj.teaching_class_id.subject_id.name,
                    code: scoreObj.teaching_class_id.subject_id.code,
                    credits: scoreObj.teaching_class_id.subject_id.credits,
                  }
                : null,
              teacher: scoreObj.teaching_class_id.teacher_id
                ? {
                    _id: scoreObj.teaching_class_id.teacher_id._id,
                    name: scoreObj.teaching_class_id.teacher_id.full_name,
                    email: scoreObj.teaching_class_id.teacher_id.email,
                  }
                : null,
              semester: scoreObj.teaching_class_id.semester_id
                ? {
                    _id: scoreObj.teaching_class_id.semester_id._id,
                    name: scoreObj.teaching_class_id.semester_id.name,
                    year: scoreObj.teaching_class_id.semester_id.year,
                    semester_number:
                      scoreObj.teaching_class_id.semester_id.semester_number,
                    academic_year:
                      scoreObj.teaching_class_id.semester_id.academic_year,
                  }
                : null,
            }
          : null,
        student_info: scoreObj.student_id
          ? {
              _id: scoreObj.student_id._id,
              full_name: scoreObj.student_id.full_name,
              student_id: scoreObj.student_id.school_info?.student_id,
              email: scoreObj.student_id.email,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: enhancedScores.length,
      data: enhancedScores,
    });
  } catch (error) {
    console.error("Lỗi khi lấy điểm chuyên cần:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tính toán lại điểm chuyên cần
// @route   POST /api/attendance/scores/calculate
// @access  Private (Chỉ giáo viên)
exports.calculateAttendanceScores = async (req, res) => {
  try {
    const { teaching_class_id } = req.body;

    // Validation đầu vào
    if (!teaching_class_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID lớp học",
      });
    }

    // Kiểm tra format ObjectId
    if (!teaching_class_id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "ID lớp học không hợp lệ",
      });
    }

    // Tìm lớp học
    const teachingClass = await TeachingClass.findById(teaching_class_id);

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra quyền
    if (
      teachingClass.teacher_id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền tính toán điểm chuyên cần cho lớp này",
      });
    }

    // Gọi hàm tính toán điểm với try-catch
    let updatedScores;
    try {
      updatedScores = await exports.updateAttendanceScores(teaching_class_id);
    } catch (calculateError) {
      console.error("Lỗi khi tính toán điểm chuyên cần:", calculateError);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi tính toán điểm chuyên cần",
        error: calculateError.message,
      });
    }

    res.status(200).json({
      success: true,
      count: updatedScores.length,
      data: updatedScores,
      message: `Đã cập nhật điểm chuyên cần cho ${updatedScores.length} sinh viên`,
    });
  } catch (error) {
    console.error("Lỗi trong calculateAttendanceScores:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Map để theo dõi các class đang được tính điểm, tránh race condition
const scoringInProgress = new Map();

// Hàm hỗ trợ tính toán điểm chuyên cần
exports.updateAttendanceScores = async (
  teachingClassId,
  justCompletedSessionObject = null
) => {
  const classIdStr = teachingClassId.toString();

  // Kiểm tra xem class này đang được tính điểm không
  if (scoringInProgress.has(classIdStr)) {
    console.log(
      `[updateAttendanceScores] Class ${classIdStr} đang được tính điểm, bỏ qua`
    );
    return [];
  }

  // Đánh dấu class này đang được tính điểm
  scoringInProgress.set(classIdStr, Date.now());

  try {
    // Lấy thông tin lớp học
    const teachingClass = await TeachingClass.findById(
      teachingClassId
    ).populate("subject_id", "name code");

    if (!teachingClass) {
      throw new Error("Không tìm thấy lớp học");
    }

    // Lấy tất cả phiên điểm danh đã hoàn thành từ DB
    let completedSessionsFromDB = await AttendanceSession.find({
      teaching_class_id: teachingClassId,
      status: "completed",
    }).lean();

    // Hợp nhất với session vừa hoàn thành nếu có và chưa tồn tại
    let allCompletedSessions = [...completedSessionsFromDB];
    if (justCompletedSessionObject && justCompletedSessionObject._id) {
      const existingIndex = allCompletedSessions.findIndex(
        (s) => s._id.toString() === justCompletedSessionObject._id.toString()
      );
      if (existingIndex === -1) {
        allCompletedSessions.push(
          JSON.parse(JSON.stringify(justCompletedSessionObject))
        );
      } else {
        allCompletedSessions[existingIndex] = JSON.parse(
          JSON.stringify(justCompletedSessionObject)
        );
      }
    }
    allCompletedSessions = Array.from(
      new Map(
        allCompletedSessions.map((item) => [item._id.toString(), item])
      ).values()
    );

    const completedSessionIds = allCompletedSessions.map((s) => s._id);

    // Lấy số lượng phiên điểm danh đã hoàn thành
    const totalCompletedSessions = allCompletedSessions.length;
    const totalPlannedSessions = teachingClass.total_sessions || 0;
    const maxAbsentAllowed = teachingClass.max_absent_allowed || 3;

    // Cập nhật điểm cho từng sinh viên
    const updatedScores = [];

    if (!teachingClass.students || teachingClass.students.length === 0) {
      return [];
    }

    // *** SỬA ĐỔI: CHỈ SỬ DỤNG ATTENDANCELOG LÀM NGUỒN CHÍNH THỐNG ***
    // Lấy tất cả logs của các sinh viên trong lớp cho các session đã hoàn thành
    console.log(
      `[updateAttendanceScores] Class ${classIdStr}: Tính điểm cho ${totalCompletedSessions} session hoàn thành`
    );
    console.log(
      `[updateAttendanceScores] Class ${classIdStr}: Session IDs:`,
      completedSessionIds.map((id) => id.toString())
    );

    const attendanceLogs = await AttendanceLog.aggregate([
      {
        $match: {
          student_id: { $in: teachingClass.students },
          session_id: { $in: completedSessionIds },
          status: "present",
        },
      },
      {
        $group: {
          _id: "$student_id",
          presentCount: { $sum: 1 },
        },
      },
    ]);

    console.log(
      `[updateAttendanceScores] Class ${classIdStr}: Tìm thấy ${attendanceLogs.length} sinh viên có attendance logs present`
    );

    // Tạo map để tra cứu nhanh
    const studentPresentMap = new Map();
    attendanceLogs.forEach((log) => {
      studentPresentMap.set(log._id.toString(), log.presentCount);
    });

    // Tính toán cho từng sinh viên
    for (const studentId of teachingClass.students) {
      try {
        // *** CHỈ ĐẾM TỪ ATTENDANCELOG - BỎ LOGIC KIỂM TRA students_present ***
        const present_count = studentPresentMap.get(studentId.toString()) || 0;

        // Tính số buổi vắng
        const absent_count = totalCompletedSessions - present_count;

        // Tính điểm chuyên cần với validation
        let attendanceScore = Math.max(0, 10 - absent_count * 2);

        // Kiểm tra có rớt vì vắng quá số buổi cho phép không
        const isFailedDueToAbsent = absent_count > maxAbsentAllowed;

        const scoreUpdateData = {
          total_sessions: totalCompletedSessions,
          absent_sessions: absent_count,
          attendance_score: attendanceScore,
          max_absent_allowed: maxAbsentAllowed,
          is_failed_due_to_absent: isFailedDueToAbsent,
          last_updated: Date.now(),
        };

        let studentScore = await StudentScore.findOneAndUpdate(
          { student_id: studentId, teaching_class_id: teachingClassId },
          { $set: scoreUpdateData },
          { new: true, upsert: true }
        );

        // Lấy thông tin user để trả về
        const user = await User.findById(
          studentId,
          "full_name email school_info.student_id"
        ).lean();

        // Tạo đối tượng trả về
        const attended_sessions = present_count;
        const enhancedScore = {
          ...studentScore.toObject(),
          student_info: user
            ? {
                full_name: user.full_name,
                student_id: user.school_info?.student_id,
                email: user.email,
              }
            : null,
          completed_sessions: totalCompletedSessions,
          total_planned_sessions: totalPlannedSessions,
          attended_sessions: attended_sessions,
          absent_sessions: absent_count,
          // Tỷ lệ tham gia
          attendance_percentage:
            totalCompletedSessions > 0
              ? Math.round((attended_sessions / totalCompletedSessions) * 100)
              : 0,
          // Tiến độ khóa học
          course_progress:
            totalPlannedSessions > 0
              ? Math.round(
                  (totalCompletedSessions / totalPlannedSessions) * 100
                )
              : 0,
        };

        updatedScores.push(enhancedScore);
      } catch (err) {
        console.error(`Lỗi khi cập nhật điểm cho sinh viên ${studentId}:`, err);
        // Tiếp tục với sinh viên tiếp theo
      }
    }

    return updatedScores;
  } catch (error) {
    console.error(
      `[updateAttendanceScores] Lỗi khi tính điểm cho class ${classIdStr}:`,
      error
    );
    throw error;
  } finally {
    // Xóa class khỏi map khi hoàn thành
    scoringInProgress.delete(classIdStr);
  }
};

/**
 * @desc    Lấy tất cả các phiên điểm danh với phân trang
 * @route   GET /api/attendance/sessions
 * @access  Private (Admin, Teacher)
 */
exports.getAllAttendanceSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    // Nếu người dùng là giáo viên, chỉ lấy các phiên do họ tạo
    if (req.user.role === "teacher") {
      query.created_by = req.user._id;
    }

    const sessions = await AttendanceSession.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "teaching_class_id",
        select: "class_name subject_id teacher_id",
        populate: [
          { path: "subject_id", select: "name code" },
          { path: "teacher_id", select: "full_name" },
        ],
      })
      .populate({
        path: "room",
        select: "room_number capacity building_id",
        populate: {
          path: "building_id",
          select: "name campus_id",
          populate: {
            path: "campus_id",
            select: "name",
          },
        },
      });

    const totalCount = await AttendanceSession.countDocuments(query);

    res.status(200).json({
      success: true,
      data: sessions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalCount,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách phiên điểm danh",
      error: error.message,
    });
  }
};

// @desc    Cập nhật trạng thái phiên điểm danh
// @route   PUT /api/attendance/sessions/:id/status
// @access  Private (Chỉ giáo viên)
exports.updateSessionStatus = async (req, res) => {
  try {
    const { status, students_absent } = req.body;

    if (!status || !["pending", "active", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái không hợp lệ. Trạng thái phải là 'pending', 'active', hoặc 'completed'",
      });
    }

    // Tìm phiên điểm danh
    const session = await AttendanceSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    // Xác minh quyền - chỉ giáo viên tạo hoặc admin có thể cập nhật
    const teachingClass = await TeachingClass.findById(
      session.teaching_class_id
    );

    if (
      !teachingClass ||
      (teachingClass.teacher_id.toString() !== req.user.id &&
        req.user.role !== "admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền cập nhật phiên điểm danh này",
      });
    }

    // Cập nhật trạng thái
    session.status = status;

    // Nếu bắt đầu, cập nhật thời gian bắt đầu
    if (status === "active" && !session.start_time) {
      session.start_time = new Date();
    }

    // Khi hoàn thành, xử lý danh sách vắng mặt NẾU KHÔNG được cung cấp từ frontend
    // và NÊN làm điều này TRƯỚC KHI gọi updateAttendanceScores
    if (status === "completed" && !students_absent) {
      // students_absent là từ req.body
      const classWithStudents = await TeachingClass.findById(
        session.teaching_class_id
      )
        .select("students")
        .lean();

      if (
        classWithStudents &&
        classWithStudents.students &&
        classWithStudents.students.length > 0
      ) {
        const presentStudentIds = session.students_present.map(
          (p) =>
            typeof p.student_id === "object"
              ? p.student_id.toString() // Nếu student_id là object (đã populate)
              : p.student_id.toString() // Nếu student_id là string ID
        );
        const absentStudents = classWithStudents.students.filter(
          (studentId) => !presentStudentIds.includes(studentId.toString())
        );
        session.students_absent = absentStudents;
      }
    }

    // Lưu session TRƯỚC KHI tính điểm
    await session.save();

    // Tự động cập nhật điểm chuyên cần SAU KHI session đã được lưu
    if (status === "completed") {
      // Đợi một chút để đảm bảo session đã được commit vào database
      setTimeout(async () => {
        try {
          if (typeof exports.updateAttendanceScores === "function") {
            await exports.updateAttendanceScores(
              session.teaching_class_id,
              session.toObject()
            );
            console.log(
              `[updateSessionStatus] Đã cập nhật điểm chuyên cần cho lớp ${session.teaching_class_id}`
            );
          }
        } catch (scoreError) {
          console.error(
            `[updateSessionStatus] Lỗi khi cập nhật điểm chuyên cần cho lớp ${session.teaching_class_id}:`,
            scoreError
          );
        }
      }, 500); // Đợi 500ms
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái phiên điểm danh thành ${status}`,
      data: session,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái phiên điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Tạo log điểm danh mới
// @route   POST /api/attendance/logs/:sessionId
// @access  Private (Chỉ giáo viên)
exports.createAttendanceLog = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      student_id,
      status = "present",
      note = "",
      recognized = false,
      captured_face_url = null,
      recognized_confidence = null,
    } = req.body;
    const absence_request_id_from_body = req.body.absence_request_id;

    // Kiểm tra phiên điểm danh
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    // Kiểm tra quyền - chỉ giáo viên của lớp hoặc admin có thể điểm danh
    const teachingClass = await TeachingClass.findById(
      session.teaching_class_id
    );
    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    if (
      teachingClass.teacher_id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền điểm danh cho lớp này",
      });
    }

    // Kiểm tra sinh viên có trong lớp không
    console.log(
      "[DEBUG createAttendanceLog] Student ID from req.body:",
      student_id
    );
    console.log(
      "[DEBUG createAttendanceLog] teachingClass.students:",
      teachingClass.students.map((s) => s.toString())
    );
    console.log(
      "[DEBUG createAttendanceLog] teachingClass ID:",
      teachingClass._id.toString()
    );
    console.log(
      "[DEBUG createAttendanceLog] Session ID from URL params:",
      sessionId
    ); // Log cả sessionId từ URL
    console.log(
      "[DEBUG createAttendanceLog] Session's teaching_class_id from DB:",
      session.teaching_class_id.toString()
    );

    if (!teachingClass.students.includes(student_id)) {
      return res.status(400).json({
        success: false,
        message: "Sinh viên không thuộc lớp này",
      });
    }

    // Đảm bảo status chỉ là "present" hoặc "absent"
    const validStatus = status === "absent" ? "absent" : "present";

    // Đảm bảo note là string
    const validNote = typeof note === "string" ? note : "";

    // Tìm hoặc tạo log điểm danh
    let attendanceLog = await AttendanceLog.findOne({
      session_id: sessionId,
      student_id: student_id,
    });

    // Kiểm tra duplicate nếu đang điểm danh present
    if (
      validStatus === "present" &&
      attendanceLog &&
      attendanceLog.status === "present"
    ) {
      return res.status(409).json({
        success: false,
        message: "Sinh viên đã được điểm danh có mặt trong phiên này",
        data: attendanceLog,
      });
    }

    let final_absence_request_id;

    // Ưu tiên absence_request_id từ frontend nếu được cung cấp
    if (absence_request_id_from_body !== undefined) {
      final_absence_request_id = absence_request_id_from_body;
    } else {
      // Nếu frontend không gửi, thì mới tự động tìm kiếm
      const existingRequest = await require("../models/schemas")
        .AbsenceRequest.findOne({
          student_id: student_id,
          session_id: sessionId,
        })
        .select("_id");

      if (existingRequest) {
        final_absence_request_id = existingRequest._id;
      } else {
        final_absence_request_id = null; // Hoặc undefined nếu muốn
      }
    }

    if (attendanceLog) {
      // Cập nhật log nếu đã tồn tại
      attendanceLog.status = validStatus;
      attendanceLog.note = validNote;
      attendanceLog.recognized = recognized;
      attendanceLog.captured_face_url = captured_face_url;
      attendanceLog.recognized_confidence = recognized_confidence;
      attendanceLog.absence_request_id = final_absence_request_id; // Sử dụng giá trị đã được quyết định
      attendanceLog.timestamp = new Date();
      await attendanceLog.save();
    } else {
      // Tạo log mới
      attendanceLog = await AttendanceLog.create({
        session_id: sessionId,
        student_id: student_id,
        status: validStatus,
        note: validNote,
        recognized: recognized,
        captured_face_url: captured_face_url,
        recognized_confidence: recognized_confidence,
        absence_request_id: final_absence_request_id, // Sử dụng giá trị đã được quyết định
        timestamp: new Date(),
      });
    }

    // Cập nhật danh sách students_present và students_absent trong session
    if (validStatus === "present") {
      // Thêm vào students_present nếu chưa có
      if (
        !session.students_present.some(
          (p) => p.student_id.toString() === student_id
        )
      ) {
        session.students_present.push({
          student_id: student_id,
          timestamp: new Date(),
          check_type: recognized ? "auto" : "manual",
        });
      }
      // Xóa khỏi students_absent nếu có
      session.students_absent = session.students_absent.filter(
        (id) => id.toString() !== student_id
      );
    } else {
      // Xóa khỏi students_present nếu có
      session.students_present = session.students_present.filter(
        (p) => p.student_id.toString() !== student_id
      );
      // Thêm vào students_absent nếu chưa có
      if (!session.students_absent.includes(student_id)) {
        session.students_absent.push(student_id);
      }
    }

    await session.save();

    // Populate thông tin sinh viên trước khi trả về
    await attendanceLog.populate({
      path: "student_id",
      select: "full_name school_info email",
    });

    res.status(200).json({
      success: true,
      data: attendanceLog,
    });
  } catch (error) {
    console.error("Lỗi khi tạo log điểm danh:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Xóa một log điểm danh cụ thể
// @route   DELETE /api/attendance/logs/:logId
// @access  Private (Chỉ giáo viên của lớp hoặc admin)
exports.deleteAttendanceLog = async (req, res) => {
  const { logId } = req.params;

  try {
    const logToDelete = await AttendanceLog.findById(logId);

    if (!logToDelete) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy log điểm danh.",
      });
    }

    const { student_id, session_id } = logToDelete;

    // Kiểm tra quyền: User phải là admin hoặc giáo viên của lớp gắn với session đó
    const relatedSessionForPermission = await AttendanceSession.findById(
      session_id
    ).populate("teaching_class_id");

    if (!relatedSessionForPermission) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy buổi học liên quan đến log này.",
      });
    }

    const teachingClassForPermission =
      relatedSessionForPermission.teaching_class_id;
    if (!teachingClassForPermission) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học liên quan đến buổi học này.",
      });
    }

    const isTeacherOfClass =
      teachingClassForPermission.teacher_id.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isTeacherOfClass && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa log điểm danh này.",
      });
    }

    // 1. Xóa ảnh trên Cloudinary nếu có
    if (logToDelete.captured_face_image_cloudinary_public_id) {
      try {
        console.log(
          `Đang xóa ảnh từ Cloudinary: ${logToDelete.captured_face_image_cloudinary_public_id}`
        );
        await deleteImageFromCloudinary(
          logToDelete.captured_face_image_cloudinary_public_id
        );
      } catch (cloudinaryError) {
        console.error(
          "Lỗi khi xóa ảnh từ Cloudinary, nhưng vẫn tiếp tục xóa log:",
          cloudinaryError
        );
        // Không chặn việc xóa log nếu xóa ảnh lỗi, nhưng cần ghi lại lỗi này
      }
    }

    // 2. Xóa AttendanceLog
    await AttendanceLog.findByIdAndDelete(logId);
    console.log(`Đã xóa AttendanceLog ID: ${logId}`);

    // 3. Cập nhật AttendanceSession
    const attendanceSession = await AttendanceSession.findById(session_id);
    if (!attendanceSession) {
      console.error(
        `Không tìm thấy AttendanceSession ID: ${session_id} sau khi xóa log. Dữ liệu có thể không nhất quán.`
      );
      return res.status(500).json({
        success: false,
        message: "Lỗi nghiêm trọng: Không tìm thấy session sau khi xóa log.",
      });
    }

    // Kiểm tra xem sinh viên có còn log "present" hoặc "late_present" nào khác trong session này không
    const remainingPresentLogsCount = await AttendanceLog.countDocuments({
      session_id: session_id,
      student_id: student_id,
      status: { $in: ["present", "late_present"] },
    });

    let sessionUpdated = false;

    if (remainingPresentLogsCount === 0) {
      // Nếu không còn log present nào, sinh viên này nên là absent
      const initialPresentCount = attendanceSession.students_present.length;
      attendanceSession.students_present =
        attendanceSession.students_present.filter(
          (entry) => entry.student_id.toString() !== student_id.toString()
        );
      if (attendanceSession.students_present.length !== initialPresentCount) {
        sessionUpdated = true;
      }

      const studentAlreadyAbsent = attendanceSession.students_absent.some(
        (absentStudentId) =>
          absentStudentId.toString() === student_id.toString()
      );
      if (!studentAlreadyAbsent) {
        attendanceSession.students_absent.push(student_id);
        sessionUpdated = true;
      }
      if (sessionUpdated) {
        console.log(
          `Sinh viên ${student_id} không còn log present nào trong session ${session_id}. Đã cập nhật session.`
        );
      }
    } else {
      // Nếu vẫn còn log present, đảm bảo sinh viên đó có trong students_present
      const studentIsCurrentlyPresentInSession =
        attendanceSession.students_present.some(
          (entry) => entry.student_id.toString() === student_id.toString()
        );
      if (!studentIsCurrentlyPresentInSession) {
        // Điều này có thể chỉ ra một sự không nhất quán trước đó, hoặc sinh viên đã bị chuyển sang absent
        // và giờ cần chuyển lại thành present vì vẫn còn log present khác.
        // Lấy một log present còn lại để có timestamp và check_type tham khảo (nếu cần thiết)
        const referenceLog = await AttendanceLog.findOne({
          session_id: session_id,
          student_id: student_id,
          status: { $in: ["present", "late_present"] },
        }).sort({ timestamp: -1 });

        attendanceSession.students_present.push({
          student_id: student_id,
          timestamp: referenceLog ? referenceLog.timestamp : new Date(),
          check_type: referenceLog
            ? referenceLog.recognized
              ? "auto"
              : "manual"
            : "auto",
        });
        // Và đảm bảo xóa khỏi absent nếu có
        attendanceSession.students_absent =
          attendanceSession.students_absent.filter(
            (absentStudentId) =>
              absentStudentId.toString() !== student_id.toString()
          );
        sessionUpdated = true;
        console.log(
          `Sinh viên ${student_id} vẫn còn log present khác trong session ${session_id}. Đã đảm bảo là present trong session.`
        );
      }
    }

    if (sessionUpdated) {
      await attendanceSession.save();
      console.log(`Đã cập nhật AttendanceSession ID: ${session_id}`);
    }

    res.status(200).json({
      success: true,
      message: "Log điểm danh đã được xóa thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi xóa log điểm danh:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi máy chủ khi xóa log điểm danh.",
    });
  }
};
