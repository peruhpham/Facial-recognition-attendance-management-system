import axios from "axios";
import { API_URL } from "../config";

// Lấy danh sách tất cả môn học
export const getSubjects = async (page = 0, limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/api/subjects`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching subjects:", error);
    throw error;
  }
};

// Lấy thông tin một môn học theo ID
export const getSubjectById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/subjects/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching subject with ID ${id}:`, error);
    throw error;
  }
};

// Tạo môn học mới
export const createSubject = async (subjectData) => {
  try {
    const response = await axios.post(`${API_URL}/api/subjects`, subjectData);
    return response.data;
  } catch (error) {
    console.error("Error creating subject:", error);
    throw error;
  }
};

// Cập nhật thông tin môn học
export const updateSubject = async (id, subjectData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/subjects/${id}`,
      subjectData
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating subject with ID ${id}:`, error);
    throw error;
  }
};

// Xóa môn học
export const deleteSubject = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/api/subjects/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting subject with ID ${id}:`, error);
    throw error;
  }
};
