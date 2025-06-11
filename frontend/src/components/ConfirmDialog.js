import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

/**
 * Component hiển thị hộp thoại xác nhận
 *
 * @param {Object} props - Các props truyền vào component
 * @param {boolean} props.open - Trạng thái hiển thị của dialog
 * @param {Function} props.onClose - Hàm xử lý khi đóng dialog
 * @param {Function} props.onConfirm - Hàm xử lý khi xác nhận hành động
 * @param {string} props.title - Tiêu đề của dialog
 * @param {string} props.content - Nội dung của dialog
 * @param {string} props.confirmText - Text của nút xác nhận (mặc định là "Xác nhận")
 * @param {string} props.cancelText - Text của nút hủy (mặc định là "Hủy")
 * @param {boolean} props.danger - Nếu true, hiển thị dialog với màu cảnh báo
 * @param {boolean} props.loading - Trạng thái loading của dialog (deprecated)
 * @param {boolean} props.isLoading - Trạng thái đang xử lý
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Xác nhận",
  content = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  danger = false,
  loading = false,
  isLoading = false,
}) => {
  // Sử dụng isLoading nếu được truyền vào, nếu không thì sử dụng loading (để tương thích với code cũ)
  const isProcessing = isLoading || loading;

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            {danger && (
              <WarningIcon color="error" fontSize="small" sx={{ mr: 1 }} />
            )}
            <Typography variant="h6" component="span">
              {title}
            </Typography>
          </Box>
          {!isProcessing && (
            <IconButton aria-label="close" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isProcessing}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={danger ? "error" : "primary"}
          variant="contained"
          autoFocus
          disabled={isProcessing}
        >
          {isProcessing ? <CircularProgress size={24} /> : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
