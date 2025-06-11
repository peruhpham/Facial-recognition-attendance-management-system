import React from "react";
import { Outlet } from "react-router-dom";
import { Box, Container, Typography } from "@mui/material";

/**
 * Layout tối giản cho các trang như đăng nhập, đăng ký
 */
const MinimalLayout = () => {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundImage: `url(${process.env.PUBLIC_URL}/img/background.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          py: 5,
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            color: "white",
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)",
            mb: 4,
          }}
        >
          Học Viện Công Nghệ Bưu Chính Viễn Thông
        </Typography>

        <Outlet />
      </Container>
    </Box>
  );
};

export default MinimalLayout;
