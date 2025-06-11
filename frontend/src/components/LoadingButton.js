import React from "react";
import { Button, CircularProgress } from "@mui/material";

/**
 * Nút với trạng thái đang tải
 * @param {Object} props - Props
 * @param {boolean} props.loading - Trạng thái đang tải
 * @param {React.ReactNode} props.children - Nội dung nút
 * @param {string} props.variant - Kiểu nút: 'text', 'outlined', 'contained'
 * @param {string} props.color - Màu nút: 'primary', 'secondary', 'error', 'info', 'success', 'warning'
 * @param {function} props.onClick - Hàm xử lý sự kiện click
 * @param {boolean} props.disabled - Trạng thái vô hiệu hóa
 * @param {string} props.size - Kích thước nút: 'small', 'medium', 'large'
 * @param {Object} props.sx - Custom styles
 */
const LoadingButton = ({
  loading = false,
  children,
  variant = "contained",
  color = "primary",
  onClick,
  disabled = false,
  size = "medium",
  sx,
  ...rest
}) => {
  return (
    <Button
      variant={variant}
      color={color}
      onClick={onClick}
      disabled={disabled || loading}
      size={size}
      sx={{ position: "relative", ...sx }}
      {...rest}
    >
      {children}
      {loading && (
        <CircularProgress
          size={24}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: "-12px",
            marginLeft: "-12px",
          }}
        />
      )}
    </Button>
  );
};

export default LoadingButton;
