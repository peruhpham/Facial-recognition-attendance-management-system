import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from "@mui/material";
import {
  People,
  Face,
  School,
  Assessment,
  TrendingUp,
  Warning,
  CheckCircle,
  HourglassEmpty,
  Groups,
  Male,
  Female,
  Transgender,
} from "@mui/icons-material";
import axios from "axios";
import { useSelector } from "react-redux";

const API_URL = process.env.REACT_APP_API_URL;

const MainClassStatistics = ({ classId, className }) => {
  const { token } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (classId) {
      fetchStatistics();
    }
  }, [classId]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/classes/main/${classId}/detailed-statistics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching statistics:", err);
      setError("Không thể tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  const genderIcons = {
    male: <Male color="primary" />,
    female: <Female color="secondary" />,
    other: <Transgender color="action" />,
    unknown: <People color="action" />,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", mb: 3 }}>
        📊 Thống kê chi tiết - {className}
      </Typography>

      <Grid container spacing={3}>
        {/* Tổng quan sinh viên */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: "100%", boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                  <People />
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  Sinh viên
                </Typography>
              </Box>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {stats.studentStats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng số sinh viên
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Chip
                    label={`Đã duyệt: ${stats.studentStats.approved}`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    label={`Chờ duyệt: ${stats.studentStats.pending}`}
                    color="warning"
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Thống kê khuôn mặt */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: "100%", boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "secondary.main", mr: 2 }}>
                  <Face />
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  Khuôn mặt
                </Typography>
              </Box>
              <Typography variant="h4" color="secondary" fontWeight="bold">
                {stats.studentStats.faceDataPercentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Đã đăng ký khuôn mặt
              </Typography>

              <LinearProgress
                variant="determinate"
                value={stats.studentStats.faceDataPercentage}
                sx={{ mb: 1, height: 8, borderRadius: 4 }}
                color="secondary"
              />

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="success.main">
                  Có: {stats.studentStats.withFaceData}
                </Typography>
                <Typography variant="caption" color="error.main">
                  Chưa: {stats.studentStats.withoutFaceData}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Lớp giảng dạy liên quan */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: "100%", boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "info.main", mr: 2 }}>
                  <School />
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  Lớp học phần
                </Typography>
              </Box>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {stats.academicStats.relatedTeachingClasses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Số lớp học phần
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Điểm chuyên cần trung bình */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: "100%", boxShadow: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "warning.main", mr: 2 }}>
                  <Assessment />
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  Điểm chuyên cần
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.academicStats.averageAttendanceScore.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Điểm trung bình
              </Typography>

              {stats.academicStats.studentsWithAttendanceIssues > 0 && (
                <Chip
                  icon={<Warning />}
                  label={`${stats.academicStats.studentsWithAttendanceIssues} SV có vấn đề`}
                  color="error"
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Phân bố giới tính */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                👥 Phân bố giới tính
              </Typography>
              <List dense>
                {Object.entries(stats.genderDistribution).map(
                  ([gender, count]) => (
                    <ListItem key={gender} divider>
                      <ListItemIcon>
                        {genderIcons[gender] || genderIcons.unknown}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          gender === "male"
                            ? "Nam"
                            : gender === "female"
                            ? "Nữ"
                            : gender === "other"
                            ? "Khác"
                            : "Chưa cập nhật"
                        }
                        secondary={`${count} sinh viên`}
                      />
                      <Chip
                        label={`${(
                          (count / stats.studentStats.approved) *
                          100
                        ).toFixed(1)}%`}
                        size="small"
                        variant="outlined"
                      />
                    </ListItem>
                  )
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Thông tin lớp học */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                ℹ️ Thông tin lớp học
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <School />
                  </ListItemIcon>
                  <ListItemText
                    primary="Ngành học"
                    secondary={`${stats.classInfo.major?.name} (${stats.classInfo.major?.code})`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Groups />
                  </ListItemIcon>
                  <ListItemText
                    primary="Khoa"
                    secondary={stats.classInfo.major?.department_id?.name}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp />
                  </ListItemIcon>
                  <ListItemText
                    primary="Khóa học"
                    secondary={`${stats.classInfo.year_start} - ${stats.classInfo.year_end}`}
                  />
                </ListItem>
                {stats.classInfo.advisor && (
                  <ListItem>
                    <ListItemIcon>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        {stats.classInfo.advisor.full_name?.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary="Cố vấn học tập"
                      secondary={stats.classInfo.advisor.full_name}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions và Alerts */}
        <Grid item xs={12}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                🚨 Cảnh báo và thông tin quan trọng
              </Typography>

              <Grid container spacing={2}>
                {stats.studentStats.pending > 0 && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Alert severity="warning" icon={<HourglassEmpty />}>
                      <Typography variant="body2" fontWeight="bold">
                        {stats.studentStats.pending} sinh viên chờ duyệt
                      </Typography>
                      <Typography variant="caption">
                        Cần xử lý phê duyệt
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {stats.studentStats.withoutFaceData > 0 && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Alert severity="info" icon={<Face />}>
                      <Typography variant="body2" fontWeight="bold">
                        {stats.studentStats.withoutFaceData} chưa đăng ký khuôn
                        mặt
                      </Typography>
                      <Typography variant="caption">
                        Cần hướng dẫn đăng ký
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {stats.academicStats.studentsWithAttendanceIssues > 0 && (
                  <Grid item xs={12} sm={6} md={4}>
                    <Alert severity="error" icon={<Warning />}>
                      <Typography variant="body2" fontWeight="bold">
                        {stats.academicStats.studentsWithAttendanceIssues} SV có
                        vấn đề điểm danh
                      </Typography>
                      <Typography variant="caption">
                        Cần theo dõi đặc biệt
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {stats.studentStats.pending === 0 &&
                  stats.studentStats.withoutFaceData === 0 &&
                  stats.academicStats.studentsWithAttendanceIssues === 0 && (
                    <Grid item xs={12}>
                      <Alert severity="success" icon={<CheckCircle />}>
                        <Typography variant="body2" fontWeight="bold">
                          Lớp học đang hoạt động tốt! 🎉
                        </Typography>
                        <Typography variant="caption">
                          Không có vấn đề nào cần chú ý đặc biệt
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainClassStatistics;
