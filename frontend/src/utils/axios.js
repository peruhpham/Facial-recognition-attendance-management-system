import axios from "axios";
import jwtDecode from "jwt-decode";
import { toast } from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL;

// Kiểm tra token đã hết hạn hay chưa
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const decoded = jwtDecode(token);
    return decoded.exp < Date.now() / 1000;
  } catch (error) {
    console.error("Token decode error:", error);
    return true;
  }
};

// Tạo axios instance với cấu hình chung
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Thêm interceptor cho request
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage
    const token =
      localStorage.getItem("token") || localStorage.getItem("userToken");

    // Kiểm tra token hết hạn trước khi gửi request
    if (token && isTokenExpired(token)) {
      // Xóa token và thông báo hết hạn
      localStorage.removeItem("token");
      localStorage.removeItem("userToken");

      // Chuyển hướng tới trang đăng nhập nếu không phải đang ở trang đăng nhập
      if (!window.location.pathname.includes("/login")) {
        toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        window.location.href = "/login";
      }

      // Không gửi token hết hạn trong request
      return config;
    }

    // Thêm token vào header nếu có
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Xử lý lỗi request
    return Promise.reject(error);
  }
);

// Thêm interceptor cho response
axiosInstance.interceptors.response.use(
  (response) => {
    // Trả về dữ liệu response
    return response;
  },
  (error) => {
    // Xử lý các loại lỗi response
    if (error.response) {
      // Server trả về response với status code nằm ngoài phạm vi 2xx
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Token hết hạn hoặc không hợp lệ
          if (data?.errorType === "TOKEN_EXPIRED") {
            // Trường hợp token hết hạn
            toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
          } else {
            // Các lỗi xác thực khác
            toast.error(data?.message || "Vui lòng đăng nhập lại");
          }

          // Xóa token và thông tin đăng nhập
          localStorage.removeItem("token");
          localStorage.removeItem("userToken");

          // Chuyển hướng đến trang đăng nhập nếu không phải đang ở trang đăng nhập
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          break;
        case 403:
          toast.error("Bạn không có quyền thực hiện thao tác này");
          break;
        case 404:
          toast.error("Không tìm thấy tài nguyên yêu cầu");
          break;
        case 500:
          toast.error("Lỗi máy chủ, vui lòng thử lại sau");
          break;
        default:
          toast.error(data?.message || "Đã xảy ra lỗi");
          break;
      }
    } else if (error.request) {
      // Request đã được gửi nhưng không nhận được response
      toast.error(
        "Không thể kết nối đến máy chủ, vui lòng kiểm tra kết nối mạng"
      );
    } else {
      // Có lỗi khi thiết lập request
      toast.error("Đã xảy ra lỗi khi gửi yêu cầu");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
