import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconButton,
  Badge,
  Popover,
  List,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Button,
  Tooltip,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  MarkChatRead as MarkChatReadIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSelector } from "react-redux";
import NotificationItem from "./NotificationItem"; // Sẽ tạo sau
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalNotifications, setTotalNotifications] = useState(0);

  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(
        `${API_URL}/notifications/unread-count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
    }
  }, [token]);

  const fetchNotifications = useCallback(
    async (currentPage) => {
      if (!token) return;
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: currentPage, limit: 5 }, // Lấy 5 thông báo mỗi lần
        });
        const newNotifications = response.data.data || [];
        setNotifications((prev) =>
          currentPage === 1 ? newNotifications : [...prev, ...newNotifications]
        );
        setTotalNotifications(response.data.total || 0);
        setHasMore(
          newNotifications.length > 0 &&
            currentPage * 5 < (response.data.total || 0)
        );
        setPage(currentPage);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setNotifications([]); // Reset notifications khi mở popover
    setPage(1); // Reset page về 1
    fetchNotifications(1); // Fetch trang đầu tiên
    fetchUnreadCount(); // Cập nhật lại số lượng chưa đọc
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "notification-popover" : undefined;

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
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, is_read: true } : n
        )
      );
      fetchUnreadCount(); // Cập nhật lại badge
      // Không cần fetch lại toàn bộ danh sách, chỉ cập nhật local state
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNavigate = (link, notificationId) => {
    handleMarkAsRead(notificationId); // Đánh dấu đã đọc trước khi điều hướng
    handleClose();
    if (link) {
      navigate(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await axios.put(
        `${API_URL}/notifications/read-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleViewAllNotifications = () => {
    handleClose();
    navigate("/notifications"); // Sẽ tạo trang này sau
  };

  const loadMoreNotifications = () => {
    if (!isLoading && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  return (
    <>
      <Tooltip title="Thông báo">
        <IconButton color="inherit" onClick={handleClick} aria-describedby={id}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          style: {
            width: "380px",
            maxHeight: "500px",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" component="div">
            Thông báo
          </Typography>
          {notifications.length > 0 && (
            <Tooltip title="Đánh dấu tất cả đã đọc">
              <IconButton
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                <DoneAllIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Divider />
        <List sx={{ flexGrow: 1, overflowY: "auto", p: 0 }}>
          {isLoading && notifications.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100px",
              }}
            >
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: "center" }}>
              Không có thông báo mới.
            </Typography>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onNavigate={handleNavigate}
                formatDistanceToNow={formatDistanceToNow}
                locale={vi}
              />
            ))
          )}
          {isLoading && notifications.length > 0 && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!isLoading && hasMore && notifications.length > 0 && (
            <Box sx={{ textAlign: "center", p: 1 }}>
              <Button onClick={loadMoreNotifications} size="small">
                Xem thêm
              </Button>
            </Box>
          )}
        </List>
        <Divider />
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button onClick={handleViewAllNotifications} fullWidth size="small">
            Xem tất cả thông báo
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
