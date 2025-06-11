import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axios";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Tooltip,
  IconButton,
  useTheme,
} from "@mui/material";
import {
  School,
  Class,
  Person,
  People,
  Event,
  EventAvailable,
  CheckCircle,
  Face,
  Today,
  AccessTime,
  Timeline,
  Info,
  Error,
  Timelapse,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { logout } from "../redux/slices/authSlice";

const API_URL = process.env.REACT_APP_API_URL;

const DashboardPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  const [stats, setStats] = useState({
    classes: [],
    attendanceSessions: [],
    todayAttendance: [],
    totalAttendedSessions: 0,
    totalSessions: 0,
    attendancePercentage: 0,
    recentAttendance: [],
    upcomingClasses: [],
    attendanceScores: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !token) {
      enqueueSnackbar("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.", {
        variant: "error",
      });
      dispatch(logout());
      navigate("/login", { replace: true });
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (user.role === "student") {
          let classesData = [];
          let scoresData = [];
          let logsData = [];
          let upcomingData = [];

          try {
            const classesResponse = await axiosInstance.get(
              `/classes/teaching/student/${user._id}`
            );
            classesData = classesResponse.data.data || [];
          } catch (error) {
            console.error("Lỗi khi lấy dữ liệu lớp học:", error);
            if (
              error.response &&
              (error.response.status === 401 ||
                error.response.data?.errorType === "TOKEN_EXPIRED" ||
                error.response.data?.errorType === "INVALID_TOKEN")
            ) {
              enqueueSnackbar(
                error.response.data?.message ||
                  "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
                { variant: "error" }
              );
              dispatch(logout());
              navigate("/login", { replace: true });
              return;
            }
          }

          try {
            const scoresResponse = await axiosInstance.get(
              `/attendance/student/${user._id}/scores`
            );
            scoresData = scoresResponse.data.data || [];
          } catch (error) {
            console.error("Lỗi khi lấy thống kê điểm danh:", error);
            if (
              error.response &&
              (error.response.status === 401 ||
                error.response.data?.errorType === "TOKEN_EXPIRED" ||
                error.response.data?.errorType === "INVALID_TOKEN")
            ) {
              enqueueSnackbar(
                error.response.data?.message ||
                  "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
                { variant: "error" }
              );
              dispatch(logout());
              navigate("/login", { replace: true });
              return;
            }
          }

          try {
            const logsResponse = await axiosInstance.get(
              `/attendance/student/${user._id}/logs?limit=10`
            );
            logsData = logsResponse.data.data || [];
          } catch (error) {
            console.error("Lỗi khi lấy lịch sử điểm danh:", error);
            if (
              error.response &&
              (error.response.status === 401 ||
                error.response.data?.errorType === "TOKEN_EXPIRED" ||
                error.response.data?.errorType === "INVALID_TOKEN")
            ) {
              enqueueSnackbar(
                error.response.data?.message ||
                  "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
                { variant: "error" }
              );
              dispatch(logout());
              navigate("/login", { replace: true });
              return;
            }
          }

          const totalAttended = scoresData.reduce(
            (total, score) =>
              total + (score.total_sessions - score.absent_sessions),
            0
          );

          const totalSessions = scoresData.reduce(
            (total, score) => total + score.total_sessions,
            0
          );

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayAttendance = logsData.filter((log) => {
            if (!log.timestamp) return false;

            const logDate = new Date(log.timestamp);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
          });

          const classesWithPercentage = classesData.map((classItem) => {
            const classScore = scoresData.find(
              (score) =>
                (score.teaching_class_id?._id || score.teaching_class_id) ===
                classItem._id
            );
            return {
              ...classItem,
              attendanceStats: classScore
                ? {
                    attended: classScore.attended_sessions || 0,
                    total: classScore.total_sessions || 0,
                    percentage: classScore.attendance_percentage || 0,
                    completed_sessions: classScore.completed_sessions || 0,
                    total_planned_sessions:
                      classScore.total_planned_sessions ||
                      classItem.total_sessions ||
                      0,
                    absent: classScore.absent_sessions || 0,
                    is_failed: classScore.is_failed_due_to_absent || false,
                  }
                : {
                    attended: 0,
                    total: 0,
                    percentage: 0,
                    completed_sessions: 0,
                    total_planned_sessions: classItem.total_sessions || 0,
                    absent: 0,
                    is_failed: false,
                  },
            };
          });

          setStats({
            classes: classesWithPercentage || [],
            attendanceSessions: logsData || [],
            todayAttendance,
            totalAttendedSessions: totalAttended,
            totalSessions,
            attendancePercentage:
              totalSessions > 0
                ? Math.round((totalAttended / totalSessions) * 100)
                : 0,
            recentAttendance: logsData.slice(0, 5),
            upcomingClasses: upcomingData,
            attendanceScores: scoresData,
          });
        } else if (user.role === "teacher") {
          const classesResponse = await axiosInstance.get(
            `/classes/teaching/teacher/${user._id}`
          );

          const sessionsResponse = await axiosInstance.get(
            `/attendance/sessions?teacher=${user._id}&limit=5`
          );

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayAttendance = sessionsResponse.data.data.filter(
            (session) => {
              const sessionDate = new Date(session.date);
              sessionDate.setHours(0, 0, 0, 0);
              return sessionDate.getTime() === today.getTime();
            }
          );

          setStats({
            classes: classesResponse.data.data || [],
            attendanceSessions: sessionsResponse.data.data || [],
            todayAttendance,
            totalClasses: classesResponse.data.data.length,
          });
        } else if (user.role === "admin") {
          const adminClassesResponse = await axiosInstance.get(
            `/classes/teaching?limit=5`
          );

          const usersResponse = await axiosInstance.get(`/users/stats`);

          const adminSessionsResponse = await axiosInstance.get(
            `/attendance/sessions?limit=5`
          );

          setStats({
            classes: adminClassesResponse.data.data || [],
            attendanceSessions: adminSessionsResponse.data.data || [],
            totalClasses: adminClassesResponse.data.totalCount || 0,
            totalUsers: usersResponse.data.totalUsers || 0,
            totalStudents: usersResponse.data.students || 0,
            totalTeachers: usersResponse.data.teachers || 0,
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu dashboard:", error);
        if (
          error.response &&
          (error.response.status === 401 ||
            error.response.data?.errorType === "TOKEN_EXPIRED" ||
            error.response.data?.errorType === "INVALID_TOKEN")
        ) {
          enqueueSnackbar(
            error.response.data?.message ||
              "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
            { variant: "error" }
          );
          dispatch(logout());
          navigate("/login", { replace: true });
        } else {
          setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
        }
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, token, dispatch, navigate, enqueueSnackbar]);

  const studentInfo = useMemo(() => {
    if (user.role !== "student") return null;

    return {
      name: user.full_name || "Sinh viên",
      studentId: user.school_info?.student_id || "Chưa cập nhật",
      department: user.school_info?.department || "Chưa cập nhật",
      registeredFace: user.faceFeatures?.descriptors?.length > 0,
      totalClasses: stats.classes.length,
    };
  }, [user, stats.classes.length]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <Error color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          startIcon={<Timelapse />}
        >
          Tải lại trang
        </Button>
      </Box>
    );
  }

  const renderContent = () => {
    switch (user.role) {
      case "student":
        return renderStudentDashboard();
      case "teacher":
        return renderTeacherDashboard();
      case "admin":
        return renderAdminDashboard();
      default:
        return <Typography>Vai trò không hợp lệ</Typography>;
    }
  };

  const renderStudentDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[2],
            background: `linear-gradient(to right, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
          }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                mr: 2,
                bgcolor: theme.palette.primary.dark,
                boxShadow: theme.shadows[3],
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            >
              <Person sx={{ fontSize: 40, color: "white" }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ color: "white", fontWeight: 600 }}>
                Xin chào, {studentInfo.name}!
              </Typography>
              <Typography variant="body2" sx={{ color: "white", opacity: 0.9 }}>
                Mã sinh viên: {studentInfo.studentId} | Khoa:{" "}
                {studentInfo.department}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  boxShadow: theme.shadows[3],
                  borderRadius: theme.shape.borderRadius,
                }}
              >
                <CardContent>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    fontSize="0.875rem"
                  >
                    Số lớp đang học
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <School
                      sx={{ fontSize: 36, mr: 2, color: "primary.main" }}
                    />
                    <Typography variant="h4">{stats.classes.length}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  boxShadow: theme.shadows[3],
                  borderRadius: theme.shape.borderRadius,
                }}
              >
                <CardContent>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    fontSize="0.875rem"
                  >
                    Tỷ lệ tham gia
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <CheckCircle
                      sx={{
                        fontSize: 36,
                        mr: 2,
                        color:
                          stats.attendancePercentage >= 80
                            ? "success.main"
                            : stats.attendancePercentage >= 50
                            ? "warning.main"
                            : "error.main",
                      }}
                    />
                    <Typography variant="h4">
                      {stats.attendancePercentage}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  boxShadow: theme.shadows[3],
                  borderRadius: theme.shape.borderRadius,
                }}
              >
                <CardContent>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    fontSize="0.875rem"
                  >
                    Buổi đã tham gia
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <EventAvailable
                      sx={{ fontSize: 36, mr: 2, color: "info.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalAttendedSessions}/{stats.totalSessions}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Card
          sx={{
            mb: 3,
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[2],
          }}
        >
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Điểm chuyên cần của bạn</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate("/student/scores")}
                endIcon={<Timeline />}
              >
                Xem tất cả
              </Button>
            </Box>

            {stats.attendanceScores && stats.attendanceScores.length > 0 ? (
              <List>
                {stats.attendanceScores.slice(0, 3).map((score) => (
                  <ListItem
                    key={score._id}
                    sx={{
                      mb: 1,
                      borderLeft: `4px solid ${
                        score.is_failed_due_to_absent
                          ? theme.palette.error.main
                          : score.attendance_percentage >= 80
                          ? theme.palette.success.main
                          : theme.palette.warning.main
                      }`,
                      borderRadius: "0 4px 4px 0",
                      bgcolor: "background.paper",
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: score.is_failed_due_to_absent
                            ? "error.main"
                            : "primary.main",
                        }}
                      >
                        {score.attendance_score >= 8 ? (
                          <CheckCircle />
                        ) : (
                          <School />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2">
                          {score.class_info?.name || "Lớp học"} -{" "}
                          {score.class_info?.subject?.name || "Môn học"}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            {score.attendance_description ||
                              `${score.attended_sessions || 0}/${
                                score.total_sessions || 0
                              } buổi`}
                          </Typography>
                          <br />
                          <Typography
                            variant="body2"
                            component="span"
                            color={
                              score.is_failed_due_to_absent
                                ? "error.main"
                                : "text.secondary"
                            }
                          >
                            {score.attendance_status ||
                              (score.is_failed_due_to_absent
                                ? "Cấm thi"
                                : "Đủ điều kiện dự thi")}
                          </Typography>
                        </>
                      }
                    />
                    <Box>
                      <Typography
                        variant="h6"
                        color={
                          score.attendance_score >= 8
                            ? "success.main"
                            : score.attendance_score >= 5
                            ? "warning.main"
                            : "error.main"
                        }
                      >
                        {score.attendance_score}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Điểm
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                Chưa có thông tin điểm chuyên cần
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card
          sx={{
            mb: 3,
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[2],
          }}
        >
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6">Các lớp học của bạn</Typography>
              {stats.classes.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate("/student/classes")}
                  endIcon={<Timeline />}
                >
                  Xem tất cả
                </Button>
              )}
            </Box>

            {stats.classes.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Bạn chưa tham gia lớp học nào
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {stats.classes.slice(0, 4).map((classItem) => (
                  <Grid item xs={12} sm={6} key={classItem._id}>
                    <Card
                      variant="outlined"
                      sx={{
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: theme.shadows[4],
                          transform: "translateY(-4px)",
                        },
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" noWrap fontWeight={500}>
                          {classItem.class_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          noWrap
                        >
                          <strong>Môn học:</strong>{" "}
                          {classItem.subject_id?.name ||
                            "Chưa có thông tin môn học"}{" "}
                          ({classItem.subject_id?.code || "N/A"})
                        </Typography>
                        {classItem.main_class_id && (
                          <Typography variant="body2" color="textSecondary">
                            <strong>Tiến độ:</strong>{" "}
                            {classItem.attendanceStats.completed_sessions} /{" "}
                            {classItem.attendanceStats.total_planned_sessions}{" "}
                            buổi đã hoàn thành
                          </Typography>
                        )}
                        <Box mt={1} display="flex" alignItems="center" gap={1}>
                          <Tooltip
                            title={
                              classItem.attendanceStats.is_failed
                                ? "Cấm thi do vắng quá nhiều"
                                : classItem.attendanceStats.percentage >= 80
                                ? "Tốt: Tham gia đầy đủ các buổi đã học"
                                : classItem.attendanceStats.percentage >= 50
                                ? "Cảnh báo: Cần đảm bảo tham gia đủ buổi"
                                : "Yếu: Đã vắng nhiều buổi"
                            }
                          >
                            <Chip
                              size="small"
                              icon={<CheckCircle />}
                              label={`Tham gia: ${classItem.attendanceStats.attended}/${classItem.attendanceStats.total} (${classItem.attendanceStats.percentage}%)`}
                              color={
                                classItem.attendanceStats.is_failed
                                  ? "error"
                                  : classItem.attendanceStats.percentage >= 80
                                  ? "success"
                                  : classItem.attendanceStats.percentage >= 50
                                  ? "warning"
                                  : "default"
                              }
                            />
                          </Tooltip>
                          <Tooltip
                            title={`Số buổi vắng: ${classItem.attendanceStats.absent}`}
                          >
                            <Chip
                              size="small"
                              label={`Vắng: ${classItem.attendanceStats.absent}`}
                              color={
                                classItem.attendanceStats.absent > 0
                                  ? "error"
                                  : "default"
                              }
                            />
                          </Tooltip>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(`/student/attendance/${classItem._id}`)
                          }
                        >
                          Xem điểm danh
                        </Button>
                        <Tooltip title="Thông tin chi tiết">
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/student/classes/${classItem._id}`)
                            }
                          >
                            <Info fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>

        {stats.upcomingClasses && stats.upcomingClasses.length > 0 && (
          <Card
            sx={{
              borderRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[2],
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lớp học sắp tới
              </Typography>
              <List>
                {stats.upcomingClasses.map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        session.teaching_class_id?.class_name || "Lớp học"
                      }
                      secondary={`${new Date(
                        session.date || new Date()
                      ).toLocaleDateString("vi-VN")} - Buổi ${
                        session.session_number || "?"
                      }`}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={() =>
                        navigate(
                          `/student/attendance/${
                            session.teaching_class_id?._id || ""
                          }`
                        )
                      }
                    >
                      Chi tiết
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Grid>

      <Grid item xs={12} md={4}>
        <Card
          sx={{
            mb: 3,
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[2],
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hôm nay ({new Date().toLocaleDateString("vi-VN")})
            </Typography>

            {stats.todayAttendance.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={2}
                sx={{
                  color: "text.secondary",
                  bgcolor: "background.default",
                  borderRadius: 1,
                }}
              >
                <Today sx={{ fontSize: 40, mb: 1, opacity: 0.7 }} />
                <Typography variant="body2" textAlign="center">
                  Không có điểm danh nào hôm nay
                </Typography>
              </Box>
            ) : (
              <List dense>
                {stats.todayAttendance.map((log) => (
                  <ListItem
                    key={log._id}
                    sx={{
                      bgcolor:
                        log.status === "present"
                          ? "success.light"
                          : "error.light",
                      mb: 1,
                      borderRadius: 1,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor:
                            log.status === "present"
                              ? theme.palette.success.main
                              : theme.palette.error.main,
                        }}
                      >
                        {log.status === "present" ? <CheckCircle /> : <Error />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={log.session_id?.teaching_class_id?.class_name}
                      secondary={`${new Date(log.timestamp).toLocaleTimeString(
                        "vi-VN"
                      )} - ${log.status === "present" ? "Có mặt" : "Vắng mặt"}`}
                    />
                    <Chip
                      size="small"
                      color={log.status === "present" ? "success" : "error"}
                      label={log.status === "present" ? "Có mặt" : "Vắng mặt"}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: theme.shape.borderRadius,
            boxShadow: theme.shadows[2],
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Điểm danh gần đây
            </Typography>

            {stats.recentAttendance.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có lịch sử điểm danh
              </Typography>
            ) : (
              <List dense>
                {stats.recentAttendance.map((log) => (
                  <ListItem
                    key={log._id}
                    sx={{
                      mb: 1,
                      borderLeft: `4px solid ${
                        log.status === "present"
                          ? theme.palette.success.main
                          : theme.palette.error.main
                      }`,
                      borderRadius: "0 4px 4px 0",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={log.session_id?.teaching_class_id?.class_name}
                      secondary={`${new Date(log.timestamp).toLocaleDateString(
                        "vi-VN"
                      )} - ${log.status === "present" ? "Có mặt" : "Vắng mặt"}`}
                    />
                    <Chip
                      size="small"
                      color={log.status === "present" ? "success" : "error"}
                      label={log.status === "present" ? "Có mặt" : "Vắng mặt"}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          {!studentInfo.registeredFace && (
            <Box
              p={2}
              sx={{
                bgcolor: theme.palette.warning.light,
                borderRadius: `0 0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px`,
              }}
            >
              <Typography variant="subtitle2" gutterBottom fontWeight={500}>
                Bạn chưa đăng ký khuôn mặt cho điểm danh tự động
              </Typography>
              <Button
                variant="contained"
                color="warning"
                startIcon={<Face />}
                size="small"
                onClick={() => navigate("/register-face")}
                fullWidth
                sx={{ mt: 1 }}
              >
                Đăng ký ngay
              </Button>
            </Box>
          )}
        </Card>
      </Grid>
    </Grid>
  );

  const renderTeacherDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Person sx={{ fontSize: 40, mr: 2, color: "primary.main" }} />
            <Box>
              <Typography variant="h5">Xin chào, {user.full_name}!</Typography>
              <Typography variant="body2" color="textSecondary">
                Mã giảng viên:{" "}
                {user.school_info?.teacher_code || "Chưa cập nhật"}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Số lớp đang dạy
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <School
                      sx={{ fontSize: 32, mr: 2, color: "primary.main" }}
                    />
                    <Typography variant="h4">{stats.classes.length}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Đang diễn ra hôm nay
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Today
                      sx={{ fontSize: 32, mr: 2, color: "success.main" }}
                    />
                    <Typography variant="h4">
                      {stats.todayAttendance.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Phiên gần đây
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <AccessTime
                      sx={{ fontSize: 32, mr: 2, color: "info.main" }}
                    />
                    <Typography variant="h4">
                      {stats.attendanceSessions.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Các lớp bạn đang dạy
            </Typography>

            {stats.classes.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Bạn chưa được phân công lớp học nào
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {stats.classes.map((classItem) => (
                  <Grid item xs={12} sm={6} key={classItem._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {classItem.class_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          noWrap
                        >
                          <strong>Môn học:</strong>{" "}
                          {classItem.subject_id?.name ||
                            "Chưa có thông tin môn học"}{" "}
                          ({classItem.subject_id?.code || "N/A"})
                        </Typography>
                        {classItem.main_class_id && (
                          <Typography variant="body2" color="textSecondary">
                            <strong>Lớp chính:</strong>{" "}
                            {classItem.main_class_id?.name}{" "}
                            {classItem.main_class_id?.class_code
                              ? `(${classItem.main_class_id.class_code})`
                              : ""}
                          </Typography>
                        )}
                        <Typography variant="body2" color="textSecondary">
                          <strong>Học kỳ:</strong>{" "}
                          {classItem.semester_id?.name || "Chưa có thông tin"}{" "}
                          {classItem.semester_id?.year || ""}
                        </Typography>
                        <Box mt={1} display="flex" alignItems="center">
                          <People sx={{ mr: 1, fontSize: 18 }} />
                          <Typography variant="body2">
                            {classItem.students?.length || 0} sinh viên
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() =>
                            navigate(`/teacher/classes/${classItem._id}`)
                          }
                        >
                          Chi tiết
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>

          {stats.classes.length > 0 && (
            <CardActions>
              <Button size="small" onClick={() => navigate("/teacher/classes")}>
                Xem tất cả lớp học
              </Button>
            </CardActions>
          )}
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hôm nay ({new Date().toLocaleDateString("vi-VN")})
            </Typography>

            {stats.todayAttendance.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Không có phiên điểm danh nào hôm nay
              </Typography>
            ) : (
              <List dense>
                {stats.todayAttendance.map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.teaching_class_id?.class_name}
                      secondary={`Buổi ${session.session_number} - ${
                        session.status === "active"
                          ? "Đang diễn ra"
                          : "Đã kết thúc"
                      }`}
                    />
                    <Chip
                      size="small"
                      color={
                        session.status === "active" ? "success" : "default"
                      }
                      label={
                        session.status === "active"
                          ? "Đang diễn ra"
                          : "Đã kết thúc"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          <CardActions>
            <Button size="small" onClick={() => navigate("/teacher/classes")}>
              Tạo phiên điểm danh mới
            </Button>
          </CardActions>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Phiên điểm danh gần đây
            </Typography>

            {stats.attendanceSessions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có phiên điểm danh nào
              </Typography>
            ) : (
              <List dense>
                {stats.attendanceSessions.slice(0, 5).map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.teaching_class_id?.class_name}
                      secondary={`Buổi ${session.session_number} - ${new Date(
                        session.date
                      ).toLocaleDateString("vi-VN")}`}
                    />
                    <Chip
                      size="small"
                      color={
                        session.status === "active"
                          ? "success"
                          : session.status === "pending"
                          ? "warning"
                          : "default"
                      }
                      label={
                        session.status === "active"
                          ? "Đang diễn ra"
                          : session.status === "pending"
                          ? "Sắp diễn ra"
                          : "Đã kết thúc"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAdminDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <Person sx={{ fontSize: 40, mr: 2, color: "primary.main" }} />
            <Box>
              <Typography variant="h5">Xin chào, {user.full_name}!</Typography>
              <Typography variant="body2" color="textSecondary">
                Quản trị viên hệ thống
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tổng số lớp học
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <School
                      sx={{ fontSize: 32, mr: 2, color: "primary.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalClasses || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tổng số người dùng
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <People
                      sx={{ fontSize: 32, mr: 2, color: "secondary.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalUsers || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Sinh viên
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Person
                      sx={{ fontSize: 32, mr: 2, color: "success.main" }}
                    />
                    <Typography variant="h4">
                      {stats.totalStudents || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Giáo viên
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Person sx={{ fontSize: 32, mr: 2, color: "info.main" }} />
                    <Typography variant="h4">
                      {stats.totalTeachers || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Lớp học gần đây
            </Typography>

            {stats.classes.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có lớp học nào
              </Typography>
            ) : (
              <List dense>
                {stats.classes.map((classItem) => (
                  <ListItem key={classItem._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Class />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={classItem.class_name}
                      secondary={`${
                        classItem.subject_id?.name ||
                        "Chưa có thông tin môn học"
                      } (${classItem.subject_id?.code || "N/A"}) - GV: ${
                        classItem.teacher_id?.full_name || "Chưa phân công"
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          <CardActions>
            <Button size="small" onClick={() => navigate("/admin/classes")}>
              Quản lý lớp học
            </Button>
          </CardActions>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Phiên điểm danh gần đây
            </Typography>

            {stats.attendanceSessions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Chưa có phiên điểm danh nào
              </Typography>
            ) : (
              <List dense>
                {stats.attendanceSessions.slice(0, 5).map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={session.teaching_class_id?.class_name}
                      secondary={`Buổi ${session.session_number} - ${new Date(
                        session.date
                      ).toLocaleDateString("vi-VN")}`}
                    />
                    <Chip
                      size="small"
                      color={
                        session.status === "active"
                          ? "success"
                          : session.status === "pending"
                          ? "warning"
                          : "default"
                      }
                      label={
                        session.status === "active"
                          ? "Đang diễn ra"
                          : session.status === "pending"
                          ? "Sắp diễn ra"
                          : "Đã kết thúc"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>

          <CardActions>
            <Button size="small" onClick={() => navigate("/admin/users")}>
              Quản lý người dùng
            </Button>
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trang chủ
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {renderContent()}
    </Box>
  );
};

export default DashboardPage;
