import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Divider,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CalendarToday,
  AccessTime,
  CheckCircle,
  Cancel,
  Schedule,
  Help,
  School,
  Person,
  HowToReg,
  ArrowBack,
  Description,
  Book,
  CloudDownload,
  Warning,
  Error,
} from "@mui/icons-material";

// Import studentService thay vì gọi API trực tiếp
import studentService from "../../services/studentService";

const AttendanceStatusChip = ({ status }) => {
  switch (status) {
    case "present":
      return (
        <Chip
          label="Có mặt"
          color="success"
          size="small"
          icon={<CheckCircle />}
        />
      );
    case "absent":
      return (
        <Chip label="Vắng mặt" color="error" size="small" icon={<Cancel />} />
      );
    case "late":
      return (
        <Chip
          label="Đi muộn"
          color="warning"
          size="small"
          icon={<Schedule />}
        />
      );
    default:
      return (
        <Chip
          label="Không xác định"
          color="default"
          size="small"
          icon={<Help />}
        />
      );
  }
};

const StudentAttendancePage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [classInfo, setClassInfo] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: 0,
  });
  const [attendanceScore, setAttendanceScore] = useState({
    score: 0,
    maxScore: 10,
    passed: true,
    message: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load dữ liệu ban đầu
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Lấy thông tin lớp học sử dụng service
      const classResponse = await studentService.getClassDetail(classId, token);

      if (!classResponse.success) {
        enqueueSnackbar(classResponse.error, { variant: "error" });
        return;
      }

      setClassInfo(classResponse.data);

      // Lấy thống kê điểm danh sử dụng service
      const attendanceResponse = await studentService.getAttendanceStats(
        user._id,
        classId,
        token
      );

      if (!attendanceResponse.success) {
        enqueueSnackbar(attendanceResponse.error, { variant: "error" });
        return;
      }

      const { logs, stats } = attendanceResponse.data;
      setAttendanceLogs(logs);
      setAttendanceStats(stats);

      // Tính điểm chuyên cần đơn giản dựa trên số buổi vắng
      const absentCount = stats.absent || 0;
      const attendanceScore = Math.max(0, 10 - absentCount * 2);
      const maxAbsentAllowed = classResponse.data?.max_absent_allowed || 3;
      const isFailedDueToAbsent = absentCount > maxAbsentAllowed;

      setAttendanceScore({
        score: attendanceScore,
        maxScore: 10,
        passed: !isFailedDueToAbsent,
        message: isFailedDueToAbsent
          ? "Hỏng môn do vắng quá nhiều"
          : "Đạt yêu cầu",
      });
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu điểm danh", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [classId, token, user._id, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Xuất danh sách điểm danh
  const handleExportAttendance = () => {
    const result = studentService.exportAttendanceToCSV(
      attendanceLogs,
      classInfo
    );

    if (result.success) {
      enqueueSnackbar("Đã xuất dữ liệu điểm danh thành công", {
        variant: "success",
      });
    } else {
      enqueueSnackbar(result.error || "Lỗi khi xuất dữ liệu", {
        variant: "error",
      });
    }
  };

  // Tính điểm chuyên cần
  const calculateAttendanceScore = () => {
    const { absent } = attendanceStats;
    return studentService.calculateAttendanceScore(absent);
  };

  // Lấy icon và màu sắc trạng thái điểm danh
  const getAttendanceStatusInfo = () => {
    const status = studentService.getAttendanceStatus(attendanceStats);

    return {
      icon:
        status.status === "success" ? (
          <CheckCircle fontSize="large" color="success" />
        ) : status.status === "warning" ? (
          <Warning fontSize="large" color="warning" />
        ) : (
          <Error fontSize="large" color="error" />
        ),
      color: status.status,
      message: status.message,
    };
  };

  // Hiển thị màn hình loading
  if (isLoading) {
    return (
      <Box sx={{ padding: 3 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Đang tải dữ liệu điểm danh...
        </Typography>
      </Box>
    );
  }

  // Hiển thị thông tin điểm danh
  const statusInfo = getAttendanceStatusInfo();

  return (
    <Box sx={{ padding: 3 }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={() => navigate("/student/classes")}
        sx={{ mb: 3 }}
      >
        Quay lại danh sách lớp
      </Button>

      {/* Thông tin lớp học */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" gutterBottom>
              {classInfo?.class_name || "Chi tiết điểm danh"}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Book color="primary" />
              <Typography variant="body1">
                Môn học: {classInfo?.subject_id?.name || "N/A"} (
                {classInfo?.subject_id?.code || "N/A"})
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Person color="primary" />
              <Typography variant="body1">
                Giảng viên: {classInfo?.teacher_id?.full_name || "N/A"}
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              variant="outlined"
              sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}
            >
              <CardContent>
                <Typography variant="h6" align="center" gutterBottom>
                  Điểm chuyên cần
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Typography
                    variant="h3"
                    color={
                      attendanceScore.passed ? "success.main" : "error.main"
                    }
                  >
                    {attendanceScore.score}/{attendanceScore.maxScore}
                  </Typography>
                </Box>
                <Alert
                  severity={attendanceScore.passed ? "success" : "error"}
                  variant="filled"
                >
                  {attendanceScore.message}
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Thống kê điểm danh */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tổng số buổi
              </Typography>
              <Typography variant="h4">{attendanceStats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Có mặt
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h4" color="success.main">
                  {attendanceStats.present}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ ml: 1 }}
                >
                  ({Math.round(attendanceStats.presentPercentage || 0)}%)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Vắng mặt
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h4" color="error.main">
                  {attendanceStats.absent}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ ml: 1 }}
                >
                  ({Math.round(attendanceStats.absentPercentage || 0)}%)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tỷ lệ tham gia
              </Typography>
              <Box>
                <Box display="flex" alignItems="center">
                  <Typography variant="h4" color={statusInfo.color + ".main"}>
                    {Math.round(attendanceStats.attendanceRate)}%
                  </Typography>
                  <Box sx={{ ml: 1 }}>{statusInfo.icon}</Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={attendanceStats.attendanceRate}
                  color={statusInfo.color}
                  sx={{ mt: 1, height: 8, borderRadius: 2 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chi tiết điểm danh */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6">Chi tiết điểm danh</Typography>
          <Button
            variant="contained"
            startIcon={<CloudDownload />}
            onClick={handleExportAttendance}
            disabled={attendanceLogs.length === 0}
          >
            Xuất CSV
          </Button>
        </Box>

        {attendanceLogs.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Chưa có dữ liệu điểm danh cho lớp học này
          </Alert>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Buổi học</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Thời gian điểm danh</TableCell>
                  <TableCell>Ghi chú</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceLogs.map((log, index) => (
                  <TableRow key={log._id || index}>
                    <TableCell>
                      Buổi {log.session_id?.session_number || index + 1}
                    </TableCell>
                    <TableCell>
                      {log.session_id?.date
                        ? new Date(log.session_id.date).toLocaleDateString(
                            "vi-VN"
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusChip status={log.status} />
                    </TableCell>
                    <TableCell>
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString("vi-VN")
                        : "N/A"}
                    </TableCell>
                    <TableCell>{log.note || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default StudentAttendancePage;
