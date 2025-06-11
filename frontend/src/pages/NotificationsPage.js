import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  List,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Paper,
  Alert,
} from "@mui/material";
import axios from "axios";
import { useSelector } from "react-redux";
import NotificationItem from "../components/common/NotificationItem"; // Import NotificationItem đã tạo
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  MarkEmailRead as MarkEmailReadIcon,
  DeleteSweep as DeleteSweepIcon,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL;

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [filterRead, setFilterRead] = useState(""); // '', 'true', 'false'
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const fetchNotifications = useCallback(
    async (currentPage, currentFilter) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const params = { page: currentPage, limit: 10 }; // Lấy 10 thông báo mỗi trang
        if (currentFilter !== "") {
          params.is_read = currentFilter;
        }

        const response = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        setNotifications(response.data.data || []);
        setTotalPages(response.data.totalPages || 0);
        setTotalNotifications(response.data.total || 0);
        setPage(response.data.currentPage || 1);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Không thể tải danh sách thông báo. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchNotifications(page, filterRead);
  }, [fetchNotifications, page, filterRead]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleFilterChange = (event) => {
    setFilterRead(event.target.value);
    setPage(1); // Reset về trang 1 khi thay đổi filter
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!token) return;
    try {
      await axios.put(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Cập nhật lại danh sách sau khi đánh dấu đọc
      fetchNotifications(page, filterRead);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      setError("Lỗi khi đánh dấu thông báo đã đọc.");
    }
  };

  const handleNavigate = (link, notificationId) => {
    // Không cần đánh dấu đọc ở đây nữa vì handleMarkAsRead sẽ được gọi riêng
    if (link && link !== window.location.pathname) {
      navigate(link);
    }
  };

  const handleMarkAllPageAsRead = async () => {
    if (!token || notifications.length === 0) return;
    setIsLoading(true);
    try {
      // Lấy ID của các thông báo chưa đọc trên trang hiện tại
      const unreadOnPageIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n._id);
      if (unreadOnPageIds.length === 0) {
        setError("Tất cả thông báo trên trang này đã được đọc.");
        setIsLoading(false);
        return;
      }
      // Đánh dấu từng cái một (API không hỗ trợ batch IDs)
      for (const id of unreadOnPageIds) {
        await axios.put(
          `${API_URL}/notifications/${id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      fetchNotifications(page, filterRead); // Tải lại dữ liệu trang hiện tại
    } catch (error) {
      console.error("Error marking page notifications as read:", error);
      setError("Lỗi khi đánh dấu các thông báo trên trang là đã đọc.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom component="h1">
          Tất cả thông báo ({totalNotifications})
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: "center" }}>
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel id="filter-read-label">Trạng thái</InputLabel>
            <Select
              labelId="filter-read-label"
              value={filterRead}
              label="Trạng thái"
              onChange={handleFilterChange}
            >
              <MenuItem value="">
                <em>Tất cả</em>
              </MenuItem>
              <MenuItem value="false">Chưa đọc</MenuItem>
              <MenuItem value="true">Đã đọc</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<MarkEmailReadIcon />}
            onClick={handleMarkAllPageAsRead}
            disabled={
              isLoading || notifications.filter((n) => !n.is_read).length === 0
            }
          >
            Đọc hết trang này
          </Button>
          {/* Có thể thêm nút xóa tất cả thông báo ở đây nếu cần */}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading && notifications.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "200px",
            }}
          >
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 && !isLoading ? (
          <Typography sx={{ textAlign: "center", mt: 3 }}>
            Không có thông báo nào.
          </Typography>
        ) : (
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead} // Sẽ gọi API và fetch lại
                onNavigate={handleNavigate} // Chỉ điều hướng
                formatDistanceToNow={formatDistanceToNow}
                locale={vi}
              />
            ))}
          </List>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
