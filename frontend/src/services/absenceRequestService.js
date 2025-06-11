import axios from "../utils/axios"; // Sử dụng instance axios đã cấu hình

const API_BASE_URL = "/absence-requests"; // Base path cho absence requests

// ============================ STUDENT APIs ============================

/**
 * Sinh viên tạo một đơn xin nghỉ phép mới
 * @param {FormData} requestData - Dữ liệu đơn dưới dạng FormData: { session_id, reason, evidence_file? }
 */
export const createAbsenceRequestByStudent = (requestData) => {
  return axios.post(`${API_BASE_URL}/`, requestData, {
    headers: {
      // Axios tự động set Content-Type là multipart/form-data khi data là FormData
      // Tuy nhiên, nếu có vấn đề, bạn có thể thử đặt rõ ràng:
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Sinh viên lấy danh sách các đơn xin nghỉ đã tạo của mình
 */
export const getMyAbsenceRequests = () => {
  return axios.get(`${API_BASE_URL}/my`);
};

/**
 * Sinh viên cập nhật đơn xin nghỉ của mình (khi đang ở trạng thái pending)
 * @param {string} requestId - ID của đơn xin nghỉ
 * @param {object | FormData} updateData - Dữ liệu cập nhật: { reason?, evidence_url?, evidence_file? }
 */
export const updateMyAbsenceRequest = (requestId, updateData) => {
  console.log("Service: updateMyAbsenceRequest called with:", {
    requestId,
    updateData,
  });

  // Kiểm tra xem updateData có phải là FormData không
  if (updateData instanceof FormData) {
    console.log("Service: Sending FormData");
    return axios.put(`${API_BASE_URL}/${requestId}`, updateData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      // Thêm timeout để tránh request bị treo
      timeout: 30000,
    });
  } else {
    console.log("Service: Sending JSON data");
    return axios.put(`${API_BASE_URL}/${requestId}`, updateData, {
      // Thêm timeout để tránh request bị treo
      timeout: 30000,
    });
  }
};

/**
 * Sinh viên hủy đơn xin nghỉ của mình (khi đang ở trạng thái pending)
 * @param {string} requestId - ID của đơn xin nghỉ
 */
export const cancelMyAbsenceRequest = (requestId) => {
  return axios.delete(`${API_BASE_URL}/${requestId}`);
};

// ============================ ADMIN/TEACHER APIs ============================

/**
 * Admin/Giáo viên lấy danh sách tất cả các đơn xin nghỉ (có filter và phân trang)
 * @param {object} params - Các tham số query: { page, limit, status, teaching_class_id, student_info, sort_by, order }
 */
export const getAllAbsenceRequestsForReview = (params) => {
  return axios.get(`${API_BASE_URL}/`, { params });
};

/**
 * Admin/Giáo viên cập nhật trạng thái của một đơn xin nghỉ (approve/reject)
 * @param {string} requestId - ID của đơn xin nghỉ
 * @param {object} statusData - Dữ liệu trạng thái: { status: 'approved' | 'rejected', reviewer_notes? }
 */
export const updateAbsenceRequestStatusByReviewer = (requestId, statusData) => {
  return axios.put(`${API_BASE_URL}/${requestId}/status`, statusData);
};

// (Có thể thêm các hàm khác nếu cần, ví dụ: lấy chi tiết một đơn bằng ID cho admin/teacher)
