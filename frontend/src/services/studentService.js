import axios from "axios";

// Thay đổi import từ config thành định nghĩa API_URL trực tiếp
const API_URL = process.env.REACT_APP_API_URL;

/**
 * Service để quản lý các chức năng liên quan đến sinh viên
 */
class StudentService {
  constructor() {
    this.cache = {
      classes: new Map(),
      attendanceStats: new Map(),
      attendanceDetails: new Map(),
      classDetails: new Map(),
      attendanceScores: new Map(),
    };
    this.cacheExpiration = 5 * 60 * 1000; // 5 phút tính bằng ms
  }

  /**
   * Tạo khóa cache duy nhất từ các tham số
   * @param {Array} params - Các tham số để tạo khóa
   * @returns {string} - Khóa cache duy nhất
   */
  _createCacheKey(params) {
    return params.filter((p) => p !== undefined).join("_");
  }

  /**
   * Kiểm tra xem cache có còn hợp lệ không
   * @param {Object} cacheEntry - Mục cache cần kiểm tra
   * @returns {boolean} - true nếu cache vẫn còn hợp lệ
   */
  _isCacheValid(cacheEntry) {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < this.cacheExpiration;
  }

  /**
   * Lấy danh sách lớp học của sinh viên
   * @param {string} studentId - ID của sinh viên
   * @param {string} token - JWT token
   * @param {Object} options - Các tùy chọn tìm kiếm và phân trang
   * @returns {Promise} - Kết quả lớp học
   */
  async getStudentClasses(studentId, token, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        semester = "",
        academicYear = "",
        skipCache = false,
      } = options;

      // Tạo khóa cache
      const cacheKey = this._createCacheKey([
        "classes",
        studentId,
        page,
        limit,
        search,
        semester,
        academicYear,
      ]);

      // Kiểm tra cache nếu không yêu cầu bỏ qua
      if (!skipCache) {
        const cachedData = this.cache.classes.get(cacheKey);
        if (this._isCacheValid(cachedData)) {
          return cachedData.data;
        }
      }

      // Xây dựng URL với URLSearchParams để tránh lỗi encoding
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append("search", search);
      if (semester) params.append("semester", semester);
      if (academicYear) params.append("academic_year", academicYear);

      const url = `${API_URL}/classes/teaching/student/${studentId}?${params.toString()}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = {
        success: true,
        data: response.data.data || [],
        total: response.data.count || 0,
      };

      // Lưu vào cache
      this.cache.classes.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lớp học:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Lỗi khi lấy danh sách lớp học",
        data: [],
        total: 0,
      };
    }
  }

  /**
   * Lấy thống kê điểm danh của sinh viên trong một lớp học
   * @param {string} studentId - ID của sinh viên
   * @param {string} classId - ID của lớp học
   * @param {string} token - JWT token
   * @param {boolean} skipCache - Có bỏ qua cache hay không
   * @returns {Promise} - Kết quả thống kê điểm danh
   */
  async getAttendanceStats(studentId, classId, token, skipCache = false) {
    try {
      // Tạo khóa cache
      const cacheKey = this._createCacheKey(["stats", studentId, classId]);

      // Kiểm tra cache nếu không yêu cầu bỏ qua
      if (!skipCache) {
        const cachedData = this.cache.attendanceStats.get(cacheKey);
        if (this._isCacheValid(cachedData)) {
          return cachedData.data;
        }
      }

      // Lấy thông tin chi tiết về lớp học để biết tổng số buổi học
      const classDetailResponse = await axios.get(
        `${API_URL}/classes/teaching/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const classDetail = classDetailResponse.data.data || {};
      const totalPlannedSessions = classDetail.total_sessions || 0;

      // Lấy logs điểm danh (chỉ từ các phiên đã hoàn thành)
      const response = await axios.get(
        `${API_URL}/attendance/student/${studentId}/logs?teaching_class=${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Tính toán thống kê
      const logs = response.data.data || [];
      const totalSessions = logs.length;

      // Nếu có thông báo từ API là không có phiên điểm danh nào được hoàn thành
      if (
        response.data.message &&
        response.data.message.includes(
          "Không có phiên điểm danh nào được hoàn thành"
        )
      ) {
        const result = {
          success: true,
          data: {
            logs: [],
            stats: {
              total: 0,
              present: 0,
              absent: 0,
              late: 0,
              presentPercentage: 0,
              latePercentage: 0,
              absentPercentage: 0,
              attendanceRate: 0,
              totalPlannedSessions, // Thêm thông tin này để hiển thị "0 / 12"
              message: "Chưa có buổi học nào được điểm danh",
            },
          },
        };

        // Lưu vào cache
        this.cache.attendanceStats.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        return result;
      }

      // Sử dụng reduce để tính toán trong một lần duyệt mảng
      const counts = logs.reduce(
        (acc, log) => {
          if (log.status === "present") acc.present++;
          else if (log.status === "late") acc.late++;
          else if (log.status === "absent") acc.absent++;
          return acc;
        },
        { present: 0, late: 0, absent: 0 }
      );

      const { present, absent, late } = counts;

      // Tính toán các tỷ lệ phần trăm
      const presentPercentage =
        totalSessions > 0 ? (present / totalSessions) * 100 : 0;
      const latePercentage =
        totalSessions > 0 ? (late / totalSessions) * 100 : 0;
      const absentPercentage =
        totalSessions > 0 ? (absent / totalSessions) * 100 : 0;
      const attendanceRate =
        totalSessions > 0 ? ((present + late) / totalSessions) * 100 : 0;

      const result = {
        success: true,
        data: {
          logs,
          stats: {
            total: totalSessions,
            present,
            absent,
            late,
            presentPercentage,
            latePercentage,
            absentPercentage,
            attendanceRate,
            totalPlannedSessions, // Thêm vào để hiển thị "x / 12"
          },
        },
      };

      // Lưu vào cache
      this.cache.attendanceStats.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error(
        `Lỗi khi lấy thống kê điểm danh cho lớp ${classId}:`,
        error
      );
      return {
        success: false,
        error:
          error.response?.data?.message || "Lỗi khi lấy thống kê điểm danh",
        data: {
          logs: [],
          stats: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            presentPercentage: 0,
            latePercentage: 0,
            absentPercentage: 0,
            attendanceRate: 0,
            totalPlannedSessions: 0,
            message: "Lỗi khi lấy thống kê điểm danh",
          },
        },
      };
    }
  }

  /**
   * Lấy chi tiết điểm danh của sinh viên trong một lớp học
   * @param {string} studentId - ID của sinh viên
   * @param {string} classId - ID của lớp học
   * @param {string} token - JWT token
   * @param {Object} options - Các tùy chọn tìm kiếm và phân trang
   * @returns {Promise} - Kết quả chi tiết điểm danh
   */
  async getAttendanceDetails(studentId, classId, token, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "date",
        sortOrder = "desc",
        skipCache = false,
      } = options;

      // Tạo khóa cache
      const cacheKey = this._createCacheKey([
        "details",
        studentId,
        classId,
        page,
        limit,
        sortBy,
        sortOrder,
      ]);

      // Kiểm tra cache nếu không yêu cầu bỏ qua
      if (!skipCache) {
        const cachedData = this.cache.attendanceDetails.get(cacheKey);
        if (this._isCacheValid(cachedData)) {
          return cachedData.data;
        }
      }

      // Sử dụng URLSearchParams để xây dựng URL
      const params = new URLSearchParams({
        teaching_class: classId,
        page: page.toString(),
        limit: limit.toString(),
        sort: sortBy,
        order: sortOrder,
      });

      const url = `${API_URL}/attendance/student/${studentId}/logs?${params.toString()}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = {
        success: true,
        data: response.data.data || [],
        total: response.data.count || 0,
      };

      // Lưu vào cache
      this.cache.attendanceDetails.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error(
        `Lỗi khi lấy chi tiết điểm danh cho lớp ${classId}:`,
        error
      );
      return {
        success: false,
        error:
          error.response?.data?.message || "Lỗi khi lấy chi tiết điểm danh",
        data: [],
        total: 0,
      };
    }
  }

  /**
   * Lấy thông tin chi tiết của lớp học
   * @param {string} classId - ID của lớp học
   * @param {string} token - JWT token
   * @param {boolean} skipCache - Có bỏ qua cache hay không
   * @returns {Promise} - Kết quả chi tiết lớp học
   */
  async getClassDetail(classId, token, skipCache = false) {
    try {
      // Tạo khóa cache
      const cacheKey = this._createCacheKey(["class", classId]);

      // Kiểm tra cache nếu không yêu cầu bỏ qua
      if (!skipCache) {
        const cachedData = this.cache.classDetails.get(cacheKey);
        if (this._isCacheValid(cachedData)) {
          return cachedData.data;
        }
      }

      // Thử lấy thông tin từ endpoint chính
      try {
        const response = await axios.get(`${API_URL}/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = {
          success: true,
          data: response.data.data || {},
        };

        // Lưu vào cache
        this.cache.classDetails.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        return result;
      } catch (primaryError) {
        // Nếu endpoint chính không hoạt động, thử endpoint phụ
        if (primaryError.response?.status === 404) {
          const fallbackResponse = await axios.get(
            `${API_URL}/classes/teaching/${classId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const result = {
            success: true,
            data: fallbackResponse.data.data || {},
          };

          // Lưu vào cache
          this.cache.classDetails.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });

          return result;
        } else {
          // Nếu không phải lỗi 404, ném lại lỗi ban đầu
          throw primaryError;
        }
      }
    } catch (error) {
      console.error(`Lỗi khi lấy thông tin lớp học ${classId}:`, error);
      return {
        success: false,
        error: error.response?.data?.message || "Lỗi khi lấy thông tin lớp học",
        data: {},
        statusCode: error.response?.status,
      };
    }
  }

  /**
   * Lấy điểm chuyên cần của sinh viên
   * @param {string} studentId - ID của sinh viên
   * @param {string} token - JWT token
   * @param {boolean} skipCache - Có bỏ qua cache hay không
   * @returns {Promise} - Kết quả điểm chuyên cần
   */
  async getAttendanceScores(studentId, token, skipCache = false) {
    try {
      // Tạo khóa cache
      const cacheKey = this._createCacheKey(["scores", studentId]);

      // Kiểm tra cache nếu không yêu cầu bỏ qua
      if (!skipCache) {
        const cachedData = this.cache.attendanceScores.get(cacheKey);
        if (this._isCacheValid(cachedData)) {
          return cachedData.data;
        }
      }

      const response = await axios.get(
        `${API_URL}/attendance/student/${studentId}/scores`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = {
        success: true,
        data: response.data.data || [],
      };

      // Lưu vào cache
      this.cache.attendanceScores.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error(`Lỗi khi lấy điểm chuyên cần:`, error);
      return {
        success: false,
        error: error.response?.data?.message || "Lỗi khi lấy điểm chuyên cần",
        data: [],
      };
    }
  }

  /**
   * Kiểm tra điều kiện dự thi dựa trên số buổi vắng
   * @param {number} absentSessions - Số buổi vắng mặt
   * @param {number} maxAbsentAllowed - Số buổi vắng tối đa được cho phép
   * @returns {boolean} - Có đủ điều kiện dự thi hay không
   */
  checkExamEligibility(absentSessions, maxAbsentAllowed = 3) {
    return absentSessions <= maxAbsentAllowed;
  }

  /**
   * Xuất dữ liệu điểm danh ra file CSV
   * @param {Array} logs - Mảng chứa log điểm danh
   * @param {Object} classInfo - Thông tin về lớp học
   * @returns {Object} - Kết quả xuất file
   */
  exportAttendanceToCSV(logs, classInfo) {
    try {
      if (!logs || logs.length === 0) {
        return {
          success: false,
          error: "Không có dữ liệu điểm danh để xuất",
        };
      }

      // Tạo tiêu đề cho CSV
      const headers = [
        "Buổi học",
        "Ngày",
        "Trạng thái",
        "Thời gian điểm danh",
        "Ghi chú",
      ];

      // Chuyển đổi logs thành dòng CSV
      const rows = logs.map((log, index) => {
        const sessionNumber = log.session_id?.session_number || index + 1;
        const date = log.session_id?.date
          ? new Date(log.session_id.date).toLocaleDateString("vi-VN")
          : "N/A";
        const status =
          log.status === "present"
            ? "Có mặt"
            : log.status === "absent"
            ? "Vắng mặt"
            : log.status === "late"
            ? "Đi muộn"
            : "Không xác định";
        const timestamp = log.timestamp
          ? new Date(log.timestamp).toLocaleString("vi-VN")
          : "N/A";
        const note = log.note || "";

        return [sessionNumber, date, status, timestamp, note];
      });

      // Chuyển đổi thành CSV
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Tạo tên file
      const className = classInfo?.class_name || "attendance";
      const subjectCode = classInfo?.subject_id?.code || "";
      const fileName = `attendance_${className}_${subjectCode}_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      // Tạo và tải file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      console.error("Lỗi khi xuất dữ liệu điểm danh:", error);
      return {
        success: false,
        error: "Lỗi khi xuất dữ liệu điểm danh",
      };
    }
  }

  /**
   * Xóa cache cho một sinh viên cụ thể
   * @param {string} studentId - ID của sinh viên
   */
  clearCache(studentId) {
    // Xóa tất cả cache liên quan đến sinh viên này
    for (const [key, cache] of Object.entries(this.cache)) {
      for (const cacheKey of cache.keys()) {
        if (cacheKey.includes(studentId)) {
          cache.delete(cacheKey);
        }
      }
    }
  }

  /**
   * Tính điểm chuyên cần dựa trên số buổi vắng
   * @param {number} absences - Số buổi vắng
   * @returns {number} - Điểm chuyên cần (thang điểm 10)
   */
  calculateAttendanceScore(absences) {
    // Trừ 2 điểm cho mỗi buổi vắng, tối đa 10 điểm
    const score = Math.max(0, 10 - absences * 2);
    return parseFloat(score.toFixed(1)); // Làm tròn đến 1 chữ số thập phân hiệu quả hơn
  }

  /**
   * Xác định trạng thái điểm danh dựa trên tỷ lệ tham gia
   * @param {Object} stats - Thống kê điểm danh
   * @returns {Object} - Trạng thái tham gia và thông báo
   */
  getAttendanceStatus(stats) {
    const rate = stats.attendanceRate || 0;

    if (rate >= 80) {
      return { status: "success", message: "Tốt" };
    } else if (rate >= 60) {
      return { status: "warning", message: "Cần cải thiện" };
    } else {
      return { status: "error", message: "Nguy hiểm" };
    }
  }
}

export default new StudentService();
