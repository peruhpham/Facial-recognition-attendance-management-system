import React from "react";
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Tooltip,
  Chip,
  Box,
} from "@mui/material";
import {
  Info as InfoIcon,
  AccountCircle as AccountCircleIcon,
  Class as ClassIcon,
  Event as EventIcon,
  Grading as GradingIcon,
  Campaign as CampaignIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  ErrorOutline as ErrorOutlineIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon, // For approvals or successful actions
  NotificationsActive as NotificationsActiveIcon, // Generic new notification
  HowToReg as HowToRegIcon, // User account related
  School as SchoolIcon, // Education/Class related
} from "@mui/icons-material";

// Hàm để chọn Icon dựa trên notification.type
const getNotificationIcon = (type) => {
  switch (type) {
    case "USER_ACCOUNT":
      return <HowToRegIcon fontSize="small" />;
    case "CLASS_ENROLLMENT":
      return <SchoolIcon fontSize="small" />;
    case "SCHEDULE_UPDATE":
      return <EventIcon fontSize="small" />;
    case "GRADE_UPDATE":
      return <GradingIcon fontSize="small" />;
    case "ATTENDANCE_ALERT":
      return <AssignmentTurnedInIcon fontSize="small" />;
    case "ABSENCE_REQUEST":
      return <InfoIcon fontSize="small" />;
    case "GENERAL_ANNOUNCEMENT":
      return <CampaignIcon fontSize="small" />;
    case "NEW_MESSAGE":
      return <MessageIcon fontSize="small" />;
    case "SYSTEM_NOTIFICATION":
      return <SettingsIcon fontSize="small" />;
    default:
      return <NotificationsActiveIcon fontSize="small" />;
  }
};

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onNavigate,
  formatDistanceToNow,
  locale,
}) => {
  const handleItemClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification._id);
    }
    // Chỉ điều hướng nếu có link, và không phải là link của trang hiện tại để tránh reload không cần thiết
    if (notification.link && notification.link !== window.location.pathname) {
      onNavigate(notification.link, notification._id);
    } else if (!notification.link && !notification.is_read) {
      // Nếu không có link, vẫn gọi onMarkAsRead nếu click vào thông báo chưa đọc
      // onNavigate sẽ chỉ gọi onMarkAsRead và close popover
      onNavigate(null, notification._id);
    }
  };

  const senderName = notification.sender_id?.full_name || "Hệ thống";
  const senderAvatar = notification.sender_id?.avatar_url;

  return (
    <ListItem
      alignItems="flex-start"
      button
      onClick={handleItemClick}
      sx={{
        borderBottom: "1px solid #eee",
        backgroundColor: notification.is_read
          ? "transparent"
          : "rgba(0, 123, 255, 0.05)", // Highlight nhẹ nếu chưa đọc
        "&:hover": {
          backgroundColor: notification.is_read
            ? "rgba(0, 0, 0, 0.04)"
            : "rgba(0, 123, 255, 0.08)",
        },
      }}
    >
      <ListItemAvatar
        sx={{ minWidth: "auto", marginRight: 1.5, marginTop: 0.5 }}
      >
        <Tooltip title={senderName}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: notification.sender_id ? undefined : "primary.main",
            }}
            alt={senderName}
            src={senderAvatar}
          >
            {notification.sender_id ? (
              senderName ? (
                senderName.charAt(0).toUpperCase()
              ) : (
                <AccountCircleIcon />
              )
            ) : (
              getNotificationIcon(notification.type)
            )}
          </Avatar>
        </Tooltip>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography
            variant="body2"
            component="div"
            sx={{ fontWeight: notification.is_read ? "normal" : "bold" }}
          >
            {notification.title}
          </Typography>
        }
        secondary={
          <>
            <Typography
              sx={{ display: "block", mb: 0.5, color: "text.secondary" }}
              component="span"
              variant="caption"
              color="text.primary"
            >
              {notification.content.length > 100
                ? `${notification.content.substring(0, 100)}...`
                : notification.content}
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                  locale,
                })}
              </Typography>
              {!notification.is_read && (
                <Chip
                  label="Mới"
                  color="primary"
                  size="small"
                  sx={{ height: "18px", fontSize: "0.65rem", ml: 1 }}
                />
              )}
            </Box>
          </>
        }
        sx={{ margin: 0 }}
      />
    </ListItem>
  );
};

export default NotificationItem;
