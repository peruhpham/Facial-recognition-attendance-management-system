const {
  User,
  Major,
  Department,
  MainClass,
  Notification,
} = require("../models/schemas");
const mongoose = require("mongoose");

/**
 * @desc    Lấy tất cả người dùng
 * @route   GET /api/users
 * @access  Private (Admin)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role, status } = req.query;
    const query = {};

    // Tìm kiếm theo email hoặc họ tên
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo vai trò
    if (role) {
      query.role = role;
    }

    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }

    // Thực hiện phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select("-password")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("advisor_id", "full_name email")
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
      .populate("school_info.department_id", "name code");

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / parseInt(limit)),
      currentPage: parseInt(page),
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy người dùng theo ID
 * @route   GET /api/users/:id
 * @access  Private
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("advisor_id", "full_name email")
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
      .populate("school_info.department_id", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Cập nhật thông tin người dùng
 * @route   PUT /api/users/:id
 * @access  Private
 */
exports.updateUser = async (req, res) => {
  try {
    const { role, status, school_info, ...otherUpdateData } = req.body;
    const userId = req.params.id;
    const currentUser = req.user;

    // Kiểm tra xem người dùng hiện tại có phải là chủ tài khoản hoặc admin không
    if (userId !== currentUser.id && currentUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật thông tin người dùng này",
      });
    }

    // Chỉ admin mới được thay đổi role hoặc status trực tiếp qua API này
    const updates = { ...otherUpdateData };
    if (currentUser.role === "admin") {
      if (role) updates.role = role;
      if (status) updates.status = status;
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Xử lý cập nhật school_info một cách cẩn thận
    if (school_info) {
      const newSchoolInfo = { ...user.school_info }; // Lấy school_info hiện tại
      if (
        user.role === "student" ||
        (updates.role && updates.role === "student")
      ) {
        // Sinh viên có thể cập nhật class_id (ví dụ: chuyển lớp, cần quy trình phê duyệt riêng)
        // và các thông tin cá nhân như student_id (ít khi thay đổi), year.
        if (school_info.hasOwnProperty("student_id"))
          newSchoolInfo.student_id = school_info.student_id;
        if (school_info.hasOwnProperty("class_id"))
          newSchoolInfo.class_id = school_info.class_id;
        if (school_info.hasOwnProperty("year"))
          newSchoolInfo.year = school_info.year;
        // Không cho phép cập nhật major_id, department_id trực tiếp cho student qua đây
        // Xóa các trường không hợp lệ nếu client cố gửi
        delete newSchoolInfo.major_id;
        delete newSchoolInfo.class;
        delete newSchoolInfo.teacher_code;
      } else if (
        user.role === "teacher" ||
        (updates.role && updates.role === "teacher")
      ) {
        // Giảng viên có thể cập nhật teacher_code, department_id
        if (school_info.hasOwnProperty("teacher_code"))
          newSchoolInfo.teacher_code = school_info.teacher_code;
        if (school_info.hasOwnProperty("department_id"))
          newSchoolInfo.department_id = school_info.department_id;
        // Xóa các trường không hợp lệ nếu client cố gửi
        delete newSchoolInfo.student_id;
        delete newSchoolInfo.class_id;
        delete newSchoolInfo.major_id;
        delete newSchoolInfo.class;
        delete newSchoolInfo.year;
      }
      updates.school_info = newSchoolInfo;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates }, // Sử dụng updates đã được lọc
      { new: true, runValidators: true }
    )
      .select("-password")
      // Populate lại thông tin cần thiết sau khi cập nhật
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
      .populate("school_info.department_id", "name code");

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Cập nhật thông tin thành công",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Xóa người dùng
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Đã xóa người dùng thành công",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Phê duyệt người dùng
 * @route   PUT /api/users/:id/approve
 * @access  Private (Admin/Teacher)
 */
exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const approver = req.user;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Nếu người dùng đã được phê duyệt trước đó, không cần làm gì thêm
    if (user.status === "approved") {
      return res.status(200).json({
        success: true,
        message: "Người dùng này đã được phê duyệt trước đó.",
        user: {
          _id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          status: user.status,
          main_class_id: user.main_class_id,
        },
      });
    }

    // Route này giờ chỉ dành cho Admin
    if (approver.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này.",
      });
    }

    // Cập nhật trạng thái User
    user.status = "approved";
    user.approved_by = approver._id;
    user.approval_date = Date.now();

    if (
      user.role === "student" &&
      user.school_info &&
      user.school_info.class_id
    ) {
      const mainClassRegisteredId = user.school_info.class_id;
      const mainClass = await MainClass.findById(mainClassRegisteredId);

      if (mainClass) {
        const isStudentInPendingList = mainClass.pending_students
          .map((pId) => pId.toString())
          .includes(user._id.toString());

        if (isStudentInPendingList) {
          mainClass.pending_students = mainClass.pending_students.filter(
            (pendingStudentId) =>
              pendingStudentId.toString() !== user._id.toString()
          );
        }

        if (
          !mainClass.students
            .map((sId) => sId.toString())
            .includes(user._id.toString())
        ) {
          mainClass.students.push(user._id);
        }

        await mainClass.save();
        user.main_class_id = mainClass._id;

        try {
          await Notification.create({
            title: "Tài khoản và đăng ký lớp đã được Admin phê duyệt",
            content: `Admin ${
              approver.full_name || approver.email
            } đã phê duyệt tài khoản của bạn. Bạn đã được chính thức thêm vào lớp ${
              mainClass.name
            } (${mainClass.class_code}).`,
            type: "CLASS_ENROLLMENT",
            sender_id: approver._id,
            receiver_id: user._id,
            data: {
              studentId: user._id,
              studentName: user.full_name,
              mainClassId: mainClass._id,
              mainClassName: mainClass.name,
              mainClassCode: mainClass.class_code,
              adminApproverId: approver._id,
              adminApproverName: approver.full_name || approver.email,
              userStatus: "approved",
              classEnrollmentStatus: "approved",
            },
            link: `/student/classes/main/${mainClass._id}`,
          });
        } catch (notifError) {
          console.error(
            "Lỗi tạo thông báo (Admin duyệt SV vào lớp):",
            notifError
          );
        }
      } else {
        console.warn(
          `Admin duyệt sinh viên ${user.email} nhưng không tìm thấy MainClass với ID ${mainClassRegisteredId} từ school_info.class_id.`
        );
      }
    } else if (user.role === "teacher") {
      // Thông báo cho giảng viên khi tài khoản được Admin duyệt
      try {
        await Notification.create({
          title: "Tài khoản của bạn đã được Admin phê duyệt",
          content: `Admin ${
            approver.full_name || approver.email
          } đã phê duyệt tài khoản giảng viên của bạn.`,
          type: "USER_ACCOUNT",
          sender_id: approver._id,
          receiver_id: user._id,
          data: {
            userId: user._id,
            userRole: user.role,
            adminApproverId: approver._id,
            adminApproverName: approver.full_name || approver.email,
            userStatus: "approved",
          },
          link: "/teacher/dashboard",
        });
      } catch (notifError) {
        console.error("Lỗi tạo thông báo (Admin duyệt GV):", notifError);
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Phê duyệt người dùng thành công",
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        main_class_id: user.main_class_id,
      },
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi phê duyệt người dùng",
      error: error.message,
    });
  }
};

/**
 * @desc    Từ chối người dùng
 * @route   PUT /api/users/:id/reject
 * @access  Private (Admin/Teacher)
 */
exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const rejector = req.user;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Route này giờ chỉ dành cho Admin
    if (rejector.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này.",
      });
    }

    const previousStatus = user.status;
    user.status = "rejected";
    user.approved_by = rejector._id;
    user.approval_date = Date.now();

    // Nếu admin từ chối một sinh viên, xóa sinh viên đó khỏi danh sách chờ của lớp (nếu có)
    if (
      user.role === "student" &&
      user.school_info &&
      user.school_info.class_id
    ) {
      const mainClassRegisteredId = user.school_info.class_id;
      const mainClass = await MainClass.findById(mainClassRegisteredId);
      if (mainClass) {
        mainClass.pending_students = mainClass.pending_students.filter(
          (pendingStudentId) =>
            pendingStudentId.toString() !== user._id.toString()
        );
        // Không thêm vào mainClass.students khi bị reject
        // Cân nhắc gỡ user.main_class_id nếu đã từng được gán trước đó và giờ bị reject
        if (
          user.main_class_id &&
          user.main_class_id.toString() === mainClass._id.toString()
        ) {
          user.main_class_id = null;
        }
        await mainClass.save();
      }
    }
    // Nếu trước đó user đã là 'approved' và có main_class_id, giờ bị admin reject thì cần gỡ khỏi mainClass.students
    if (
      previousStatus === "approved" &&
      user.role === "student" &&
      user.main_class_id
    ) {
      const previousMainClass = await MainClass.findById(user.main_class_id);
      if (previousMainClass) {
        previousMainClass.students = previousMainClass.students.filter(
          (sId) => sId.toString() !== user._id.toString()
        );
        await previousMainClass.save();
        user.main_class_id = null; // Gỡ class khỏi user
      }
    }

    await user.save();

    // Tạo thông báo cho người dùng bị từ chối
    try {
      const reasonText = req.body.reason
        ? `Lý do: ${req.body.reason}.`
        : "Vui lòng liên hệ quản trị viên để biết thêm chi tiết.";
      await Notification.create({
        title: "Tài khoản của bạn đã bị Admin từ chối",
        content: `Admin ${
          rejector.full_name || rejector.email
        } đã từ chối tài khoản ${user.role} của bạn. ${reasonText}`,
        type: "USER_ACCOUNT",
        sender_id: rejector._id,
        receiver_id: user._id,
        data: {
          userId: user._id,
          userRole: user.role,
          adminRejectorId: rejector._id,
          adminRejectorName: rejector.full_name || rejector.email,
          reason: req.body.reason || null,
          userStatus: "rejected",
        },
        link: "/contact-support", // Hoặc trang profile nơi họ thấy trạng thái bị từ chối
      });
    } catch (notifError) {
      console.error("Lỗi tạo thông báo (Admin từ chối tài khoản):", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Từ chối người dùng thành công",
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Reject user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi từ chối người dùng",
      error: error.message,
    });
  }
};

/**
 * @desc    Cập nhật vai trò người dùng
 * @route   PUT /api/users/:id/role
 * @access  Private (Admin)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role || !["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật vai trò thành công",
      data: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách người dùng chờ phê duyệt
 * @route   GET /api/users/pending
 * @access  Private (Admin/Teacher)
 */
exports.getPendingUsers = async (req, res) => {
  try {
    const approver = req.user;
    let query = { status: "pending" };

    // Nếu là giáo viên, chỉ lấy những sinh viên có advisor_id là mình
    if (approver.role === "teacher") {
      query = {
        status: "pending",
        role: "student",
        advisor_id: approver._id,
      };
    }

    const pendingUsers = await User.find(query)
      .select("-password")
      .populate("advisor_id", "full_name email");

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers,
    });
  } catch (error) {
    console.error("Get pending users error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách giáo viên cố vấn
 * @route   GET /api/users/advisors
 * @access  Public
 */
exports.getAdvisors = async (req, res) => {
  try {
    const advisors = await User.find({
      role: "teacher",
      status: "approved",
    })
      .select("_id full_name email department")
      .sort({ full_name: 1 });

    res.status(200).json({
      success: true,
      count: advisors.length,
      data: advisors,
    });
  } catch (error) {
    console.error("Get advisors error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách giáo viên cho sinh viên đăng ký
 * @route   GET /api/users/teachers
 * @access  Public
 */
exports.getTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", department_id } = req.query;
    const query = { role: "teacher" };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
      ];
    }

    // Lưu ý: Giáo viên hiện tại không có liên kết trực tiếp với Major/Department trong UserSchema
    // Nếu cần lọc giáo viên theo khoa, cần một cơ chế khác, ví dụ:
    // - Giáo viên có thể thuộc một department_id trực tiếp trong UserSchema (cần thêm trường này)
    // - Hoặc dựa trên các lớp họ dạy thuộc khoa nào (phức tạp hơn)
    // Hiện tại, bộ lọc department_id này sẽ không hoạt động như mong đợi cho teacher
    // nếu không có trường department_id trong User schema cho teacher.

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const teachers = await User.find(query)
      .select("-password -refresh_token")
      .populate("school_info.department_id", "name code")
      .sort({ full_name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalTeachers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: teachers.length,
      total: totalTeachers,
      totalPages: Math.ceil(totalTeachers / parseInt(limit)),
      currentPage: parseInt(page),
      data: teachers,
    });
  } catch (error) {
    console.error("Error getting teachers:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách giáo viên.",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy thống kê người dùng theo vai trò
 * @route   GET /api/users/stats
 * @access  Private (Admin)
 */
exports.getUserStats = async (req, res) => {
  try {
    // Tổng số người dùng đã được phê duyệt
    const totalApprovedUsers = await User.countDocuments({
      status: "approved",
    });

    // Tổng số người dùng (bao gồm cả chưa phê duyệt)
    const totalUsers = await User.countDocuments();

    // Số giáo viên đã được phê duyệt
    const approvedTeachers = await User.countDocuments({
      role: "teacher",
      status: "approved",
    });

    // Tổng số giáo viên
    const teachers = await User.countDocuments({ role: "teacher" });

    // Số sinh viên đã được phê duyệt
    const approvedStudents = await User.countDocuments({
      role: "student",
      status: "approved",
    });

    // Tổng số sinh viên
    const students = await User.countDocuments({ role: "student" });

    // Giáo viên đang chờ phê duyệt
    const pendingTeachers = await User.countDocuments({
      role: "teacher",
      status: "pending",
    });

    // Sinh viên đang chờ phê duyệt
    const pendingStudents = await User.countDocuments({
      role: "student",
      status: "pending",
    });

    res.status(200).json({
      success: true,
      totalUsers, // Giữ lại để tương thích với code cũ
      totalApprovedUsers, // Thêm số liệu mới
      teachers,
      approvedTeachers,
      students,
      approvedStudents,
      pendingTeachers,
      pendingStudents,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thống kê người dùng",
    });
  }
};

/**
 * @desc    Sinh viên đăng ký vào lớp học
 * @route   POST /api/users/register-class
 * @access  Private (Student)
 */
exports.registerClass = async (req, res) => {
  try {
    const { mainClassId } = req.body;
    const userId = req.user.id;

    // Kiểm tra xem lớp học tồn tại không
    const mainClass = await MainClass.findById(mainClassId);
    if (!mainClass) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lớp học",
      });
    }

    // Kiểm tra xem sinh viên đã đăng ký vào lớp này chưa
    if (mainClass.students.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã được duyệt vào lớp này",
      });
    }

    // Kiểm tra xem sinh viên đã đăng ký chờ duyệt chưa
    if (
      mainClass.pending_students &&
      mainClass.pending_students.includes(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đăng ký vào lớp này và đang chờ duyệt",
      });
    }

    // Thêm sinh viên vào danh sách chờ duyệt
    if (!mainClass.pending_students) {
      mainClass.pending_students = [];
    }
    mainClass.pending_students.push(userId);
    await mainClass.save();

    // Tạo thông báo cho giáo viên cố vấn
    if (mainClass.advisor_id) {
      try {
        await Notification.create({
          title: "Sinh viên đăng ký vào lớp",
          content: `Sinh viên ${req.user.full_name} (${req.user.email}) đã đăng ký vào lớp ${mainClass.name} (${mainClass.class_code}) mà bạn làm cố vấn và đang chờ duyệt.`,
          type: "CLASS_ENROLLMENT",
          sender_id: userId, // ID của sinh viên thực hiện hành động
          receiver_id: mainClass.advisor_id,
          data: {
            studentId: userId,
            studentName: req.user.full_name,
            studentEmail: req.user.email,
            mainClassId: mainClassId,
            mainClassName: mainClass.name,
            mainClassCode: mainClass.class_code,
            status: "pending_approval",
          },
          link: `/teacher/main-classes/${mainClassId}/pending`, // Link đến trang chờ duyệt của lớp
        });
      } catch (notifError) {
        console.error(
          "Lỗi tạo thông báo (SV đăng ký lớp cho GV Cố vấn):",
          notifError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Đăng ký vào lớp thành công, vui lòng chờ duyệt",
    });
  } catch (error) {
    console.error("Error registering for class:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy danh sách giáo viên cố vấn cho người dùng chưa đăng nhập
 * @route   GET /api/users/advisors/public
 * @access  Public
 */
exports.getPublicAdvisors = async (req, res) => {
  try {
    const advisors = await User.find({
      role: "teacher",
      status: "approved",
    })
      .select("_id full_name email department")
      .sort({ full_name: 1 });

    res.status(200).json({
      success: true,
      count: advisors.length,
      data: advisors,
    });
  } catch (error) {
    console.error("Get public advisors error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy thông tin người dùng hiện tại
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("advisor_id", "full_name email")
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
      .populate("school_info.department_id", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user me error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

/**
 * @desc    Lấy danh sách người dùng để thêm vào lớp học
 * @route   GET /api/users/to-add-to-class
 * @access  Private
 */
exports.getUsersToAddToClass = async (req, res) => {
  try {
    const { role, search, excludeIds } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    } else {
      // Mặc định là tìm sinh viên nếu không có role
      query.role = "student";
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
      ];
      if (query.role === "student") {
        query.$or.push({
          "school_info.student_id": { $regex: search, $options: "i" },
        });
      }
    }

    if (excludeIds) {
      const idsToExclude = excludeIds
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idsToExclude.length > 0) {
        query._id = { $nin: idsToExclude };
      }
    }

    // Thêm populate cho school_info.major_id nếu là sinh viên
    let usersQuery = User.find(query).select(
      "full_name email role school_info.student_id avatar_url"
    );

    if (query.role === "student") {
      usersQuery = usersQuery.populate({
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
      });
    } else if (query.role === "teacher") {
      // Đối với giảng viên, nếu cần thông tin khoa, chúng ta populate department_id trực tiếp
      usersQuery = usersQuery.populate(
        "school_info.department_id",
        "name code"
      );
    }

    const users = await usersQuery.limit(20).sort({ full_name: 1 }); // Giới hạn kết quả để không quá tải

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error getting users to add to class:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách người dùng.",
      error: error.message,
    });
  }
};

/**
 * @desc    Kiểm tra xem một mã định danh (studentId, teacherCode, email) đã tồn tại chưa
 * @route   GET /api/users/check-identifier
 * @access  Public
 */
exports.checkIdentifier = async (req, res) => {
  try {
    const { type, value } = req.query;

    if (!type || !value || value.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số 'type' hoặc 'value', hoặc 'value' rỗng.",
      });
    }

    let query = {};
    let identifierName = "";

    if (type === "studentId") {
      query["school_info.student_id"] = value;
      identifierName = "Mã số sinh viên";
    } else if (type === "teacherCode") {
      query["school_info.teacher_code"] = value;
      identifierName = "Mã giảng viên";
    } else if (type === "email") {
      query["email"] = value;
      identifierName = "Email";
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Giá trị 'type' không hợp lệ. Chỉ chấp nhận 'studentId', 'teacherCode', hoặc 'email'.",
      });
    }

    const existingUser = await User.findOne(query);

    if (existingUser) {
      return res.status(200).json({
        // Trả về 200 OK ngay cả khi tồn tại
        exists: true,
        message: `${identifierName} '${value}' này đã được sử dụng.`,
      });
    } else {
      return res.status(200).json({
        exists: false,
        message: `${identifierName} '${value}' này có thể sử dụng.`,
      });
    }
  } catch (error) {
    console.error(
      `Error checking identifier type '${type}', value '${value}':`,
      error
    );
    res.status(500).json({
      success: false,
      message: `Lỗi máy chủ khi kiểm tra ${type}.`,
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers: exports.getAllUsers,
  getUserById: exports.getUserById,
  updateUser: exports.updateUser,
  deleteUser: exports.deleteUser,
  approveUser: exports.approveUser,
  rejectUser: exports.rejectUser,
  updateUserRole: exports.updateUserRole,
  getPendingUsers: exports.getPendingUsers,
  getAdvisors: exports.getAdvisors,
  getTeachers: exports.getTeachers,
  getUserStats: exports.getUserStats,
  registerClass: exports.registerClass,
  getPublicAdvisors: exports.getPublicAdvisors,
  getMe: exports.getMe,
  getUsersToAddToClass: exports.getUsersToAddToClass,
  checkIdentifier: exports.checkIdentifier,
};
