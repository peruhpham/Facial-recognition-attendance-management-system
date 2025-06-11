import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Container,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  School,
  Person,
  Settings,
  People,
  AccountCircle,
  Logout,
  CalendarToday,
  ListAlt,
  Home,
  Face,
  Place,
  Domain,
  Groups,
  Notifications as NotificationsIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
} from "@mui/icons-material";
import { logout } from "../redux/slices/authSlice";
import NotificationBell from "../components/common/NotificationBell";

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { user } = useSelector((state) => state.auth);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    dispatch(logout());
    navigate("/login");
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate("/profile");
  };

  // Danh sách menu dựa vào vai trò người dùng
  const getMenuItems = () => {
    const menuItems = [
      {
        text: "Trang chủ",
        icon: <Dashboard />,
        path: "/dashboard",
        roles: ["admin", "teacher", "student"],
      },
      {
        text: "Thông báo",
        icon: <NotificationsIcon />,
        path: "/notifications",
        roles: ["admin", "teacher", "student"],
      },
      {
        text: "Hồ sơ cá nhân",
        icon: <Person />,
        path: "/profile",
        roles: ["admin", "teacher", "student"],
      },
    ];

    // Menu cho sinh viên
    if (user?.role === "student") {
      menuItems.push(
        {
          text: "Đăng ký khuôn mặt",
          icon: <Face />,
          path: "/register-face",
          roles: ["student"],
        },
        {
          text: "Danh sách lớp học",
          icon: <School />,
          path: "/student/classes",
          roles: ["student"],
        },
        {
          text: "Điểm số",
          icon: <ListAlt />,
          path: "/student/scores",
          roles: ["student"],
        },
        {
          text: "Thông tin Giảng viên",
          icon: <Groups />,
          path: "/student/teachers",
          roles: ["student"],
        },
        {
          text: "Đơn xin nghỉ phép",
          icon: <AssignmentTurnedInIcon />,
          path: "/student/absence-requests",
          roles: ["student"],
        }
      );
    }

    // Menu cho giáo viên
    if (user?.role === "teacher") {
      menuItems.push(
        {
          text: "Quản lý lớp học",
          icon: <School />,
          path: "/teacher/classes",
          roles: ["teacher"],
        },
        {
          text: "Quản lý lớp chính",
          icon: <Groups />,
          path: "/teacher/main-class",
          roles: ["teacher"],
        }
      );
    }

    // Menu cho admin
    if (user?.role === "admin") {
      menuItems.push(
        {
          text: "Quản lý người dùng",
          icon: <People />,
          path: "/admin/users",
          roles: ["admin"],
        },
        {
          text: "Quản lý lớp học",
          icon: <School />,
          path: "/admin/classes",
          roles: ["admin"],
        },
        {
          text: "Quản lý khoa",
          icon: <ListAlt />,
          path: "/admin/departments",
          roles: ["admin"],
        },
        {
          text: "Quản lý ngành học",
          icon: <School />,
          path: "/admin/majors",
          roles: ["admin"],
        },
        {
          text: "Quản lý học kỳ",
          icon: <CalendarToday />,
          path: "/admin/semesters",
          roles: ["admin"],
        },
        {
          text: "Quản lý môn học",
          icon: <ListAlt />,
          path: "/admin/subjects",
          roles: ["admin"],
        },
        {
          text: "Quản lý cơ sở vật chất",
          icon: <Domain />,
          path: "/admin/facilities",
          roles: ["admin"],
        }
      );
    }

    return menuItems.filter((item) => item.roles.includes(user?.role));
  };

  const drawer = (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          padding: 2,
        }}
      >
        <School sx={{ mr: 1 }} />
        <Typography variant="h6" noWrap component="div">
          FaceReg
        </Typography>
      </Box>
      <Divider />
      <List>
        {getMenuItems().map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) {
                setDrawerOpen(false);
              }
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const menuId = "primary-search-account-menu";
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleProfile}>
        <AccountCircle sx={{ mr: 1 }} /> Hồ sơ
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <Logout sx={{ mr: 1 }} /> Đăng xuất
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            Hệ Thống Điểm Danh Bằng Khuôn Mặt
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <NotificationBell />
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              {user?.full_name}
            </Typography>
            <Tooltip title="Tài khoản">
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                {user?.avatar_url ? (
                  <Avatar
                    alt={user?.full_name}
                    src={user?.avatar_url}
                    sx={{ width: 32, height: 32 }}
                  />
                ) : (
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {user?.full_name?.charAt(0) || "U"}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      {renderMenu}

      <Box component="nav" sx={{ width: { md: 240 }, flexShrink: { md: 0 } }}>
        {/* Drawer cho mobile */}
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
          }}
        >
          {drawer}
        </Drawer>

        {/* Drawer cho desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 240px)` },
          mt: "64px",
        }}
      >
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
