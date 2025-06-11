import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "../utils/axios";
import { setCredentials } from "../redux/slices/authSlice";
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";

const API_URL = process.env.REACT_APP_API_URL;

const GoogleRedirectPage = () => {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    handleGoogleCallback();
  }, []);

  const handleGoogleCallback = async () => {
    try {
      // Lấy thông tin từ URL
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get("token");
      const statusParam = queryParams.get("status");
      const needsRegistration = queryParams.get("needsRegistration") === "true";
      const email = queryParams.get("email");
      const googleId = queryParams.get("googleId");
      const name = queryParams.get("name");
      const avatar = queryParams.get("avatar");
      const role = queryParams.get("role");

      // Nếu URL chứa token, có nghĩa là đăng nhập thành công
      if (token) {
        // Kiểm tra trạng thái người dùng
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.data.success) {
            const user = response.data.data;

            // Kiểm tra trạng thái tài khoản
            if (user.status === "pending") {
              setStatus("pending");
              setMessage(
                "Tài khoản của bạn đang chờ được phê duyệt. Vui lòng đợi."
              );
              setTimeout(() => {
                navigate(`/pending-approval?role=${user.role}`);
              }, 2000);
            } else if (user.status === "rejected") {
              setStatus("rejected");
              setMessage(
                "Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên."
              );
              setTimeout(() => {
                navigate(`/login?error=rejected&role=${user.role}`);
              }, 2000);
            } else if (user.status === "approved") {
              // Lưu thông tin đăng nhập
              dispatch(
                setCredentials({
                  token,
                  user,
                })
              );
              setStatus("success");
              setMessage("Đăng nhập thành công! Đang chuyển hướng...");
              setTimeout(() => {
                navigate("/dashboard");
              }, 1000);
            }
          }
        } catch (error) {
          setStatus("error");
          setMessage("Không thể xác thực người dùng. Vui lòng thử lại.");
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
      }
      // Nếu cần đăng ký
      else if (needsRegistration && email && googleId) {
        // Kiểm tra xem người dùng đã tồn tại chưa
        try {
          const response = await axios.get(
            `${API_URL}/auth/check-status?email=${email}`
          );

          if (response.data.exists) {
            // Nếu người dùng đã tồn tại
            const user = response.data.user;

            if (user.status === "pending") {
              setStatus("pending");
              setMessage(
                "Tài khoản của bạn đang chờ được phê duyệt. Vui lòng đợi."
              );
              setTimeout(() => {
                navigate(`/pending-approval?role=${user.role}`);
              }, 2000);
            } else if (user.status === "rejected") {
              setStatus("rejected");
              setMessage(
                "Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên."
              );
              setTimeout(() => {
                navigate(`/login?error=rejected&role=${user.role}`);
              }, 2000);
            } else {
              setStatus("redirect");
              setMessage(
                "Đã tìm thấy tài khoản của bạn. Đang chuyển hướng để đăng nhập..."
              );
              setTimeout(() => {
                navigate("/login");
              }, 2000);
            }
          } else {
            // Nếu người dùng chưa tồn tại, chuyển đến trang đăng ký
            setStatus("redirect");
            setMessage("Chuyển hướng đến trang đăng ký...");

            // Chuyển hướng ngay lập tức
            navigate(
              `/complete-registration?email=${email}&googleId=${googleId}&name=${encodeURIComponent(
                name || ""
              )}&avatar=${encodeURIComponent(
                avatar || ""
              )}&needsRegistration=true`
            );
          }
        } catch (error) {
          console.error("Error checking user status:", error);
          setStatus("redirect");
          setMessage("Chuyển hướng đến trang đăng ký...");

          // Chuyển hướng ngay lập tức
          navigate(
            `/complete-registration?email=${email}&googleId=${googleId}&name=${encodeURIComponent(
              name || ""
            )}&avatar=${encodeURIComponent(
              avatar || ""
            )}&needsRegistration=true`
          );
        }
      }
      // Nếu có tham số status (thường là pending hoặc rejected)
      else if (statusParam) {
        if (statusParam === "pending") {
          setStatus("pending");
          setMessage(
            `Tài khoản ${
              role === "student" ? "sinh viên" : "giảng viên"
            } của bạn đang chờ được phê duyệt.`
          );
          setTimeout(() => {
            navigate(`/pending-approval?role=${role || ""}`);
          }, 2000);
        } else if (statusParam === "rejected") {
          setStatus("rejected");
          setMessage(
            `Tài khoản ${
              role === "student" ? "sinh viên" : "giảng viên"
            } của bạn đã bị từ chối.`
          );
          setTimeout(() => {
            navigate(`/login?error=rejected&role=${role || ""}`);
          }, 2000);
        }
      }
      // Nếu không có thông tin đăng nhập
      else {
        setStatus("error");
        setMessage("Không tìm thấy thông tin đăng nhập. Vui lòng thử lại.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (error) {
      console.error("Google redirect error:", error);
      setStatus("error");
      setMessage("Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    }
  };

  // Hiển thị thông báo dựa trên trạng thái
  const getAlertSeverity = () => {
    switch (status) {
      case "success":
        return "success";
      case "pending":
        return "warning";
      case "rejected":
        return "error";
      case "redirect":
        return "info";
      case "error":
        return "error";
      default:
        return "info";
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          bgcolor: "background.paper",
        }}
      >
        {status === "loading" ? (
          <>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6">Đang xử lý đăng nhập...</Typography>
          </>
        ) : (
          <Alert
            severity={getAlertSeverity()}
            variant="filled"
            sx={{ width: "100%", mb: 2 }}
          >
            {message}
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default GoogleRedirectPage;
