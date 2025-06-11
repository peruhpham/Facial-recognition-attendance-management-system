const {
  User,
  AttendanceSession,
  AttendanceLog,
  TeachingClass,
} = require("../models/schemas");
const {
  uploadBase64ToCloudinary,
  deleteImageFromCloudinary,
} = require("../utils/cloudinary");

// @desc    Lưu đặc trưng khuôn mặt
// @route   POST /api/face-recognition/save-features
// @access  Private
exports.saveFaceFeatures = async (req, res) => {
  try {
    const { userId, faceDescriptors } = req.body;

    if (!userId || !faceDescriptors || !Array.isArray(faceDescriptors)) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu đặc trưng khuôn mặt",
      });
    }

    // Enhanced validation for face descriptors
    console.log(
      "DEBUG SAVE_FEATURES: Received faceDescriptors:",
      faceDescriptors.length
    );
    console.log(
      "DEBUG SAVE_FEATURES: First descriptor sample:",
      faceDescriptors[0]
    );

    // Validate each descriptor
    const validatedDescriptors = faceDescriptors.filter((descriptor) => {
      // Kiểm tra descriptor không null, undefined, và có đúng độ dài 128
      if (
        !descriptor ||
        !Array.isArray(descriptor) ||
        descriptor.length !== 128
      ) {
        console.warn(
          "SAVE_FEATURES: Invalid descriptor detected (wrong length or null):",
          descriptor
        );
        return false;
      }

      // Kiểm tra tất cả values không phải null và là số
      const hasValidValues = descriptor.every(
        (val) =>
          val !== null &&
          val !== undefined &&
          typeof val === "number" &&
          !isNaN(val)
      );
      if (!hasValidValues) {
        console.warn(
          "SAVE_FEATURES: Descriptor contains null/invalid values:",
          descriptor
        );
        return false;
      }

      return true;
    });

    if (validatedDescriptors.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu khuôn mặt hợp lệ. Vui lòng thử lại.",
      });
    }

    if (validatedDescriptors.length < faceDescriptors.length) {
      console.warn(
        `SAVE_FEATURES: Only ${validatedDescriptors.length}/${faceDescriptors.length} descriptors are valid`
      );
    }

    // Tìm người dùng
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Cập nhật đặc trưng khuôn mặt với validated descriptors
    user.faceFeatures = {
      descriptors: validatedDescriptors,
      lastUpdated: Date.now(),
    };

    console.log(
      `SAVE_FEATURES: Saved ${validatedDescriptors.length} valid descriptors for user ${user.full_name}`
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: "Đã lưu đặc trưng khuôn mặt thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lưu đặc trưng khuôn mặt.",
    });
  }
};

// @desc    Lấy đặc trưng khuôn mặt của sinh viên trong một lớp
// @route   GET /api/face-recognition/class-features/:classId
// @access  Private (Chỉ giáo viên)
exports.getClassFaceFeatures = async (req, res) => {
  try {
    const { classId } = req.params;

    const teachingClass = await TeachingClass.findById(classId).populate({
      path: "students",
      select: "full_name school_info faceFeatures avatar_url",
    });

    if (!teachingClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    const studentsWithFaces = teachingClass.students
      .filter(
        (student) =>
          student.faceFeatures &&
          student.faceFeatures.descriptors &&
          student.faceFeatures.descriptors.length > 0
      )
      .map((student) => ({
        _id: student._id,
        full_name: student.full_name,
        student_id: student.school_info?.student_id,
        avatar_url: student.avatar_url,
        faceDescriptors: student.faceFeatures.descriptors,
      }));

    res.status(200).json({
      success: true,
      data: studentsWithFaces,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy đặc trưng khuôn mặt của lớp.",
    });
  }
};

// @desc    Xác nhận điểm danh bằng khuôn mặt
// @route   POST /api/face-recognition/verify-attendance
// @access  Private
exports.verifyAttendance = async (req, res) => {
  try {
    const { sessionId, studentId, faceDescriptor, confidence, imageBase64 } =
      req.body;

    if (!sessionId || !studentId || !faceDescriptor) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu dữ liệu điểm danh (sessionId, studentId, faceDescriptor).",
      });
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Phiên điểm danh hiện tại ${session.status}, không thể điểm danh. Chỉ chấp nhận khi phiên 'active'.`,
      });
    }

    const teachingClass = await TeachingClass.findById(
      session.teaching_class_id
    );
    if (!teachingClass || !teachingClass.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message:
          "Sinh viên không thuộc lớp học này hoặc lớp học không tồn tại.",
      });
    }

    let cloudinaryImageUrl = null;
    let cloudinaryImagePublicId = null;

    // Kiểm tra xem sinh viên đã có log present trong session này chưa
    let attendanceLog = await AttendanceLog.findOne({
      session_id: sessionId,
      student_id: studentId,
    });

    if (attendanceLog && attendanceLog.status === "present") {
      // Sinh viên đã được điểm danh present rồi
      return res.status(409).json({
        success: false,
        message: "Sinh viên đã được điểm danh có mặt trong phiên này",
        data: attendanceLog,
      });
    }

    if (imageBase64) {
      if (
        attendanceLog &&
        attendanceLog.captured_face_image_cloudinary_public_id
      ) {
        try {
          await deleteImageFromCloudinary(
            attendanceLog.captured_face_image_cloudinary_public_id
          );
        } catch (deleteError) {
          console.error(
            "verifyAttendance: Lỗi khi xóa ảnh cũ trên Cloudinary:",
            deleteError
          );
          // Tiếp tục thực hiện dù xóa lỗi, không chặn quy trình điểm danh
        }
      }

      const uploadResult = await uploadBase64ToCloudinary(
        imageBase64,
        "attendance_log_faces"
      );

      if (uploadResult && !uploadResult.error) {
        cloudinaryImageUrl = uploadResult.url;
        cloudinaryImagePublicId = uploadResult.public_id;
      } else {
        console.error(
          "verifyAttendance: Lỗi khi upload ảnh lên Cloudinary:",
          uploadResult?.error || "Unknown upload error"
        );
        // Không chặn nếu upload lỗi, nhưng sẽ không có ảnh.
        // Nếu ảnh là bắt buộc, cần response lỗi ở đây.
      }
    } else {
      // Nếu không có imageBase64 MỚI gửi lên (tức là không muốn cập nhật ảnh mới)
      // thì giữ lại thông tin ảnh Cloudinary CŨ nếu có.
      if (attendanceLog) {
        cloudinaryImageUrl = attendanceLog.captured_face_image_cloudinary_url;
        cloudinaryImagePublicId =
          attendanceLog.captured_face_image_cloudinary_public_id;
      }
      // Nếu không có ảnh mới VÀ cũng không có log cũ (tức là tạo mới mà không có ảnh),
      // thì cloudinaryImageUrl và cloudinaryImagePublicId vẫn là null, điều này là đúng.
    }

    const logData = {
      status: "present",
      recognized: true,
      recognized_confidence: confidence || 0,
      captured_face_image_cloudinary_url: cloudinaryImageUrl,
      captured_face_image_cloudinary_public_id: cloudinaryImagePublicId,
      captured_face_image_local_url: null, // Không còn sử dụng trường local này nữa
      timestamp: Date.now(),
      note: attendanceLog?.note || null, // Giữ lại note cũ nếu có khi cập nhật
    };

    if (attendanceLog) {
      // Cập nhật log đã tồn tại
      Object.assign(attendanceLog, logData);
      await attendanceLog.save();
    } else {
      // Tạo log mới
      attendanceLog = await AttendanceLog.create({
        session_id: sessionId,
        student_id: studentId,
        ...logData,
      });
    }

    // Cập nhật danh sách students_present và students_absent trong session
    // Logic này chạy cả khi tạo mới hay cập nhật log, miễn là sinh viên được ghi nhận "present"
    const studentAlreadyPresentInSession = session.students_present.some(
      (entry) => entry.student_id.toString() === studentId
    );

    if (!studentAlreadyPresentInSession) {
      session.students_present.push({
        student_id: studentId,
        timestamp: logData.timestamp, // Sử dụng timestamp của log hiện tại
        check_type: "auto",
      });
      session.students_absent = session.students_absent.filter(
        (id) => id.toString() !== studentId
      );
      await session.save();
    }

    // *** THÊM: Cập nhật điểm chuyên cần sau khi điểm danh tự động ***
    try {
      const attendanceController = require("./attendance.controller");
      if (typeof attendanceController.updateAttendanceScores === "function") {
        await attendanceController.updateAttendanceScores(
          session.teaching_class_id,
          null // Không truyền session object vì chưa completed
        );
        console.log(
          `[faceRecognitionAttendance] Đã cập nhật điểm chuyên cần cho class ${session.teaching_class_id}`
        );
      }
    } catch (scoreError) {
      console.error(
        `[faceRecognitionAttendance] Lỗi khi cập nhật điểm chuyên cần:`,
        scoreError
      );
      // Không trả lỗi cho client, chỉ log
    }

    res.status(200).json({
      success: true,
      message: "Điểm danh bằng khuôn mặt thành công",
      data: attendanceLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xác nhận điểm danh.",
    });
  }
};

// @desc    Điểm danh thủ công
// @route   POST /api/face-recognition/manual-attendance
// @access  Private (Chỉ giáo viên)
exports.manualAttendance = async (req, res) => {
  try {
    const {
      sessionId,
      studentId,
      status, // Trạng thái từ request (present, absent, late_present)
      note,
      absence_request_id, // Thêm để liên kết đơn xin nghỉ nếu có
    } = req.body;

    if (!sessionId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID phiên hoặc ID sinh viên cho điểm danh thủ công.",
      });
    }

    const validStatus = ["present", "absent", "late_present"].includes(status)
      ? status
      : "present";

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên điểm danh",
      });
    }

    if (session.status !== "active" && session.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: `Phiên điểm danh ${session.status}, không thể điểm danh thủ công. Chỉ chấp nhận khi 'active' hoặc 'completed'.`,
      });
    }
    // Kiểm tra sinh viên có trong lớp không
    const teachingClass = await TeachingClass.findById(
      session.teaching_class_id
    );
    if (!teachingClass || !teachingClass.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message:
          "Sinh viên không thuộc lớp học này hoặc lớp học không tồn tại.",
      });
    }

    let attendanceLog = await AttendanceLog.findOne({
      session_id: sessionId,
      student_id: studentId,
    });

    const logData = {
      status: validStatus,
      note: note || attendanceLog?.note || "", // Giữ note cũ nếu không có note mới
      recognized: false, // Điểm danh thủ công không qua nhận diện tự động
      // Nếu điểm danh thủ công mà muốn xóa ảnh cũ (nếu có) thì cần thêm logic xóa ở đây
      // Hiện tại, nếu điểm danh thủ công thì không đụng đến các trường ảnh.
      // captured_face_image_cloudinary_url: attendanceLog?.captured_face_image_cloudinary_url || null,
      // captured_face_image_cloudinary_public_id: attendanceLog?.captured_face_image_cloudinary_public_id || null,
      timestamp: Date.now(),
      absence_request_id:
        absence_request_id !== undefined
          ? absence_request_id
          : attendanceLog?.absence_request_id || null,
    };

    // Nếu điểm danh thủ công là "absent", và log cũ có ảnh Cloudinary, thì xóa ảnh đó đi.
    if (
      validStatus === "absent" &&
      attendanceLog &&
      attendanceLog.captured_face_image_cloudinary_public_id
    ) {
      try {
        await deleteImageFromCloudinary(
          attendanceLog.captured_face_image_cloudinary_public_id
        );
        logData.captured_face_image_cloudinary_url = null;
        logData.captured_face_image_cloudinary_public_id = null;
      } catch (deleteError) {
        // Tiếp tục dù xóa lỗi
      }
    } else if (attendanceLog) {
      // Nếu không phải absent và log cũ tồn tại, giữ lại ảnh cũ
      logData.captured_face_image_cloudinary_url =
        attendanceLog.captured_face_image_cloudinary_url;
      logData.captured_face_image_cloudinary_public_id =
        attendanceLog.captured_face_image_cloudinary_public_id;
    }

    if (attendanceLog) {
      Object.assign(attendanceLog, logData);
      await attendanceLog.save();
    } else {
      attendanceLog = await AttendanceLog.create({
        session_id: sessionId,
        student_id: studentId,
        ...logData,
      });
    }

    // Cập nhật danh sách students_present và students_absent trong session
    const studentIsNowPresent =
      validStatus === "present" || validStatus === "late_present";
    const studentAlreadyPresentInSession = session.students_present.some(
      (entry) => entry.student_id.toString() === studentId
    );

    if (studentIsNowPresent) {
      if (!studentAlreadyPresentInSession) {
        session.students_present.push({
          student_id: studentId,
          timestamp: logData.timestamp,
          check_type: "manual", // Điểm danh thủ công
        });
        session.students_absent = session.students_absent.filter(
          (id) => id.toString() !== studentId
        );
        await session.save();
      }
    } else {
      // Student is now absent
      if (studentAlreadyPresentInSession) {
        session.students_present = session.students_present.filter(
          (entry) => entry.student_id.toString() !== studentId
        );
        if (
          !session.students_absent
            .map((id) => id.toString())
            .includes(studentId)
        ) {
          session.students_absent.push(studentId);
        }
        await session.save();
      } else {
        // If student was already absent, and is marked absent again, ensure they are in absent list
        if (
          !session.students_absent
            .map((id) => id.toString())
            .includes(studentId)
        ) {
          session.students_absent.push(studentId);
          await session.save(); // Save if changed
        }
      }
    }

    // *** THÊM: Cập nhật điểm chuyên cần sau khi điểm danh thủ công ***
    try {
      const attendanceController = require("./attendance.controller");
      if (typeof attendanceController.updateAttendanceScores === "function") {
        await attendanceController.updateAttendanceScores(
          session.teaching_class_id,
          null // Không truyền session object vì chưa completed
        );
        console.log(
          `[manualAttendance] Đã cập nhật điểm chuyên cần cho class ${session.teaching_class_id}`
        );
      }
    } catch (scoreError) {
      console.error(
        `[manualAttendance] Lỗi khi cập nhật điểm chuyên cần:`,
        scoreError
      );
      // Không trả lỗi cho client, chỉ log
    }

    res.status(200).json({
      success: true,
      message: "Điểm danh thủ công thành công",
      data: attendanceLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi điểm danh thủ công.",
    });
  }
};
