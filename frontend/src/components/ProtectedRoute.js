import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * Component bảo vệ route, chỉ cho phép truy cập nếu đã đăng nhập
 * và có quyền phù hợp (nếu yêu cầu)
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component con
 * @param {Array} props.roles - Các vai trò được phép truy cập
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Nếu chưa đăng nhập, chuyển hướng đến trang đăng nhập
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra trạng thái tài khoản (tất cả người dùng trừ admin)
  if (
    user?.role !== "admin" &&
    (user?.status === "pending" || user?.status === "rejected")
  ) {
    // Chuyển hướng đến trang pending-approval với thông tin người dùng
    return (
      <Navigate
        to={`/pending-approval?email=${encodeURIComponent(
          user?.email || ""
        )}&status=${user?.status || ""}&role=${user?.role || ""}`}
        replace
      />
    );
  }

  // Nếu có yêu cầu về vai trò và người dùng không có vai trò đó
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Cho phép truy cập
  return children;
};

export default ProtectedRoute;
