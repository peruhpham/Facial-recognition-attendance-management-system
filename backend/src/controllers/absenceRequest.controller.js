const {
  AbsenceRequest,
  AttendanceSession,
  AttendanceLog,
  User,
  Notification,
} = require("../models/schemas");
const cloudinary = require("../config/cloudinary.config"); // Thêm import cloudinary

// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes("res.cloudinary.com")) {
    return null;
  }
  try {
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/public_id.jpg
    const parts = url.split("/");
    const publicIdWithExtension = parts
      .slice(parts.indexOf("upload") + 2)
      .join("/");
    // Remove extension
    const publicId = publicIdWithExtension.substring(
      0,
      publicIdWithExtension.lastIndexOf(".")
    );
    return publicId;
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    return null;
  }
};

// @desc    Create a new absence request
// @route   POST /api/v1/absence-requests
// @access  Private (Student)
exports.createAbsenceRequest = async (req, res, next) => {
  try {
    const { session_id, reason } = req.body; // evidence_url sẽ lấy từ req.file_url
    const student_id = req.user.id;

    console.log("Inside createAbsenceRequest controller.");
    console.log("req.file_url from middleware:", req.file_url); // Log giá trị từ middleware
    console.log("req.body.evidence_url from form:", req.body.evidence_url); // Log giá trị từ field text (nếu có)

    // Lấy URL của file đã upload từ middleware (nếu có)
    // Ưu tiên req.file_url, nếu không có thì thử req.body.evidence_url (cho trường hợp gửi link)
    // Nếu cả hai đều không có, evidence_url_to_save sẽ là undefined
    let evidence_url_to_save = req.file_url;
    if (!evidence_url_to_save && req.body.evidence_url) {
      evidence_url_to_save = req.body.evidence_url;
    }
    console.log(
      "Final evidence_url_to_save before creating request:",
      evidence_url_to_save
    );

    if (!session_id || !reason) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp buổi học và lý do xin nghỉ.",
      });
    }

    const attendanceSession = await AttendanceSession.findById(
      session_id
    ).populate({
      path: "teaching_class_id",
      select: "students teacher_id class_name class_code",
    });

    if (!attendanceSession) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy buổi học với ID ${session_id}`,
      });
    }

    // Kiểm tra xem buổi học có đang ở trạng thái 'pending' không
    if (attendanceSession.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Chỉ có thể gửi đơn xin nghỉ cho các buổi học sắp diễn ra (trạng thái 'pending').",
      });
    }

    if (!attendanceSession.teaching_class_id) {
      return res.status(500).json({
        success: false,
        message: "Buổi học không liên kết với lớp học phần nào.",
      });
    }

    const isStudentInClass = attendanceSession.teaching_class_id.students.some(
      (sId) => sId.toString() === student_id
    );

    if (!isStudentInClass) {
      return res.status(403).json({
        success: false,
        message: "Sinh viên không thuộc lớp học của buổi học này.",
      });
    }

    const existingLogForPresence = await AttendanceLog.findOne({
      session_id,
      student_id,
      status: "present",
    });

    if (existingLogForPresence) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn đã được ghi nhận có mặt trong buổi học này. Không thể gửi đơn xin nghỉ.",
      });
    }

    const existingRequest = await AbsenceRequest.findOne({
      student_id,
      session_id,
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `Bạn đã gửi đơn xin nghỉ cho buổi học này. Trạng thái hiện tại: ${existingRequest.status}`,
      });
    }

    const absenceRequest = await AbsenceRequest.create({
      student_id,
      session_id,
      reason,
      evidence_url: evidence_url_to_save,
      status: "pending",
    });
    console.log("Created AbsenceRequest document:", absenceRequest); // Log document sau khi tạo

    let attendanceLog = await AttendanceLog.findOne({
      student_id,
      session_id,
    });

    if (attendanceLog) {
      // Nếu đã có log điểm danh (thường là 'absent' nếu sinh viên chưa điểm danh và buổi học đã qua)
      // Chỉ cần liên kết absence_request_id, không thay đổi status của AttendanceLog ở đây.
      // Status của AttendanceLog sẽ là 'absent' hoặc 'present' dựa trên việc điểm danh thực tế.
      if (!attendanceLog.absence_request_id) {
        // Chỉ cập nhật nếu chưa có đơn nào được liên kết
        attendanceLog.absence_request_id = absenceRequest._id;
        await attendanceLog.save();
      }
    }

    const teacherId = attendanceSession.teaching_class_id.teacher_id;
    if (teacherId) {
      const studentUser = await User.findById(student_id).select("full_name");
      const studentName = studentUser ? studentUser.full_name : "Một sinh viên";
      const className =
        attendanceSession.teaching_class_id.class_name ||
        attendanceSession.teaching_class_id.class_code ||
        "Lớp học";
      const sessionDate = new Date(attendanceSession.date).toLocaleDateString(
        "vi-VN"
      );

      try {
        await Notification.create({
          receiver_id: teacherId,
          title: "Yêu cầu xin nghỉ phép mới",
          content: `Sinh viên ${studentName} đã gửi yêu cầu xin nghỉ phép cho buổi học ngày ${sessionDate} (${className}).`,
          type: "ABSENCE_REQUEST",
          link: `/teacher/absence-requests/${absenceRequest._id}`,
          sender_id: student_id,
          data: {
            absence_request_id: absenceRequest._id,
            student_id: student_id,
            student_name: studentName,
            session_id: attendanceSession._id,
            session_date: attendanceSession.date,
            class_code: attendanceSession.teaching_class_id.class_code,
            class_name: attendanceSession.teaching_class_id.class_name,
          },
        });
      } catch (notificationError) {
        console.error(
          "Failed to create notification (non-blocking):",
          notificationError
        );
      }
    }

    res.status(201).json({
      success: true,
      data: absenceRequest,
      message: "Đã gửi đơn xin nghỉ phép thành công. Vui lòng chờ duyệt.",
    });
  } catch (error) {
    console.error("Create Absence Request Error:", error);
    // Trả về lỗi 500 chung chung, giống cách user.controller.js xử lý
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tạo đơn xin nghỉ.",
    });
    // Không gọi next(error) nếu bạn muốn xử lý lỗi hoàn toàn ở đây
  }
};

// @desc    Get all absence requests for the logged-in student
// @route   GET /api/v1/absence-requests/my
// @access  Private (Student)
exports.getMyAbsenceRequests = async (req, res, next) => {
  try {
    const student_id = req.user.id;

    const absenceRequests = await AbsenceRequest.find({ student_id })
      .populate({
        path: "session_id",
        select:
          "date start_time end_time teaching_class_id room start_period end_period shift",
        populate: {
          path: "teaching_class_id",
          select: "class_name class_code subject_id",
          populate: {
            path: "subject_id",
            select: "name code",
          },
        },
      })
      .populate({
        path: "session_id",
        populate: {
          path: "room",
          select: "room_number building_id",
          populate: {
            path: "building_id",
            select: "name code campus_id",
            populate: {
              path: "campus_id",
              select: "name code",
            },
          },
        },
      })
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: absenceRequests.length,
      data: absenceRequests,
    });
  } catch (error) {
    console.error("Get My Absence Requests Error:", error);
    // Trả về lỗi 500 chung chung
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách đơn xin nghỉ.",
    });
  }
};

// @desc    Get all absence requests (for admin/teacher)
// @route   GET /api/v1/absence-requests
// @access  Private (Admin, Teacher)
exports.getAllAbsenceRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status, // Filter by status: pending, approved, rejected
      teaching_class_id, // Filter by specific teaching class
      student_info, // Search by student name or student ID (từ school_info.student_id)
      sort_by = "created_at", // Sort field
      order = "desc", // Sort order: asc, desc
    } = req.query;

    const query = {};
    const userRole = req.user.role;
    const userId = req.user.id;

    if (status) {
      query.status = status;
    }

    // Populate options
    const populateOptions = [
      {
        path: "student_id",
        select: "full_name email avatar_url school_info",
        populate: { path: "school_info.class_id", select: "class_code name" },
      },
      {
        path: "session_id",
        select: "date start_time end_time teaching_class_id room",
        populate: [
          {
            path: "teaching_class_id",
            select: "class_name class_code teacher_id subject_id",
            populate: [
              { path: "teacher_id", select: "full_name email" },
              { path: "subject_id", select: "name code" },
            ],
          },
          {
            path: "room",
            select: "room_number",
          },
        ],
      },
      {
        path: "reviewed_by",
        select: "full_name email role",
      },
    ];

    // Xử lý query cho teaching_class_id
    if (teaching_class_id) {
      if (userRole === "teacher") {
        // Kiểm tra giáo viên có quyền truy cập lớp này không
        const taughtClass =
          await require("../models/schemas").TeachingClass.findOne({
            _id: teaching_class_id,
            teacher_id: userId,
          });
        if (!taughtClass) {
          // Nếu không có quyền hoặc lớp không tồn tại, trả về danh sách rỗng
          return res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            data: [],
          });
        }
      }
      // Lấy tất cả các session_id thuộc teaching_class_id này
      const sessionsInThisClass = await AttendanceSession.find({
        teaching_class_id: teaching_class_id,
      })
        .select("_id")
        .lean();

      const sessionIds = sessionsInThisClass.map((s) => s._id);
      if (sessionIds.length === 0) {
        // Nếu không có buổi học nào cho lớp này, trả về danh sách rỗng
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          data: [],
        });
      }
      query.session_id = { $in: sessionIds };
    } else if (userRole === "teacher") {
      // Giáo viên xem tất cả các đơn của các lớp mình dạy (không chỉ định teaching_class_id)
      const taughtClasses = await require("../models/schemas")
        .TeachingClass.find({ teacher_id: userId })
        .select("_id")
        .lean();
      const teacherTeachingClassIds = taughtClasses.map((tc) => tc._id);

      if (teacherTeachingClassIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          data: [],
        });
      }

      const sessionsForTeacher = await AttendanceSession.find({
        teaching_class_id: { $in: teacherTeachingClassIds },
      })
        .select("_id")
        .lean();

      const teacherSessionIds = sessionsForTeacher.map((s) => s._id);
      if (teacherSessionIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          data: [],
        });
      }
      query.session_id = { $in: teacherSessionIds };
    }
    // Nếu là admin và không có teaching_class_id, sẽ lấy tất cả (không thêm query.session_id)

    if (student_info) {
      const students = await User.find({
        $or: [
          { full_name: { $regex: student_info, $options: "i" } },
          { "school_info.student_id": { $regex: student_info, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();
      query.student_id = { $in: students.map((s) => s._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    if (sort_by && order) {
      sort[sort_by] = order === "asc" ? 1 : -1;
    }

    const absenceRequests = await AbsenceRequest.find(query)
      .populate(populateOptions)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalAbsenceRequests = await AbsenceRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: absenceRequests.length,
      total: totalAbsenceRequests,
      totalPages: Math.ceil(totalAbsenceRequests / parseInt(limit)),
      currentPage: parseInt(page),
      data: absenceRequests,
    });
  } catch (error) {
    console.error("Get All Absence Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách đơn xin nghỉ.",
    });
  }
};

// @desc    Update status of an absence request (approve/reject)
// @route   PUT /api/v1/absence-requests/:id/status
// @access  Private (Admin, Teacher)
exports.updateAbsenceRequestStatus = async (req, res, next) => {
  try {
    const { status, reviewer_notes } = req.body; // status: "approved" or "rejected"
    const absenceRequestId = req.params.id;
    const reviewerId = req.user.id;
    const reviewerRole = req.user.role;

    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Trạng thái không hợp lệ. Chỉ chấp nhận 'approved' hoặc 'rejected'.",
      });
    }

    const absenceRequest = await AbsenceRequest.findById(absenceRequestId)
      .populate({
        path: "session_id",
        select: "teaching_class_id date",
        populate: {
          path: "teaching_class_id",
          select: "teacher_id students class_name class_code",
        },
      })
      .populate("student_id", "full_name email");

    if (!absenceRequest) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn xin nghỉ với ID ${absenceRequestId}`,
      });
    }

    if (absenceRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể duyệt hoặc từ chối đơn ở trạng thái 'pending'. Đơn này đang ở trạng thái '${absenceRequest.status}'.`,
      });
    }

    // Kiểm tra quyền của giáo viên: Chỉ được duyệt đơn của sinh viên trong lớp mình dạy
    if (reviewerRole === "teacher") {
      const teachingClass = absenceRequest.session_id.teaching_class_id;
      if (
        !teachingClass ||
        teachingClass.teacher_id.toString() !== reviewerId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn không có quyền duyệt đơn xin nghỉ này vì không phải là giáo viên của lớp học phần liên quan.",
        });
      }
    }
    // Admin có quyền duyệt tất cả

    absenceRequest.status = status;
    absenceRequest.reviewed_by = reviewerId;
    absenceRequest.updated_at = Date.now();
    if (reviewer_notes) {
      // Thêm một trường mới vào schema nếu muốn lưu reviewer_notes chính thức
      // Ví dụ: absenceRequest.reviewer_notes = reviewer_notes;
      // Tạm thời, có thể dùng trường notes có sẵn trong AttendanceLog hoặc gửi thông báo
    }

    await absenceRequest.save();

    // Cập nhật AttendanceLog tương ứng
    const attendanceLog = await AttendanceLog.findOne({
      student_id: absenceRequest.student_id._id,
      session_id: absenceRequest.session_id._id,
    });

    if (attendanceLog) {
      // Không thay đổi status của AttendanceLog ở đây.
      // Status của AttendanceLog (present/absent) được quyết định bởi việc điểm danh.
      // Việc đơn được approved/rejected sẽ được tham chiếu qua absenceRequest.status.
      // Chỉ cần đảm bảo absence_request_id được liên kết đúng.
      if (!attendanceLog.absence_request_id) {
        attendanceLog.absence_request_id = absenceRequest._id;
        await attendanceLog.save();
      } else if (
        attendanceLog.absence_request_id &&
        attendanceLog.absence_request_id.toString() !==
          absenceRequest._id.toString()
      ) {
        // Trường hợp hiếm: Log đã liên kết với một request khác? Cập nhật lại cho đúng.
        // Hoặc có thể báo lỗi/log lại tình huống này.
        console.warn(
          `AttendanceLog ${attendanceLog._id} was linked to a different absence request. Relinking to ${absenceRequest._id}`
        );
        attendanceLog.absence_request_id = absenceRequest._id;
        await attendanceLog.save();
      }
      // Nếu status của AttendanceLog là 'present', thì không có gì cần làm ở đây
      // vì sinh viên đã có mặt, việc duyệt đơn nghỉ không làm thay đổi trạng thái có mặt đó.
    } else {
      // Trường hợp đơn được duyệt/từ chối TRƯỚC KHI buổi học diễn ra và AttendanceLog được tạo.
      // Logic này sẽ được xử lý khi AttendanceSession bắt đầu và tạo AttendanceLog hàng loạt.
      // Khi đó, nó sẽ kiểm tra AbsenceRequest đã 'approved' hoặc 'rejected' để set status cho AttendanceLog.
      // Về cơ bản, việc save absenceRequest là đủ ở bước này cho trường hợp đó.
      console.log(
        `AttendanceLog not found for student ${absenceRequest.student_id._id} and session ${absenceRequest.session_id._id}. Will be handled at session start.`
      );
    }

    // Gửi thông báo cho sinh viên
    const studentUser = absenceRequest.student_id;
    const sessionInfo = absenceRequest.session_id;
    const teachingClassInfo = sessionInfo.teaching_class_id;

    let notificationContent = "";
    if (status === "approved") {
      notificationContent = `Đơn xin nghỉ phép của bạn cho buổi học ngày ${new Date(
        sessionInfo.date
      ).toLocaleDateString("vi-VN")} (${
        teachingClassInfo.class_name || teachingClassInfo.class_code
      }) đã được chấp thuận.`;
    } else {
      notificationContent = `Đơn xin nghỉ phép của bạn cho buổi học ngày ${new Date(
        sessionInfo.date
      ).toLocaleDateString("vi-VN")} (${
        teachingClassInfo.class_name || teachingClassInfo.class_code
      }) đã bị từ chối.`;
    }
    if (reviewer_notes) notificationContent += ` Ghi chú: ${reviewer_notes}`;

    try {
      await Notification.create({
        receiver_id: studentUser._id,
        title: `Kết quả duyệt đơn xin nghỉ phép: ${
          status === "approved" ? "Được chấp thuận" : "Bị từ chối"
        }`,
        content: notificationContent,
        type: "ABSENCE_REQUEST_RESULT",
        link: `/student/my-absence-requests/${absenceRequest._id}`,
        sender_id: reviewerId,
        data: {
          absence_request_id: absenceRequest._id,
          new_status: status,
          session_date: sessionInfo.date,
          class_name: teachingClassInfo.class_name,
          class_code: teachingClassInfo.class_code,
        },
      });
    } catch (notificationError) {
      console.error(
        "Failed to create notification for student (non-blocking):",
        notificationError
      );
    }

    res.status(200).json({
      success: true,
      data: absenceRequest,
      message: `Đã cập nhật trạng thái đơn xin nghỉ thành '${status}'.`,
    });
  } catch (error) {
    console.error("Update Absence Request Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật trạng thái đơn xin nghỉ.",
    });
  }
};

// @desc    Student cancels their own pending absence request
// @route   DELETE /api/v1/absence-requests/:id
// @access  Private (Student)
exports.cancelAbsenceRequest = async (req, res, next) => {
  try {
    const absenceRequestId = req.params.id;
    const studentId = req.user.id;

    const absenceRequest = await AbsenceRequest.findById(absenceRequestId);

    if (!absenceRequest) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn xin nghỉ với ID ${absenceRequestId}`,
      });
    }

    if (absenceRequest.student_id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn xin nghỉ này.",
      });
    }

    if (absenceRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể hủy đơn xin nghỉ ở trạng thái 'pending'. Đơn này đang ở trạng thái '${absenceRequest.status}'.`,
      });
    }

    const evidenceUrlToDelete = absenceRequest.evidence_url;

    const attendanceLog = await AttendanceLog.findOne({
      student_id: studentId,
      session_id: absenceRequest.session_id,
      absence_request_id: absenceRequestId,
    });

    if (attendanceLog) {
      attendanceLog.absence_request_id = null;
      await attendanceLog.save();
    }

    // Sử dụng deleteOne() là phương thức hiện đại hơn
    await AbsenceRequest.deleteOne({ _id: absenceRequestId });

    // Sau khi xóa request thành công, xóa file trên Cloudinary (nếu có)
    if (evidenceUrlToDelete) {
      const publicId = getPublicIdFromUrl(evidenceUrlToDelete);
      if (publicId) {
        console.log(
          `Attempting to delete evidence from Cloudinary upon request cancellation: ${publicId}`
        );
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Successfully deleted ${publicId} from Cloudinary.`);
        } catch (cloudinaryError) {
          console.error(
            `Failed to delete ${publicId} from Cloudinary (non-blocking):`,
            cloudinaryError
          );
          // Không chặn quá trình, chỉ log lại lỗi
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {},
      message: "Đã hủy đơn xin nghỉ phép thành công.",
    });
  } catch (error) {
    console.error("Cancel Absence Request Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi hủy đơn xin nghỉ.",
    });
  }
};

// @desc    Student updates their own pending absence request
// @route   PUT /api/v1/absence-requests/:id
// @access  Private (Student)
exports.updateMyAbsenceRequest = async (req, res, next) => {
  try {
    console.log("=== Starting updateMyAbsenceRequest ===");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Request file_url:", req.file_url);

    const absenceRequestId = req.params.id;
    const studentId = req.user.id;
    const { reason } = req.body;

    console.log("Looking for absence request with ID:", absenceRequestId);
    const absenceRequest = await AbsenceRequest.findById(absenceRequestId);
    console.log("Found absence request:", absenceRequest ? "Yes" : "No");

    if (!absenceRequest) {
      console.log("Absence request not found");
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn xin nghỉ với ID ${absenceRequestId}`,
      });
    }

    if (absenceRequest.student_id.toString() !== studentId) {
      console.log("Permission denied - student ID mismatch");
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa đơn xin nghỉ này.",
      });
    }

    if (absenceRequest.status !== "pending") {
      console.log("Invalid status - current status:", absenceRequest.status);
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể sửa đơn xin nghỉ ở trạng thái 'pending'. Đơn này đang ở trạng thái '${absenceRequest.status}'.`,
      });
    }

    // Kiểm tra xem có thay đổi gì không
    const isReasonChanged = reason && reason !== absenceRequest.reason;
    const isEvidenceChanged =
      req.file_url || req.body.evidence_url !== undefined;

    console.log("Changes detected:", {
      isReasonChanged,
      isEvidenceChanged,
      oldReason: absenceRequest.reason,
      newReason: reason,
      oldEvidenceUrl: absenceRequest.evidence_url,
      newEvidenceUrl: req.file_url || req.body.evidence_url,
    });

    if (!isReasonChanged && !isEvidenceChanged) {
      console.log("No changes detected");
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp thông tin cần cập nhật (lý do hoặc bằng chứng).",
      });
    }

    // Xử lý bằng chứng
    let newEvidenceUrl = absenceRequest.evidence_url;

    // Nếu có file mới được upload
    if (req.file_url) {
      console.log("New file uploaded, URL:", req.file_url);
      newEvidenceUrl = req.file_url;
    }
    // Nếu không có file mới nhưng có evidence_url trong body
    else if (req.body.evidence_url !== undefined) {
      console.log("Evidence URL changed in body:", req.body.evidence_url);
      newEvidenceUrl = req.body.evidence_url || null;
    }

    // Nếu bằng chứng thay đổi và có bằng chứng cũ, xóa file cũ trên Cloudinary
    if (isEvidenceChanged && absenceRequest.evidence_url) {
      const oldPublicId = getPublicIdFromUrl(absenceRequest.evidence_url);
      if (oldPublicId) {
        console.log(
          "Attempting to delete old evidence from Cloudinary:",
          oldPublicId
        );
        try {
          await cloudinary.uploader.destroy(oldPublicId);
          console.log("Successfully deleted old evidence from Cloudinary");
        } catch (cloudinaryError) {
          console.error(
            "Failed to delete old evidence from Cloudinary:",
            cloudinaryError
          );
        }
      }
    }

    // Cập nhật các trường
    if (isReasonChanged) {
      console.log("Updating reason");
      absenceRequest.reason = reason;
    }
    if (isEvidenceChanged) {
      console.log("Updating evidence URL");
      absenceRequest.evidence_url = newEvidenceUrl;
    }
    absenceRequest.updated_at = Date.now();

    console.log("Saving updated absence request...");
    await absenceRequest.save();
    console.log("Successfully saved absence request");

    res.status(200).json({
      success: true,
      data: absenceRequest,
      message: "Đã cập nhật đơn xin nghỉ phép thành công.",
    });
  } catch (error) {
    console.error("Update My Absence Request Error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật đơn xin nghỉ.",
    });
  }
};

// @desc    Get all absence requests for a specific session
// @route   GET /api/v1/absence-requests/session/:sessionId
// @access  Private (Teacher, Admin)
exports.getAbsenceRequestsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Kiểm tra session có tồn tại không
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy buổi học",
      });
    }

    // Lấy danh sách đơn xin nghỉ của buổi học
    const absenceRequests = await AbsenceRequest.find({ session_id: sessionId })
      .populate({
        path: "student_id",
        select: "full_name email school_info",
        populate: {
          path: "school_info",
          select: "student_id class_name major",
        },
      })
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: absenceRequests.length,
      data: absenceRequests,
    });
  } catch (error) {
    console.error("Get Absence Requests By Session Error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách đơn xin nghỉ theo buổi học",
    });
  }
};

// Thêm các hàm khác cho việc get, update status đơn ở đây
// Ví dụ:
// exports.getAbsenceRequests = asyncHandler(async (req, res, next) => { ... });
// exports.getAbsenceRequestById = asyncHandler(async (req, res, next) => { ... });
// exports.updateAbsenceRequestStatus = asyncHandler(async (req, res, next) => { ... });
