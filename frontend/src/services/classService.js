import axios from "../utils/axios";

// Lấy danh sách các lớp giảng dạy của sinh viên
export const getMyTeachingClasses = async (studentId) => {
  if (!studentId) {
    throw new Error("Student ID is required to fetch teaching classes.");
  }
  try {
    // API này yêu cầu studentId là một phần của URL
    const response = await axios.get(`/classes/teaching/student/${studentId}`);
    return response.data; // Thường API sẽ trả về { success: true, data: [...] }
  } catch (error) {
    console.error(
      "Error fetching student's teaching classes:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

// Lấy danh sách các buổi học có thể xin nghỉ của sinh viên cho một lớp học cụ thể
export const getSchedulableSessionsForStudent = async (teachingClassId) => {
  try {
    const response = await axios.get(
      `/classes/teaching/${teachingClassId}/schedulable-sessions-for-student`
    );
    // API này đã được xác nhận là dùng req.user.id từ token, nên không cần studentId ở client
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching schedulable sessions:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

const classService = {
  getMyTeachingClasses,
  getSchedulableSessionsForStudent,
};

export default classService;
