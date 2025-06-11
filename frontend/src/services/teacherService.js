import axios from "../utils/axios"; // Import axios instance đã cấu hình

// Hàm lấy danh sách tất cả giảng viên (cần được bảo vệ ở backend nếu cần)
export const getTeachers = async () => {
  try {
    const response = await axios.get("/teachers"); // Sử dụng axios trực tiếp, baseURL đã có /api
    return response.data;
  } catch (error) {
    console.error(
      "Lỗi khi lấy danh sách giảng viên:",
      error.response || error.message
    );
    throw error;
  }
};

// Có thể thêm các hàm khác liên quan đến giảng viên ở đây sau này
// ví dụ: getTeacherById(id), updateTeacher(id, data), ...
