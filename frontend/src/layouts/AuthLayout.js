import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Container, AppBar, Toolbar, Typography } from "@mui/material";
import { School } from "@mui/icons-material";

const AuthLayout = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Nếu đã đăng nhập, chuyển hướng đến trang chủ
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <School sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Hệ Thống Điểm Danh Bằng Khuôn Mặt
          </Typography>
        </Toolbar>
      </AppBar>
      <Container component="main">
        <Outlet />
      </Container>
    </Box>
  );
};

export default AuthLayout;
