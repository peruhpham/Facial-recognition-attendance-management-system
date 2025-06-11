const { User, MainClass, Notification } = require("../models/schemas");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();
// Tạo token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Đăng nhập người dùng
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra email và password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email và mật khẩu",
      });
    }

    // Kiểm tra người dùng
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Kiểm tra trạng thái tài khoản (ngoại trừ admin)
    if (user.role !== "admin" && user.status !== "approved") {
      let message = "Tài khoản của bạn chưa được phê duyệt";
      if (user.status === "rejected") {
        message = "Tài khoản của bạn đã bị từ chối";
      }
      return res.status(403).json({
        success: false,
        message,
        status: user.status,
      });
    }

    // Cập nhật thời gian đăng nhập
    user.last_login = Date.now();
    await user.save();

    // Trả về token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        avatar_url: user.avatar_url,
        faceFeatures: user.faceFeatures,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Đăng ký người dùng
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      role,
      full_name,
      school_info,
      contact,
      faceFeatures,
    } = req.body;

    // Xác thực dữ liệu đầu vào
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp đầy đủ thông tin: email, mật khẩu và họ tên",
      });
    }

    // Xác thực vai trò, chỉ cho phép student hoặc teacher
    if (!role || !["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          "Vai trò không hợp lệ. Vui lòng chọn sinh viên, giảng viên hoặc admin",
      });
    }

    // --- Thêm validation chi tiết cho school_info ---
    if (!school_info || !school_info.department_id) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn khoa",
      });
    }

    if (role === "student") {
      if (!school_info.student_id) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập Mã số sinh viên (MSSV)",
        });
      }
      if (!school_info.class_id) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn lớp",
        });
      }
    } else if (role === "teacher") {
      if (!school_info.teacher_code) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập Mã giảng viên",
        });
      }
    }
    // --- Kết thúc validation ---

    // Kiểm tra người dùng đã tồn tại
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo người dùng mới
    const userData = {
      email,
      password: hashedPassword,
      role,
      full_name,
      status: role === "admin" ? "approved" : "pending", // Admin tự động phê duyệt
      created_at: Date.now(),
      last_login: Date.now(),
    };

    // Thêm contact nếu có
    if (contact) {
      userData.contact = {};
      if (contact.phone) {
        userData.contact.phone = contact.phone;
      }
      if (contact.address) {
        userData.contact.address = contact.address;
      }
    }

    // Thêm faceFeatures nếu có với validation mạnh hơn
    if (
      faceFeatures &&
      faceFeatures.descriptors &&
      faceFeatures.descriptors.length > 0
    ) {
      // Debug: Kiểm tra kiểu dữ liệu của descriptors
      console.log(
        "DEBUG REGISTER: faceFeatures.descriptors type:",
        typeof faceFeatures.descriptors
      );
      console.log(
        "DEBUG REGISTER: faceFeatures.descriptors length:",
        faceFeatures.descriptors.length
      );
      console.log(
        "DEBUG REGISTER: First descriptor sample:",
        faceFeatures.descriptors[0]
      );

      // Đảm bảo descriptors là array, không phải string
      let processedDescriptors = faceFeatures.descriptors;
      if (typeof faceFeatures.descriptors === "string") {
        console.log(
          "WARNING REGISTER: faceFeatures.descriptors is a string, trying to parse..."
        );
        try {
          processedDescriptors = JSON.parse(faceFeatures.descriptors);
        } catch (parseError) {
          console.error(
            "Failed to parse faceFeatures.descriptors string in register:",
            parseError
          );
          processedDescriptors = [];
        }
      }

      // Enhanced validation: Kiểm tra từng descriptor
      const validatedDescriptors = processedDescriptors.filter((descriptor) => {
        // Kiểm tra descriptor không null, undefined, và có đúng độ dài 128
        if (
          !descriptor ||
          !Array.isArray(descriptor) ||
          descriptor.length !== 128
        ) {
          console.warn(
            "REGISTER: Invalid descriptor detected (wrong length or null):",
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
            "REGISTER: Descriptor contains null/invalid values:",
            descriptor
          );
          return false;
        }

        return true;
      });

      if (validatedDescriptors.length > 0) {
        userData.faceFeatures = {
          descriptors: validatedDescriptors,
          lastUpdated: new Date(),
        };
        console.log(
          `Đăng ký thủ công: Đã nhận ${validatedDescriptors.length}/${processedDescriptors.length} dữ liệu khuôn mặt hợp lệ.`
        );
      } else {
        console.warn(
          "REGISTER: No valid face descriptors found, skipping face features"
        );
      }
    }

    // --- Xây dựng school_info có chọn lọc ---
    const schoolInfoData = {};

    if (role === "student") {
      // Đối với sinh viên, chỉ cần class_id và student_id (và year nếu có từ form)
      // major_id và department_id sẽ được suy ra từ class_id
      if (school_info.student_id) {
        schoolInfoData.student_id = school_info.student_id;
      }
      if (school_info.class_id) {
        schoolInfoData.class_id = school_info.class_id;
      }
      if (school_info.year) {
        // Nếu form đăng ký thủ công có gửi 'year'
        schoolInfoData.year = school_info.year;
      }
      // Xóa department_id nếu nó được gửi từ form cho student, vì nó sẽ được suy ra
      // schoolInfoData.department_id = undefined; // Hoặc không gán từ đầu
    } else if (role === "teacher") {
      // Đối với giảng viên, lưu department_id và teacher_code
      if (school_info.department_id) {
        schoolInfoData.department_id = school_info.department_id;
      }
      if (school_info.teacher_code) {
        schoolInfoData.teacher_code = school_info.teacher_code;
      }
    }
    // Gán school_info đã được xây dựng
    userData.school_info = schoolInfoData;
    // --- Kết thúc xây dựng school_info ---

    const user = await User.create(userData);

    if (user) {
      // Gửi thông báo
      if (role === "teacher") {
        // Gửi thông báo cho các Admin (hiện tại không set receiver_id cụ thể, Admin sẽ query theo type)
        try {
          await Notification.create({
            title: "Đăng ký tài khoản giảng viên mới",
            content: `Giảng viên ${full_name} (${email}) đã đăng ký và đang chờ phê duyệt.`,
            type: "USER_ACCOUNT",
            sender_id: user._id,
            // receiver_id: null, // Để trống nếu gửi cho nhóm Admin chung
            data: {
              userId: user._id,
              userName: full_name,
              userEmail: email,
              role_pending: "teacher",
            },
            link: "/admin/users?status=pending&role=teacher", // Admin có thể xem danh sách chờ duyệt
          });
        } catch (notifError) {
          console.error(
            "Lỗi khi tạo thông báo đăng ký giảng viên cho Admin:",
            notifError
          );
        }
      } else if (role === "student") {
        let assigned_advisor_id = null;
        if (schoolInfoData.class_id) {
          try {
            const mainClass = await MainClass.findById(schoolInfoData.class_id);
            if (mainClass) {
              assigned_advisor_id = mainClass.advisor_id;
              if (assigned_advisor_id) {
                user.advisor_id = assigned_advisor_id;
                await user.save();
              }
              if (!mainClass.pending_students) {
                mainClass.pending_students = [];
              }
              if (!mainClass.pending_students.includes(user._id)) {
                mainClass.pending_students.push(user._id);
                await mainClass.save();
                console.log(
                  `Added student ${user._id} to pending list of class ${mainClass._id}`
                );
              }
              if (assigned_advisor_id) {
                try {
                  await Notification.create({
                    title: "Sinh viên mới đăng ký vào lớp",
                    content: `Sinh viên ${full_name} (${email}) đã đăng ký vào lớp ${mainClass.name} (${mainClass.class_code}) mà bạn làm cố vấn, đang chờ phê duyệt.`,
                    type: "CLASS_ENROLLMENT",
                    sender_id: user._id,
                    receiver_id: assigned_advisor_id,
                    data: {
                      studentId: user._id,
                      studentName: full_name,
                      studentEmail: email,
                      mainClassId: mainClass._id,
                      mainClassName: mainClass.name,
                      mainClassCode: mainClass.class_code,
                      status: "pending_approval",
                    },
                    link: `/teacher/main-classes/${mainClass._id}/pending`, // GV cố vấn xem danh sách chờ của lớp
                  });
                } catch (notifError) {
                  console.error(
                    "Lỗi khi tạo thông báo đăng ký sinh viên cho GV Cố vấn:",
                    notifError
                  );
                }
              }
            }
          } catch (err) {
            console.error(
              "Lỗi khi xử lý lớp chính và cố vấn cho sinh viên đăng ký:",
              err
            );
          }
        }
      }

      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: {
          _id: user._id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          status: user.status,
          avatar_url: user.avatar_url,
          has_face_data: !!userData.faceFeatures,
        },
        message:
          user.status === "approved"
            ? "Đăng ký thành công!"
            : "Đăng ký thành công! Tài khoản của bạn đang chờ được phê duyệt.",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Dữ liệu người dùng không hợp lệ",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy thông tin người dùng hiện tại
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    // Lấy thông tin người dùng và chọn các trường cần thiết, bao gồm cả school_info
    const user = await User.findById(req.user.id)
      .select(
        "_id email full_name role status school_info contact faceFeatures avatar_url"
      )
      .lean(); // Sử dụng lean() để có plain JavaScript object

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Đăng nhập bằng Google
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = async (req, res) => {
  try {
    const { id, email, displayName, photos, isNewUser } = req.user;
    const FRONTEND_URL = process.env.FRONTEND_URL;

    // Kiểm tra nếu đây là người dùng mới
    if (isNewUser) {
      const googleId = id;
      const name = displayName;
      // Kiểm tra photos trước khi truy cập để tránh lỗi
      const avatar = photos && photos.length > 0 ? photos[0].value : "";
      return res.redirect(
        `${FRONTEND_URL}/login/success?needsRegistration=true&email=${email}&googleId=${googleId}&name=${encodeURIComponent(
          name
        )}&avatar=${encodeURIComponent(avatar || "")}`
      );
    }

    // Tìm user trong DB
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Nếu người dùng tồn tại, kiểm tra trạng thái
      if (existingUser.status === "pending") {
        // User đã đăng ký nhưng đang chờ phê duyệt
        const token = jwt.sign(
          { id: existingUser._id },
          process.env.JWT_SECRET,
          {
            expiresIn: "1d",
          }
        );
        return res.redirect(
          `${FRONTEND_URL}/login/success?token=${token}&status=pending&role=${existingUser.role}`
        );
      } else if (existingUser.status === "rejected") {
        // User đã bị từ chối
        return res.redirect(
          `${FRONTEND_URL}/login/success?status=rejected&role=${existingUser.role}`
        );
      } else if (existingUser.status === "approved") {
        // User đã được phê duyệt, đăng nhập thành công
        const token = jwt.sign(
          { id: existingUser._id },
          process.env.JWT_SECRET,
          {
            expiresIn: "1d",
          }
        );

        // Cập nhật googleId và avatar nếu cần
        // Kiểm tra photos trước khi truy cập
        const avatarUrl = photos && photos.length > 0 ? photos[0].value : "";
        if (
          !existingUser.google_id ||
          (avatarUrl && existingUser.avatar_url !== avatarUrl)
        ) {
          await User.findByIdAndUpdate(existingUser._id, {
            google_id: id,
            avatar_url: avatarUrl,
          });
        }

        return res.redirect(`${FRONTEND_URL}/login/success?token=${token}`);
      }
    } else {
      // Người dùng không tồn tại trong hệ thống, chuyển hướng đến trang đăng ký
      const googleId = id;
      const name = displayName;
      // Kiểm tra photos trước khi truy cập
      const avatar = photos && photos.length > 0 ? photos[0].value : "";
      return res.redirect(
        `${FRONTEND_URL}/login/success?needsRegistration=true&email=${email}&googleId=${googleId}&name=${encodeURIComponent(
          name
        )}&avatar=${encodeURIComponent(avatar || "")}`
      );
    }
  } catch (error) {
    console.error("Google callback error:", error);
    const FRONTEND_URL = process.env.FRONTEND_URL;
    return res.redirect(`${FRONTEND_URL}/login/error`);
  }
};

/**
 * Hoàn tất đăng ký cho người dùng đăng nhập qua Google
 * @route POST /api/auth/google-complete
 * @access Public
 */
exports.completeGoogleSignup = async (req, res) => {
  try {
    const {
      email,
      googleId,
      fullName,
      role,
      avatarUrl,
      school_info,
      contact,
      faceFeatures,
    } = req.body;

    // Kiểm tra thông tin
    if (!email || !googleId || !role) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại trong hệ thống",
      });
    }

    const userData = {
      email,
      google_id: googleId,
      full_name: fullName,
      role,
      avatar_url: avatarUrl,
      status: "pending",
      created_at: Date.now(),
      last_login: Date.now(),
    };

    if (school_info) {
      // Khởi tạo lại newSchoolInfo để tránh kế thừa các trường không mong muốn
      const newSchoolInfo = {};

      if (role === "teacher") {
        newSchoolInfo.teacher_code = school_info.teacher_code || undefined;
        newSchoolInfo.department_id = school_info.department_id || undefined;
      } else if (role === "student") {
        newSchoolInfo.student_id = school_info.student_id || undefined;
        newSchoolInfo.class_id = school_info.class_id || undefined;
        newSchoolInfo.year = school_info.year || undefined;
        // Không lưu major_id, department_id, class name trực tiếp vào User.school_info cho student
        // Chúng sẽ được suy ra từ class_id khi cần
      }
      userData.school_info = { ...userData.school_info, ...newSchoolInfo }; // Merge để giữ lại các trường khác có thể đã có
    }

    if (contact) {
      userData.contact = contact;
    }

    if (
      faceFeatures &&
      faceFeatures.descriptors &&
      faceFeatures.descriptors.length > 0
    ) {
      // Debug: Kiểm tra kiểu dữ liệu của descriptors
      console.log(
        "DEBUG: faceFeatures.descriptors type:",
        typeof faceFeatures.descriptors
      );
      console.log(
        "DEBUG: faceFeatures.descriptors length:",
        faceFeatures.descriptors.length
      );
      console.log(
        "DEBUG: faceFeatures.descriptors[0] type:",
        typeof faceFeatures.descriptors[0]
      );
      console.log(
        "DEBUG: faceFeatures.descriptors[0] sample:",
        faceFeatures.descriptors[0]
      );

      // Đảm bảo descriptors là array, không phải string
      let processedDescriptors = faceFeatures.descriptors;
      if (typeof faceFeatures.descriptors === "string") {
        console.log(
          "WARNING: faceFeatures.descriptors is a string, trying to parse..."
        );
        try {
          processedDescriptors = JSON.parse(faceFeatures.descriptors);
        } catch (parseError) {
          console.error(
            "Failed to parse faceFeatures.descriptors string:",
            parseError
          );
          processedDescriptors = [];
        }
      }

      userData.faceFeatures = {
        descriptors: processedDescriptors,
        lastUpdated: new Date(),
      };
      console.log(
        `Đã nhận ${processedDescriptors.length} dữ liệu khuôn mặt từ người dùng`
      );
    }

    let assigned_advisor_id = null;
    let mainClass = null;

    if (
      role === "student" &&
      userData.school_info &&
      userData.school_info.class_id
    ) {
      try {
        mainClass = await MainClass.findById(userData.school_info.class_id);
        if (mainClass && mainClass.advisor_id) {
          assigned_advisor_id = mainClass.advisor_id;
          userData.advisor_id = assigned_advisor_id;
        }
      } catch (classError) {
        console.error(
          "Lỗi khi tìm lớp hoặc cố vấn cho Google Signup:",
          classError
        );
      }
    }

    const newUser = await User.create(userData);

    if (role === "student" && mainClass) {
      try {
        if (!mainClass.pending_students) {
          mainClass.pending_students = [];
        }
        if (!mainClass.pending_students.includes(newUser._id)) {
          mainClass.pending_students.push(newUser._id);
          await mainClass.save();
          console.log(
            `Added student ${newUser._id} to pending list of class ${mainClass._id}`
          );
        }

        if (assigned_advisor_id) {
          try {
            await Notification.create({
              title: "Sinh viên mới đăng ký vào lớp (Google)",
              content: `Sinh viên ${newUser.full_name} (${newUser.email}) đã đăng ký vào lớp ${mainClass.name} (${mainClass.class_code}) mà bạn làm cố vấn (qua Google) và đang chờ phê duyệt.`,
              type: "CLASS_ENROLLMENT",
              sender_id: newUser._id,
              receiver_id: assigned_advisor_id,
              data: {
                studentId: newUser._id,
                studentName: newUser.full_name,
                studentEmail: newUser.email,
                mainClassId: mainClass._id,
                mainClassName: mainClass.name,
                mainClassCode: mainClass.class_code,
                signupMethod: "google",
                status: "pending_approval",
              },
              link: `/teacher/main-classes/${mainClass._id}/pending`, // GV cố vấn xem danh sách chờ của lớp
            });
          } catch (notifError) {
            console.error(
              "Không thể tạo thông báo (Google Signup) cho GV Cố vấn:",
              notifError
            );
          }
        }
      } catch (classError) {
        console.error(
          "Lỗi khi thêm sinh viên vào danh sách chờ duyệt (Google Signup):",
          classError
        );
      }
    }

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công, đang chờ phê duyệt",
      user: {
        _id: newUser._id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        status: newUser.status,
        avatar_url: newUser.avatar_url,
        has_face_data: !!userData.faceFeatures,
      },
      token,
    });
  } catch (error) {
    console.error("Complete Google Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// @desc    Phê duyệt người dùng
// @route   PUT /api/auth/approve/:id
// @access  Private (Admin/Teacher)
exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const approver = req.user;

    // Tìm người dùng cần phê duyệt
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Kiểm tra quyền phê duyệt
    if (user.role === "teacher" && approver.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền phê duyệt giảng viên",
      });
    }

    if (user.role === "student") {
      // Sinh viên chỉ có thể được phê duyệt bởi giáo viên cố vấn hoặc admin
      if (
        approver.role !== "admin" &&
        (!user.advisor_id ||
          user.advisor_id.toString() !== approver._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không phải là giáo viên cố vấn của sinh viên này",
        });
      }
    }

    // Cập nhật trạng thái
    user.status = "approved";
    user.approved_by = approver._id;
    user.approval_date = Date.now();

    await user.save();

    // Nếu là sinh viên và có class_id trong thông tin school_info, thêm vào lớp
    if (
      user.role === "student" &&
      user.school_info &&
      user.school_info.class_id
    ) {
      try {
        // Tìm lớp
        const mainClass = await MainClass.findById(user.school_info.class_id);
        if (mainClass) {
          // Kiểm tra xem sinh viên đã có trong danh sách chưa
          if (!mainClass.students.includes(user._id)) {
            // Thêm sinh viên vào danh sách
            mainClass.students.push(user._id);
            await mainClass.save();
            console.log(`Added student ${user._id} to class ${mainClass._id}`);
          }
        }
      } catch (classError) {
        console.error("Error adding student to class:", classError);
        // Không trả về lỗi, vẫn phê duyệt người dùng
      }
    }

    // Tạo thông báo cho người được phê duyệt
    try {
      await Notification.create({
        title: "Tài khoản của bạn đã được phê duyệt",
        content: `Tài khoản ${user.role} (${user.email}) của bạn đã được ${
          approver.role
        } ${approver.full_name || approver.email} phê duyệt.`,
        type: "USER_ACCOUNT",
        sender_id: approver._id,
        receiver_id: user._id,
        data: {
          approvedUserId: user._id,
          approvedUserRole: user.role,
          approverId: approver._id,
          approverName: approver.full_name || approver.email,
          approverRole: approver.role,
          status: "approved",
        },
        link:
          user.role === "student"
            ? "/student/dashboard"
            : user.role === "teacher"
            ? "/teacher/dashboard"
            : "/admin/dashboard", // Hoặc /profile
      });
    } catch (notifError) {
      console.error(
        "Lỗi khi tạo thông báo phê duyệt tài khoản cho người dùng:",
        notifError
      );
    }

    res.status(200).json({
      success: true,
      message: "Phê duyệt người dùng thành công",
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Từ chối người dùng
// @route   PUT /api/auth/reject/:id
// @access  Private (Admin/Teacher)
exports.rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const rejector = req.user;

    // Tìm người dùng cần từ chối
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Kiểm tra quyền từ chối
    if (user.role === "teacher" && rejector.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền từ chối giảng viên",
      });
    }

    if (user.role === "student") {
      // Sinh viên chỉ có thể bị từ chối bởi giáo viên cố vấn hoặc admin
      if (
        rejector.role !== "admin" &&
        (!user.advisor_id ||
          user.advisor_id.toString() !== rejector._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Bạn không phải là giáo viên cố vấn của sinh viên này",
        });
      }
    }

    // Cập nhật trạng thái
    user.status = "rejected";
    user.approved_by = rejector._id;
    user.approval_date = Date.now();

    await user.save();

    // Tạo thông báo cho người bị từ chối
    try {
      await Notification.create({
        title: "Tài khoản của bạn đã bị từ chối",
        content: `Tài khoản ${user.role} (${user.email}) của bạn đã bị ${
          rejector.role
        } ${
          rejector.full_name || rejector.email
        } từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`,
        type: "USER_ACCOUNT",
        sender_id: rejector._id,
        receiver_id: user._id,
        data: {
          rejectedUserId: user._id,
          rejectedUserRole: user.role,
          rejectorId: rejector._id,
          rejectorName: rejector.full_name || rejector.email,
          rejectorRole: rejector.role,
          status: "rejected",
        },
        // link: "/contact-support", // Hoặc một trang thông tin chung
      });
    } catch (notifError) {
      console.error(
        "Lỗi khi tạo thông báo từ chối tài khoản cho người dùng:",
        notifError
      );
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
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Lấy danh sách người dùng chờ phê duyệt
// @route   GET /api/auth/pending
// @access  Private (Admin/Teacher)
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

// @desc    Kiểm tra trạng thái người dùng theo email và Google ID
// @route   GET /api/auth/check-status
// @access  Public
exports.checkUserStatus = async (req, res) => {
  try {
    const { email, googleId } = req.query;

    if (!email && !googleId) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp email hoặc Google ID để kiểm tra",
      });
    }

    // Tạo query tìm kiếm
    const query = {};
    if (email) query.email = email;
    if (googleId) query.google_id = googleId;

    const user = await User.findOne(query).select(
      "_id email full_name role status avatar_url"
    );

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "Người dùng chưa đăng ký",
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        avatar_url: user.avatar_url,
      },
      message: `Tìm thấy người dùng với trạng thái: ${user.status}`,
    });
  } catch (error) {
    console.error("Check user status error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
    });
  }
};

// @desc    Quên mật khẩu
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Trả về thành công để tránh việc người khác dò email trong hệ thống
      return res.status(200).json({
        success: true,
        message:
          "Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được một liên kết đặt lại mật khẩu.",
      });
    }

    // Tạo token
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.reset_password_token = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.reset_password_expires = Date.now() + 10 * 60 * 1000; // 10 phút

    await user.save({ validateBeforeSave: false });

    // Gửi email
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password/${resetToken}`;

    const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào liên kết sau hoặc dán vào trình duyệt của bạn để hoàn tất quy trình:\n\n${resetUrl}\n\nLiên kết này sẽ hết hạn sau 10 phút.\n\nNếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Yêu cầu đặt lại mật khẩu",
        message,
      });

      res.status(200).json({ success: true, message: "Email đã được gửi." });
    } catch (err) {
      user.reset_password_token = undefined;
      user.reset_password_expires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: "Lỗi khi gửi email. Vui lòng thử lại sau.",
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// @desc    Đặt lại mật khẩu
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // 1) Lấy người dùng dựa trên token
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: Date.now() },
    });

    // 2) Nếu token không hợp lệ hoặc đã hết hạn
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn.",
      });
    }

    // 3) Đặt mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();

    // 4) Gửi lại token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
