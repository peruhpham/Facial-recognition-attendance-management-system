import React, { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { Link } from "react-router-dom";
import axios from "../utils/axios";

const API_URL = process.env.REACT_APP_API_URL;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email,
      });
      setMessage(response.data.message);
      enqueueSnackbar(
        "Yêu cầu đã được gửi, vui lòng kiểm tra email của bạn nếu nó tồn tại trong hệ thống.",
        { variant: "success" }
      );
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
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
            borderRadius: "12px",
            width: "100%",
          }}
        >
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Quên Mật Khẩu
          </Typography>
          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            mb={3}
          >
            Nhập địa chỉ email của bạn. Nếu email này tồn tại trong hệ thống,
            chúng tôi sẽ gửi một liên kết để đặt lại mật khẩu.
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
              label="Địa chỉ Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || !!message}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            {message && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {message}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading || !!message}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Gửi liên kết"
              )}
            </Button>
            <Box textAlign="center">
              <MuiLink component={Link} to="/login" variant="body2">
                Quay lại trang đăng nhập
              </MuiLink>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;
