import React from "react";
import { Box, Typography, Paper } from "@mui/material";

const TestPage = () => {
  return (
    <Box sx={{ p: 4, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
        <Typography variant="h4" gutterBottom>
          Trang kiểm tra
        </Typography>
        <Typography>
          Đây là trang kiểm tra đơn giản để xác định vấn đề. Nếu bạn thấy trang
          này, vấn đề không nằm ở React Router hoặc các thành phần cơ bản.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TestPage;
