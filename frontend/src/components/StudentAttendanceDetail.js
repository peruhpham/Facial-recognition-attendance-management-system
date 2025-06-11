import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  TextField,
  Alert,
  CircularProgress,
  Badge,
} from "@mui/material";
import {
  Close,
  Person,
  Class,
  CheckCircle,
  Cancel,
  AccessTime,
  EventBusy,
  Edit,
  Save,
  Block,
  Warning,
} from "@mui/icons-material";
import axios from "axios";
import { useSelector } from "react-redux";

const API_URL = process.env.REACT_APP_API_URL;

const StudentAttendanceDetail = ({
  open,
  onClose,
  studentId,
  classId,
  studentName,
}) => {
  const { token } = useSelector((state) => state.auth);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({ status: "", note: "" });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open && studentId && classId) {
      fetchAttendanceDetail();
    }
  }, [open, studentId, classId]);

  const fetchAttendanceDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/classes/teaching/${classId}/students/${studentId}/attendance-detail`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAttendanceData(response.data.data);
    } catch (err) {
      console.error("Error fetching attendance detail:", err);
      setError(err.response?.data?.message || "Lỗi khi tải dữ liệu điểm danh");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session.session_id);
    setEditForm({
      status: session.attendance_status,
      note: session.note || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
    setEditForm({ status: "", note: "" });
  };

  const handleUpdateAttendance = async (sessionId) => {
    try {
      setUpdating(true);

      await axios.put(
        `${API_URL}/classes/teaching/${classId}/sessions/${sessionId}/attendance/${studentId}`,
        {
          status: editForm.status,
          note: editForm.note,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await fetchAttendanceDetail();
      setEditingSession(null);
      setEditForm({ status: "", note: "" });
    } catch (err) {
      console.error("Error updating attendance:", err);
      setError(err.response?.data?.message || "Lỗi khi cập nhật điểm danh");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle color="success" />;
      case "late":
        return <AccessTime color="warning" />;
      case "absent":
        return <Cancel color="error" />;
      case "excused":
        return <EventBusy color="info" />;
      default:
        return <Block color="disabled" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "present":
        return "Có mặt";
      case "late":
        return "Muộn";
      case "absent":
        return "Vắng";
      case "excused":
        return "Có phép";
      default:
        return "Chưa xác định";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "success";
      case "late":
        return "warning";
      case "absent":
        return "error";
      case "excused":
        return "info";
      default:
        return "default";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: "70vh" },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Person sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" fontWeight="bold">
              Chi tiết điểm danh - {studentName || "Sinh viên"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : attendanceData ? (
          <Box>
            {/* Thông tin sinh viên và lớp học */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar
                        src={attendanceData.student.avatar_url}
                        sx={{ width: 48, height: 48, mr: 2 }}
                      >
                        {attendanceData.student.full_name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {attendanceData.student.full_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          MSSV: {attendanceData.student.student_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {attendanceData.student.email}
                        </Typography>
                      </Box>
                    </Box>
                    {attendanceData.student.class_info && (
                      <Typography variant="body2" color="text.secondary">
                        Lớp: {attendanceData.student.class_info.name} (
                        {attendanceData.student.class_info.class_code})
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Class sx={{ mr: 2, color: "primary.main" }} />
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {attendanceData.class.class_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {attendanceData.class.subject?.name} (
                          {attendanceData.class.subject?.code})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          GV: {attendanceData.class.teacher?.full_name}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Thống kê tổng quan */}
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  📊 Tổng quan điểm danh
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography
                        variant="h4"
                        color="primary"
                        fontWeight="bold"
                      >
                        {attendanceData.attendance_summary.present_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Có mặt
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error" fontWeight="bold">
                        {attendanceData.attendance_summary.absent_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vắng mặt
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography
                        variant="h4"
                        color="warning.main"
                        fontWeight="bold"
                      >
                        {attendanceData.attendance_summary.late_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Muộn
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography
                        variant="h4"
                        color="info.main"
                        fontWeight="bold"
                      >
                        {attendanceData.attendance_summary.excused_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Có phép
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Tỷ lệ tham gia:{" "}
                        {attendanceData.attendance_summary.attendance_rate}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={
                          attendanceData.attendance_summary.attendance_rate
                        }
                        sx={{ height: 8, borderRadius: 4 }}
                        color={
                          attendanceData.attendance_summary.attendance_rate >=
                          80
                            ? "success"
                            : attendanceData.attendance_summary
                                .attendance_rate >= 60
                            ? "warning"
                            : "error"
                        }
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          Điểm chuyên cần:{" "}
                          {attendanceData.attendance_summary.attendance_score}
                          /10
                        </Typography>
                        {attendanceData.attendance_summary
                          .is_failed_due_to_absent && (
                          <Chip
                            icon={<Warning />}
                            label="Hỏng môn do vắng"
                            color="error"
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Bảng chi tiết điểm danh */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  📋 Chi tiết từng buổi học
                </Typography>

                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>Buổi</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Ngày</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Giờ</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Phòng</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Trạng thái buổi
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Điểm danh
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Ghi chú
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }} align="center">
                          Thao tác
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.attendance_details.map((detail) => (
                        <TableRow key={detail.session_id} hover>
                          <TableCell>
                            <Badge
                              badgeContent={detail.session_number}
                              color="primary"
                              sx={{
                                "& .MuiBadge-badge": {
                                  position: "static",
                                  transform: "none",
                                  fontWeight: "bold",
                                },
                              }}
                            >
                              <Typography variant="body2" sx={{ ml: 2 }}>
                                Buổi
                              </Typography>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(detail.date)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatTime(detail.start_time)} -{" "}
                              {formatTime(detail.end_time)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {detail.room?.room_number || "TBA"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                detail.session_status === "completed"
                                  ? "Hoàn thành"
                                  : detail.session_status === "in_progress"
                                  ? "Đang diễn ra"
                                  : detail.session_status === "cancelled"
                                  ? "Đã hủy"
                                  : "Chưa bắt đầu"
                              }
                              color={
                                detail.session_status === "completed"
                                  ? "success"
                                  : detail.session_status === "in_progress"
                                  ? "warning"
                                  : detail.session_status === "cancelled"
                                  ? "error"
                                  : "default"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {editingSession === detail.session_id ? (
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={editForm.status}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      status: e.target.value,
                                    })
                                  }
                                >
                                  <MenuItem value="present">Có mặt</MenuItem>
                                  <MenuItem value="absent">Vắng</MenuItem>
                                  <MenuItem value="late">Muộn</MenuItem>
                                  <MenuItem value="excused">Có phép</MenuItem>
                                </Select>
                              </FormControl>
                            ) : (
                              <Box display="flex" alignItems="center">
                                {getStatusIcon(detail.attendance_status)}
                                <Chip
                                  label={getStatusText(
                                    detail.attendance_status
                                  )}
                                  color={getStatusColor(
                                    detail.attendance_status
                                  )}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingSession === detail.session_id ? (
                              <TextField
                                size="small"
                                placeholder="Ghi chú..."
                                value={editForm.note}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    note: e.target.value,
                                  })
                                }
                                sx={{ minWidth: 120 }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {detail.note || "-"}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {detail.can_mark_attendance &&
                              (editingSession === detail.session_id ? (
                                <Box>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                      handleUpdateAttendance(detail.session_id)
                                    }
                                    disabled={updating}
                                  >
                                    <Save />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={handleCancelEdit}
                                    disabled={updating}
                                  >
                                    <Close />
                                  </IconButton>
                                </Box>
                              ) : (
                                <Tooltip title="Chỉnh sửa điểm danh">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditSession(detail)}
                                  >
                                    <Edit />
                                  </IconButton>
                                </Tooltip>
                              ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentAttendanceDetail;
