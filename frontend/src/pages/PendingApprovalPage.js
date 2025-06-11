import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import {
  HourglassEmpty,
  CheckCircle,
  ErrorOutline,
  School,
  Work,
  ExitToApp,
} from "@mui/icons-material";
import {
  selectUser,
  selectIsAuthenticated,
  logout,
} from "../redux/slices/authSlice";

const PendingApprovalPage = () => {
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    // Kiểm tra xem có thông tin từ URL không (trường hợp chưa đăng nhập)
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    const statusParam = params.get("status");
    const roleParam = params.get("role");

    if (emailParam) {
      setEmail(emailParam);
    }

    if (statusParam) {
      setStatus(statusParam);
    } else if (user) {
      // Nếu không có tham số nhưng có thông tin user từ store
      setStatus(user.status);
      setEmail(user.email);
    } else if (!isAuthenticated && !emailParam) {
      // Nếu không có thông tin gì cả, chuyển về trang đăng nhập
      navigate("/login", { replace: true });
      return;
    }

    // Lấy vai trò
    if (roleParam) {
      setRole(roleParam);
    } else if (user) {
      setRole(user.role);
    }

    setLoading(false);
  }, [user, location, isAuthenticated, navigate]);

  // Nếu người dùng đã được phê duyệt và đã đăng nhập, chuyển đến dashboard
  useEffect(() => {
    if (user && user.status === "approved" && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [user, isAuthenticated, navigate]);

  // Hiển thị vai trò
  const getRoleText = () => {
    if (role === "student") return "Sinh viên";
    if (role === "teacher") return "Giảng viên";
    return "Người dùng";
  };

  // Hiển thị icon vai trò
  const getRoleIcon = () => {
    if (role === "student") return <School fontSize="small" />;
    if (role === "teacher") return <Work fontSize="small" />;
    return null;
  };

  // Xử lý đăng xuất
  const handleLogout = () => {
    dispatch(logout());
    localStorage.clear();
    // Chuyển hướng về trang đăng nhập
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="md">
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
          }}
        >
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6">Đang tải thông tin...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: "100%",
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          {status === "rejected" ? (
            <>
              <ErrorOutline sx={{ fontSize: 60, color: "error.main", mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Tài khoản không được phê duyệt
              </Typography>
              {role && (
                <Chip
                  icon={getRoleIcon()}
                  label={getRoleText()}
                  color="primary"
                  sx={{ mb: 2 }}
                />
              )}
              <Alert severity="error" sx={{ mb: 3 }}>
                Tài khoản của bạn đã bị từ chối
              </Alert>
              <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
                Rất tiếc, tài khoản của bạn đã bị từ chối. Vui lòng liên hệ với
                quản trị viên để biết thêm chi tiết.
              </Typography>
              {email && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email: {email}
                </Typography>
              )}
            </>
          ) : (
            <>
              <HourglassEmpty
                sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                Tài khoản đang chờ phê duyệt
              </Typography>
              {role && (
                <Chip
                  icon={getRoleIcon()}
                  label={getRoleText()}
                  color="primary"
                  sx={{ mb: 2 }}
                />
              )}
              <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
                {role === "student"
                  ? "Tài khoản của bạn đang đợi phê duyệt từ giáo viên cố vấn."
                  : "Tài khoản của bạn đang đợi phê duyệt từ quản trị viên."}
              </Typography>
              {email && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email: {email}
                </Typography>
              )}
              <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
                <Typography variant="body2">
                  <strong>Lưu ý:</strong> Quá trình phê duyệt có thể mất một
                  chút thời gian. Bạn sẽ nhận được email thông báo khi tài khoản
                  được phê duyệt.
                </Typography>
              </Alert>
            </>
          )}

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ExitToApp />}
              onClick={handleLogout}
              size="large"
            >
              Đăng xuất
            </Button>
            {status === "rejected" && (
              <Button
                variant="outlined"
                onClick={() => navigate("/contact")}
                sx={{ ml: 2 }}
              >
                Liên hệ hỗ trợ
              </Button>
            )}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Đăng xuất để đăng nhập lại với tài khoản khác
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default PendingApprovalPage;
