import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Link,
} from "@mui/material";
import {
  Google,
  Visibility,
  VisibilityOff,
  DeleteForever,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import {
  login,
  clearError,
  resetLoading,
  logout,
  setCredentials,
} from "../redux/slices/authSlice";
import axios from "../utils/axios";

const API_URL = process.env.REACT_APP_API_URL;

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { isAuthenticated, isLoading, error, user } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Xử lý xóa dữ liệu đăng nhập
  const handleClearLoginData = () => {
    // Đăng xuất từ Redux store
    dispatch(logout());

    // Xóa tất cả localStorage
    localStorage.clear();

    // Xóa các cookies
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    enqueueSnackbar("Đã xóa dữ liệu đăng nhập, bạn có thể đăng nhập lại", {
      variant: "success",
    });

    // Làm mới trang để đảm bảo mọi thứ được đặt lại
    window.location.href = "/login";
  };

  // Thêm bảo vệ để tránh loading vô hạn
  useEffect(() => {
    let timeoutId;
    if (isLoading) {
      // Nếu loading quá 10 giây, tự động đặt lại trạng thái
      timeoutId = setTimeout(() => {
        dispatch(resetLoading());
        enqueueSnackbar("Đã hết thời gian chờ. Vui lòng thử lại.", {
          variant: "warning",
        });
      }, 10000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, dispatch, enqueueSnackbar]);

  useEffect(() => {
    // Nếu đã đăng nhập, chuyển hướng đến trang chủ
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Hiển thị lỗi nếu có
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
      dispatch(clearError());
      // Đảm bảo trạng thái loading được đặt lại
      if (isLoading) {
        dispatch(resetLoading());
      }
    }
  }, [error, enqueueSnackbar, dispatch, isLoading]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset form errors
    setFormErrors({
      email: "",
      password: "",
    });

    // Validate form
    let hasErrors = false;
    const errors = {
      email: "",
      password: "",
    };

    if (!formData.email) {
      errors.email = "Email là bắt buộc";
      hasErrors = true;
      emailInputRef.current?.focus();
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email không hợp lệ";
      hasErrors = true;
      emailInputRef.current?.focus();
    }

    if (!formData.password) {
      errors.password = "Mật khẩu là bắt buộc";
      hasErrors = true;
      if (!errors.email) {
        passwordInputRef.current?.focus();
      }
    }

    if (hasErrors) {
      setFormErrors(errors);
      return;
    }

    // Sử dụng axios trực tiếp thay vì Redux để ngăn reload trang
    setLocalLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, formData);

      if (response.data.success) {
        // Đăng nhập thành công, cập nhật redux store
        dispatch(
          setCredentials({
            token: response.data.token,
            user: response.data.user,
          })
        );

        // Chuyển hướng đến trang chủ
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);

      // Xử lý lỗi đăng nhập
      const errorMessage =
        error.response?.data?.message || "Đăng nhập thất bại";

      if (errorMessage.includes("Email hoặc mật khẩu không đúng")) {
        setFormErrors({
          ...errors,
          password: "Email hoặc mật khẩu không đúng",
        });
        passwordInputRef.current?.focus();
      } else {
        // Hiển thị thông báo lỗi
        enqueueSnackbar(errorMessage, { variant: "error" });
      }
    } finally {
      setLocalLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      setGoogleLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL;
      // Thêm timestamp để tránh cache
      const redirectUrl = `${apiUrl}/auth/google?t=${Date.now()}`;
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Google login error:", error);
      setGoogleLoading(false);
      enqueueSnackbar(
        "Không thể kết nối đến dịch vụ Google. Vui lòng thử lại sau.",
        { variant: "error" }
      );
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      {(isAuthenticated || localStorage.getItem("token")) && (
        <Box mt={2} display="flex" justifyContent="center">
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<DeleteForever />}
                onClick={handleClearLoginData}
              >
                Xóa dữ liệu đăng nhập
              </Button>
            }
          >
            Bạn đang gặp vấn đề chuyển hướng tự động?
          </Alert>
        </Box>
      )}

      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: "32px",
            borderRadius: "12px",
            width: "100%",
            animation: "fadeIn 0.5s ease-out forwards",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            "&:hover": {
              transform: "scale(1.01)",
              boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.15)",
            },
          }}
          className="login-paper"
        >
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Đăng Nhập
          </Typography>
          <Typography
            variant="body1"
            align="center"
            color="text.secondary"
            mb={3}
          >
            Hệ thống điểm danh bằng khuôn mặt
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              error={!!formErrors.email}
              helperText={formErrors.email}
              inputRef={emailInputRef}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              variant="outlined"
              error={!!formErrors.password}
              helperText={formErrors.password}
              inputRef={passwordInputRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={toggleShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                transition: "background-color 0.3s ease, transform 0.2s ease",
                "&:hover": {
                  transform: "scale(1.02)",
                },
              }}
              disabled={localLoading}
              color="primary"
            >
              {localLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Đăng Nhập"
              )}
            </Button>

            <Grid container>
              <Grid item xs>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                >
                  Quên mật khẩu?
                </Link>
              </Grid>
              <Grid item>
                <Link component={RouterLink} to="/register" variant="body2">
                  {"Chưa có tài khoản? Đăng ký"}
                </Link>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }}>Hoặc</Divider>

            <Button
              fullWidth
              variant="contained"
              color="secondary"
              startIcon={
                googleLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Google />
                )
              }
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              sx={{
                py: 1.5,
                transition: "background-color 0.3s ease, transform 0.2s ease",
                "&:hover": {
                  transform: "scale(1.02)",
                },
              }}
            >
              {googleLoading ? "Đang xử lý..." : "Đăng nhập bằng Google"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
