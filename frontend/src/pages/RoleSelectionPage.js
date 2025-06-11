import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "../utils/axios";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { setCredentials } from "../redux/slices/authSlice";

const API_URL = process.env.REACT_APP_API_URL;

const RoleSelectionPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("student");

  // Lấy thông tin từ URL params
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email");
  const googleId = queryParams.get("googleId");
  const name = queryParams.get("name");
  const avatar = queryParams.get("avatar");

  useEffect(() => {
    // Kiểm tra xem có đủ thông tin không
    if (!email || !googleId) {
      enqueueSnackbar("Thiếu thông tin cần thiết để hoàn tất đăng ký", {
        variant: "error",
      });
      navigate("/login");
    }
  }, [email, googleId, navigate, enqueueSnackbar]);

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/google-complete`, {
        email,
        googleId,
        fullName: name,
        avatarUrl: avatar,
        role: selectedRole,
      });

      if (response.data.success) {
        // Lưu token và thông tin user
        dispatch(
          setCredentials({
            token: response.data.token,
            user: response.data.user,
          })
        );

        enqueueSnackbar("Đăng ký thành công!", { variant: "success" });
        navigate("/dashboard");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Đăng ký thất bại";
      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
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
            padding: 4,
            width: "100%",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            Hoàn tất đăng ký
          </Typography>

          <Typography variant="body1" color="text.secondary" mb={3}>
            Chào mừng! Vui lòng chọn vai trò của bạn để tiếp tục.
          </Typography>

          {avatar && (
            <Avatar
              src={avatar}
              alt={name || email}
              sx={{ width: 80, height: 80, mb: 2 }}
            />
          )}

          <Typography variant="h6" gutterBottom>
            {name || email}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            {email}
          </Typography>

          <FormControl component="fieldset" sx={{ mb: 4, width: "100%" }}>
            <FormLabel component="legend">Chọn vai trò của bạn</FormLabel>
            <RadioGroup
              aria-label="role"
              name="role"
              value={selectedRole}
              onChange={handleRoleChange}
            >
              <FormControlLabel
                value="student"
                control={<Radio />}
                label="Sinh viên"
              />
              <FormControlLabel
                value="teacher"
                control={<Radio />}
                label="Giảng viên"
              />
            </RadioGroup>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={isLoading}
            sx={{ py: 1.5 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Hoàn tất đăng ký"
            )}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default RoleSelectionPage;
