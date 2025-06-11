const mongoose = require("mongoose");
const { Schema } = mongoose;

// -------------------- USERS --------------------
const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  google_id: { type: String },
  password: { type: String }, // nếu không dùng Google Login
  role: { type: String, enum: ["admin", "teacher", "student"], required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  approved_by: { type: Schema.Types.ObjectId, ref: "User" },
  approval_date: Date,
  advisor_id: { type: Schema.Types.ObjectId, ref: "User" }, // Giáo viên cố vấn cho sinh viên
  school_info: {
    department_id: { type: Schema.Types.ObjectId, ref: "Department" },
    teacher_code: String,
    student_id: String,
    class_id: { type: Schema.Types.ObjectId, ref: "MainClass" },
    year: Number,
  },
  full_name: { type: String, required: true },
  avatar_url: String,
  gender: { type: String, enum: ["male", "female", "other"] },
  dob: Date,
  contact: {
    phone: String,
    address: String,
  },
  faceFeatures: {
    descriptors: [[[Number]]], // Mảng 3D chứa các face descriptors
    lastUpdated: { type: Date, default: Date.now },
  },
  reset_password_token: String,
  reset_password_expires: Date,
  created_at: { type: Date, default: Date.now },
  last_login: Date,
});

// -------------------- DEPARTMENTS --------------------
const DepartmentSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: String,
  head_id: { type: Schema.Types.ObjectId, ref: "User" }, // Trưởng khoa
});

// -------------------- MAJORS --------------------
const MajorSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  department_id: {
    type: Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  description: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// -------------------- FACILITIES MANAGEMENT --------------------
// Schema Cơ sở (Campus)
const CampusSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  location: {
    latitude: Number,
    longitude: Number,
  },
  description: String,
  image_url: String,
  image_public_id: String,
  status: {
    type: String,
    enum: ["active", "inactive", "under_construction"],
    default: "active",
  },
  created_at: { type: Date, default: Date.now },
});

// Schema Tòa nhà (Building)
const BuildingSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  campus_id: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
  floors_count: { type: Number, default: 1 },
  year_built: Number,
  status: {
    type: String,
    enum: ["active", "maintenance", "inactive"],
    default: "active",
  },
  facilities: [String], // Thang máy, WC, WiFi...
  image_url: String,
  image_public_id: String,
  created_at: { type: Date, default: Date.now },
});

// Schema Phòng học (Room)
const RoomSchema = new Schema({
  room_number: { type: String, required: true },
  building_id: { type: Schema.Types.ObjectId, ref: "Building", required: true },
  floor: { type: Number, required: true },
  room_type: {
    type: String,
    enum: ["lecture", "lab", "meeting", "office"],
    required: true,
  },
  capacity: { type: Number, required: true },
  area: Number, // diện tích m²
  equipment: [
    {
      name: String, // Máy chiếu, Máy tính...
      quantity: Number,
      status: { type: String, enum: ["working", "broken", "maintenance"] },
    },
  ],
  status: {
    type: String,
    enum: ["available", "occupied", "maintenance"],
    default: "available",
  },
  image_url: String,
  image_public_id: String,
  created_at: { type: Date, default: Date.now },
});

// Schema Lịch sử dụng phòng (RoomSchedule)
const RoomScheduleSchema = new Schema({
  room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  teaching_class_id: { type: Schema.Types.ObjectId, ref: "TeachingClass" },
  event_name: String, // Nếu đặt phòng cho sự kiện không phải lớp học
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  day_of_week: { type: Number, required: true }, // 0 = Chủ nhật, 1 = Thứ 2,...
  repeat_type: {
    type: String,
    enum: ["once", "weekly", "monthly"],
    default: "weekly",
  },
  created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["scheduled", "ongoing", "completed", "cancelled"],
    default: "scheduled",
  },
  created_at: { type: Date, default: Date.now },
});

// -------------------- MAIN CLASSES --------------------
const MainClassSchema = new Schema({
  name: { type: String, required: true },
  class_code: { type: String, required: true, unique: true },
  major_id: { type: Schema.Types.ObjectId, ref: "Major", required: true },
  students: [{ type: Schema.Types.ObjectId, ref: "User" }],
  pending_students: [{ type: Schema.Types.ObjectId, ref: "User" }],
  advisor_id: { type: Schema.Types.ObjectId, ref: "User" },
  year_start: Number,
  year_end: Number,
  created_at: { type: Date, default: Date.now },
});

// -------------------- SEMESTERS --------------------
const SemesterSchema = new Schema({
  name: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  year: { type: Number, required: true },
  semester_number: { type: Number, enum: [1, 2, 3], default: 1 }, // 1: Học kỳ 1, 2: Học kỳ 2, 3: Học kỳ hè
  academic_year: { type: String, required: true }, // ví dụ: "2023-2024"
  is_current: { type: Boolean, default: false },
  registration_start_date: { type: Date },
  registration_end_date: { type: Date },
  status: {
    type: String,
    enum: ["SCHEDULED", "ONGOING", "ENDED"],
    default: "SCHEDULED",
  },
});

// -------------------- TEACHING CLASSES --------------------
const TeachingClassSchema = new Schema({
  class_name: { type: String, required: true },
  class_code: { type: String, required: true, unique: true },
  teacher_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  subject_id: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  main_class_id: { type: Schema.Types.ObjectId, ref: "MainClass" },
  students: [{ type: Schema.Types.ObjectId, ref: "User" }],
  total_sessions: { type: Number, required: true },
  semester_id: { type: Schema.Types.ObjectId, ref: "Semester", required: true },
  course_start_date: { type: Date },
  course_end_date: { type: Date },
  schedule: [
    {
      day_of_week: { type: Number, required: true },
      start_period: { type: Number, required: true },
      end_period: { type: Number, required: true },
      start_time: { type: String, required: true },
      end_time: { type: String, required: true },
      room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      is_recurring: { type: Boolean, default: true },
      specific_dates: [Date],
      excluded_dates: [Date],
    },
  ],
  auto_generate_sessions: { type: Boolean, default: true }, // Tự động tạo các buổi học dựa trên lịch
  max_absent_allowed: { type: Number, default: 3 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// -------------------- ATTENDANCE SESSIONS --------------------
const AttendanceSessionSchema = new Schema({
  teaching_class_id: {
    type: Schema.Types.ObjectId,
    ref: "TeachingClass",
    required: true,
  },
  session_number: { type: Number, required: true },
  date: { type: Date, required: true },
  room: { type: Schema.Types.ObjectId, ref: "Room" }, // Tham chiếu đến phòng học
  start_time: Date,
  end_time: Date,
  start_period: { type: Number }, // Tiết bắt đầu
  end_period: { type: Number }, // Tiết kết thúc
  started_by: { type: Schema.Types.ObjectId, ref: "User" },
  students_present: [
    {
      student_id: { type: Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date, default: Date.now },
      check_type: { type: String, enum: ["auto", "manual"], default: "auto" },
    },
  ],
  students_absent: [{ type: Schema.Types.ObjectId, ref: "User" }],
  status: {
    type: String,
    enum: ["pending", "active", "completed"],
    default: "pending",
  },
  notes: String,
});

// -------------------- ATTENDANCE LOGS --------------------
const AttendanceLogSchema = new Schema({
  session_id: {
    type: Schema.Types.ObjectId,
    ref: "AttendanceSession",
    required: true,
  },
  student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["present", "absent", "late_present"],
    default: "absent",
  },
  absence_request_id: {
    type: Schema.Types.ObjectId,
    ref: "AbsenceRequest",
    default: null,
  },
  recognized: { type: Boolean, default: false },
  captured_face_image_local_url: String,
  captured_face_image_cloudinary_url: String,
  captured_face_image_cloudinary_public_id: String,
  recognized_confidence: Number,
  note: String,
  timestamp: { type: Date, default: Date.now },
});

// -------------------- STUDENT SCORES --------------------
const StudentScoreSchema = new Schema({
  student_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  teaching_class_id: {
    type: Schema.Types.ObjectId,
    ref: "TeachingClass",
    required: true,
  },
  total_sessions: { type: Number, default: 0 }, // Tổng số buổi đã hoàn thành của lớp
  absent_sessions: { type: Number, default: 0 }, // Số buổi vắng
  attendance_score: { type: Number, default: 10 }, // Điểm chuyên cần
  max_absent_allowed: { type: Number }, // Số buổi vắng tối đa cho phép (lấy từ TeachingClass)
  is_failed_due_to_absent: { type: Boolean, default: false }, // Trạng thái cấm thi
  last_updated: { type: Date, default: Date.now },
});

// Create unique index
StudentScoreSchema.index(
  { student_id: 1, teaching_class_id: 1 },
  { unique: true }
);

// -------------------- NOTIFICATIONS --------------------
const NotificationSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  sender_id: { type: Schema.Types.ObjectId, ref: "User" }, // Có thể là null nếu là thông báo hệ thống tự động
  receiver_id: { type: Schema.Types.ObjectId, ref: "User", index: true }, // Index để query nhanh
  type: {
    type: String,
    enum: [
      "USER_ACCOUNT", // Liên quan đến tài khoản người dùng (đăng ký, duyệt, khóa)
      "CLASS_ENROLLMENT", // Liên quan đến việc đăng ký/duyệt vào lớp (cả main class và teaching class)
      "SCHEDULE_UPDATE", // Cập nhật lịch học, lịch thi
      "GRADE_UPDATE", // Cập nhật điểm số
      "ATTENDANCE_ALERT", // Cảnh báo điểm danh, kết quả điểm danh
      "ABSENCE_REQUEST", // Liên quan đến đơn xin nghỉ phép
      "ABSENCE_REQUEST_RESULT",
      "GENERAL_ANNOUNCEMENT", // Thông báo chung
      "NEW_MESSAGE", // Nếu có hệ thống chat/nhắn tin
      "SYSTEM_NOTIFICATION", // Thông báo từ hệ thống (bảo trì, cập nhật)
      "OTHER", // Loại khác
    ],
    required: true,
    default: "OTHER",
  },
  data: { type: Schema.Types.Mixed }, // Để lưu trữ dữ liệu bổ sung, ví dụ: { classId: '...', className: '...', studentName: '...' }
  link: { type: String }, // URL hoặc client-side route để điều hướng khi nhấp vào
  is_read: { type: Boolean, default: false, index: true }, // Index để query nhanh
  created_at: { type: Date, default: Date.now, index: true }, // Index để query nhanh và sort
});

// Thêm index cho các trường hay được query
NotificationSchema.index({ receiver_id: 1, is_read: 1, created_at: -1 });
NotificationSchema.index({ receiver_id: 1, type: 1, created_at: -1 });

// -------------------- ABSENCE REQUESTS --------------------
const AbsenceRequestSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  session_id: {
    type: Schema.Types.ObjectId,
    ref: "AttendanceSession",
    required: true,
  },
  reason: { type: String, required: true },
  evidence_url: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewed_by: { type: Schema.Types.ObjectId, ref: "User" },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
});

// -------------------- SUBJECTS --------------------
const SubjectSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  credits: { type: Number, required: true, default: 3 },
  department_id: { type: Schema.Types.ObjectId, ref: "Department" },
  description: String,
  status: {
    type: String,
    enum: ["đang dạy", "ngừng dạy"],
    default: "đang dạy",
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Tạo và export models
const User = mongoose.model("User", UserSchema);
const Department = mongoose.model("Department", DepartmentSchema);
const Major = mongoose.model("Major", MajorSchema);
const Campus = mongoose.model("Campus", CampusSchema);
const Building = mongoose.model("Building", BuildingSchema);
const Room = mongoose.model("Room", RoomSchema);
const RoomSchedule = mongoose.model("RoomSchedule", RoomScheduleSchema);
const MainClass = mongoose.model("MainClass", MainClassSchema);
const Semester = mongoose.model("Semester", SemesterSchema);
const TeachingClass = mongoose.model("TeachingClass", TeachingClassSchema);
const AttendanceSession = mongoose.model(
  "AttendanceSession",
  AttendanceSessionSchema
);
const AttendanceLog = mongoose.model("AttendanceLog", AttendanceLogSchema);
const StudentScore = mongoose.model("StudentScore", StudentScoreSchema);
const Notification = mongoose.model("Notification", NotificationSchema);
const AbsenceRequest = mongoose.model("AbsenceRequest", AbsenceRequestSchema);
const Subject = mongoose.model("Subject", SubjectSchema);

module.exports = {
  User,
  Department,
  Major,
  Campus,
  Building,
  Room,
  RoomSchedule,
  MainClass,
  Semester,
  TeachingClass,
  AttendanceSession,
  AttendanceLog,
  StudentScore,
  Notification,
  AbsenceRequest,
  Subject,
};
