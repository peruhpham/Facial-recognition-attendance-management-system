import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  login as loginAction,
  logout as logoutAction,
  getCurrentUser,
} from "../redux/slices/authSlice";
import { login as loginApi } from "../services/api";
import { useSnackbar } from "notistack";

/**
 * Hook xử lý xác thực
 * @returns {Object} - Các hàm và trạng thái xác thực
 */
const useAuth = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token, isAuthenticated, isLoading, error } = useSelector(
    (state) => state.auth
  );

  /**
   * Đăng nhập
   * @param {Object} credentials - Thông tin đăng nhập { email, password }
   * @param {string} redirectUrl - URL chuyển hướng sau khi đăng nhập thành công
   */
  const login = async (credentials, redirectUrl = "/") => {
    try {
      const response = await loginApi(credentials);

      if (response.data.success) {
        const { token, user } = response.data;
        dispatch(loginAction({ token, user }));

        enqueueSnackbar("Đăng nhập thành công", { variant: "success" });
        navigate(redirectUrl);
      } else {
        enqueueSnackbar("Đăng nhập thất bại: " + response.data.message, {
          variant: "error",
        });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Đăng nhập thất bại";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  /**
   * Đăng xuất
   */
  const logout = () => {
    dispatch(logoutAction());
    enqueueSnackbar("Đăng xuất thành công", { variant: "success" });
    navigate("/login");
  };

  /**
   * Kiểm tra và cập nhật thông tin người dùng hiện tại
   */
  const checkAuth = () => {
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  };

  /**
   * Kiểm tra vai trò người dùng
   * @param {Array} roles - Các vai trò cần kiểm tra
   * @returns {boolean} - Có phải vai trò hay không
   */
  const hasRole = (roles) => {
    if (!user) return false;
    if (!Array.isArray(roles)) roles = [roles];
    return roles.includes(user.role);
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    hasRole,
  };
};

export default useAuth;
