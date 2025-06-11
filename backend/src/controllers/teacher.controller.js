const mongoose = require("mongoose");
const User = mongoose.model("User"); // Giả sử model được đăng ký với tên 'User'
const Department = mongoose.model("Department"); // Giả sử model Department

const getAllTeachers = async (req, res) => {
  try {
    // Tìm tất cả user có vai trò là 'teacher'
    // Lựa chọn các trường cần thiết: id, full_name, email, department_id, teacher_code
    const teachers = await User.find({ role: "teacher" })
      .populate({
        path: "school_info.department_id", // Ưu tiên populate department_id trực tiếp từ school_info
        select: "name code", // Chỉ lấy tên và mã khoa
      })
      // Giảng viên không nhất thiết phải có major_id, nên không populate major_id ở đây để lấy department nữa.
      // Nếu sau này bạn muốn hiển thị cả major của giảng viên (nếu có), bạn có thể thêm populate cho major_id.
      .select(
        "_id full_name email school_info.teacher_code school_info.department_id school_info.major_id contact.phone" // Thêm contact.phone
      )
      .lean(); // Sử dụng lean() để có plain JS objects

    // Map lại kết quả để có cấu trúc phẳng hơn và chuẩn hóa tên khoa
    const formattedTeachers = teachers.map((teacher) => ({
      id: teacher._id,
      name: teacher.full_name,
      email: teacher.email,
      teacher_code: teacher.school_info?.teacher_code,
      department: teacher.school_info?.department_id?.name || "N/A", // Lấy tên khoa từ department_id trực tiếp
      contact: {
        // Thêm thông tin liên hệ
        phone: teacher.contact?.phone || "N/A",
      },
      // major: teacher.school_info?.major_id?.name || "N/A", // Sẽ là N/A nếu major_id không có hoặc không được populate
      // subjects: [], // Bỏ trường subjects vì không còn dùng trong frontend này
      // Bạn có thể thêm các trường khác nếu cần
    }));

    res.status(200).json(formattedTeachers);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách giảng viên:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ khi lấy danh sách giảng viên." });
  }
};

module.exports = {
  getAllTeachers,
};
