import axios from "axios";
import { API_URL } from "../config";

// Lấy danh sách tất cả kỳ học
export const getSemesters = async (page = 0, limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/api/semesters`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching semesters:", error);
    throw error;
  }
};

// Lấy thông tin một kỳ học theo ID
export const getSemesterById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/semesters/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching semester with ID ${id}:`, error);
    throw error;
  }
};

// Tạo kỳ học mới
export const createSemester = async (semesterData) => {
  try {
    const response = await axios.post(`${API_URL}/api/semesters`, semesterData);
    return response.data;
  } catch (error) {
    console.error("Error creating semester:", error);
    throw error;
  }
};

// Cập nhật thông tin kỳ học
export const updateSemester = async (id, semesterData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/semesters/${id}`,
      semesterData
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating semester with ID ${id}:`, error);
    throw error;
  }
};

// Xóa kỳ học
export const deleteSemester = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/api/semesters/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting semester with ID ${id}:`, error);
    throw error;
  }
};
