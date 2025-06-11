import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  TablePagination,
  Button,
} from "@mui/material";
import {
  CheckCircle,
  Error,
  Info,
  Timeline,
  School,
  FilterList,
  CalendarToday,
  Sort,
  EventBusy,
  EventAvailable,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL;

// Helper function to determine score color
const getScoreColor = (score) => {
  if (score >= 8) return "success.main";
  if (score >= 5) return "warning.main";
  return "error.main";
};

const ScoresPage = () => {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    semester: "",
    searchTerm: "",
    status: "all",
  });
  const [semesters, setSemesters] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    avgAttendance: 0,
    failedClasses: 0,
    perfectClasses: 0,
  });

  useEffect(() => {
    const fetchScores = async () => {
      try {
        setLoading(true);
        setError(null);

        // Lấy dữ liệu điểm danh của sinh viên
        const response = await axios.get(
          `${API_URL}/attendance/student/${user._id}/scores`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          const scoresData = response.data.data || [];
          setScores(scoresData);

          // Tính toán thống kê
          const totalClasses = scoresData.length;
          const avgAttendance =
            scoresData.reduce(
              (sum, score) => sum + (score.attendance_percentage || 0),
              0
            ) / (totalClasses || 1);
          const failedClasses = scoresData.filter(
            (score) => score.is_failed_due_to_absent
          ).length;
          const perfectClasses = scoresData.filter(
            (score) => score.attendance_percentage >= 90
          ).length;

          setStats({
            totalClasses,
            avgAttendance,
            failedClasses,
            perfectClasses,
          });

          // Lấy danh sách học kỳ duy nhất
          const uniqueSemesters = Array.from(
            new Set(
              scoresData
                .map((score) => {
                  const semester = score.class_info?.semester;
                  return semester ? `${semester.name} ${semester.year}` : null;
                })
                .filter(Boolean)
            )
          );
          setSemesters(uniqueSemesters);
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu điểm chuyên cần:", error);
        setError(
          "Không thể tải dữ liệu điểm chuyên cần. Vui lòng thử lại sau."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [user._id, token]);

  // Lọc dữ liệu dựa trên bộ lọc
  const filteredScores = scores.filter((score) => {
    // Lọc theo học kỳ
    if (
      filters.semester &&
      `${score.class_info?.semester?.name} ${score.class_info?.semester?.year}` !==
        filters.semester
    ) {
      return false;
    }

    // Lọc theo tìm kiếm (tên lớp học hoặc tên môn học)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const className = score.class_info?.name?.toLowerCase() || "";
      const subjectName = score.class_info?.subject?.name?.toLowerCase() || "";
      if (
        !className.includes(searchLower) &&
        !subjectName.includes(searchLower)
      ) {
        return false;
      }
    }

    // Lọc theo trạng thái điểm danh
    if (filters.status === "failed" && !score.is_failed_due_to_absent) {
      return false;
    }
    if (filters.status === "passed" && score.is_failed_due_to_absent) {
      return false;
    }
    if (filters.status === "perfect" && score.attendance_percentage < 90) {
      return false;
    }

    return true;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({
      semester: "",
      searchTerm: "",
      status: "all",
    });
    setPage(0);
  };

  // Hiển thị trang loading
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
      >
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2 }}>
          Đang tải dữ liệu điểm chuyên cần...
        </Typography>
      </Box>
    );
  }

  // Hiển thị trang lỗi
  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          startIcon={<Timeline />}
        >
          Tải lại trang
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Điểm Chuyên Cần
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Alert severity="info" sx={{ mb: 3 }}>
        Trang này chỉ hiển thị điểm chuyên cần của các lớp học đã có buổi điểm
        danh. Những lớp học chưa bắt đầu hoặc chưa có buổi điểm danh nào sẽ
        không được hiển thị.
      </Alert>

      {/* Phần thống kê tổng quan */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Tổng số lớp học
              </Typography>
              <Box display="flex" alignItems="center">
                <School sx={{ mr: 1, color: "primary.main", fontSize: 32 }} />
                <Typography variant="h4">{stats.totalClasses}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Tỷ lệ tham gia trung bình
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography
                  variant="h4"
                  color={
                    stats.avgAttendance >= 80
                      ? "success.main"
                      : stats.avgAttendance >= 50
                      ? "warning.main"
                      : "error.main"
                  }
                >
                  {Math.round(stats.avgAttendance)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.avgAttendance}
                color={
                  stats.avgAttendance >= 80
                    ? "success"
                    : stats.avgAttendance >= 50
                    ? "warning"
                    : "error"
                }
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Môn học đạt tỷ lệ cao
              </Typography>
              <Box display="flex" alignItems="center">
                <EventAvailable
                  sx={{ mr: 1, color: "success.main", fontSize: 32 }}
                />
                <Typography variant="h4">{stats.perfectClasses}</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {stats.totalClasses > 0
                  ? `${Math.round(
                      (stats.perfectClasses / stats.totalClasses) * 100
                    )}% lớp học có tỷ lệ >= 90%`
                  : "Chưa có dữ liệu"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: "100%",
              bgcolor:
                stats.failedClasses > 0 ? "error.light" : "background.paper",
            }}
          >
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Môn học nguy cơ cấm thi
              </Typography>
              <Box display="flex" alignItems="center">
                <EventBusy
                  sx={{
                    mr: 1,
                    color:
                      stats.failedClasses > 0 ? "error.main" : "text.secondary",
                    fontSize: 32,
                  }}
                />
                <Typography
                  variant="h4"
                  color={
                    stats.failedClasses > 0 ? "error.main" : "text.primary"
                  }
                >
                  {stats.failedClasses}
                </Typography>
              </Box>
              {stats.failedClasses > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Cần cải thiện ngay
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bộ lọc */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6" sx={{ mb: { xs: 2, md: 0 } }}>
            <FilterList sx={{ mr: 1, verticalAlign: "middle" }} />
            Bộ lọc
          </Typography>
          <Box
            display="flex"
            flexDirection={{ xs: "column", sm: "row" }}
            gap={2}
            width={{ xs: "100%", md: "auto" }}
          >
            <TextField
              label="Tìm kiếm"
              name="searchTerm"
              size="small"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="Tên lớp hoặc môn học"
              sx={{ width: { xs: "100%", sm: 200 } }}
            />

            <FormControl size="small" sx={{ width: { xs: "100%", sm: 200 } }}>
              <InputLabel>Học kỳ</InputLabel>
              <Select
                label="Học kỳ"
                name="semester"
                value={filters.semester}
                onChange={handleFilterChange}
              >
                <MenuItem value="">Tất cả học kỳ</MenuItem>
                {semesters.map((semester) => (
                  <MenuItem key={semester} value={semester}>
                    {semester}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ width: { xs: "100%", sm: 200 } }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                label="Trạng thái"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="passed">Đủ điều kiện</MenuItem>
                <MenuItem value="failed">Cấm thi</MenuItem>
                <MenuItem value="perfect">Xuất sắc (&gt;=90%)</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              size="small"
              onClick={resetFilters}
              sx={{ height: 40 }}
            >
              Đặt lại
            </Button>
          </Box>
        </Box>

        {/* Hiển thị kết quả bộ lọc */}
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="textSecondary">
            {`Hiển thị ${filteredScores.length} kết quả`}
          </Typography>
        </Box>
      </Paper>

      {/* Bảng điểm chuyên cần */}
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Lớp học</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">
                Điểm CC
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">
                Trạng thái CC
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">
                Tiến độ
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">
                Chi tiết
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="right">
                Thao tác
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rowsPerPage > 0
              ? filteredScores.slice(
                  page * rowsPerPage,
                  page * rowsPerPage + rowsPerPage
                )
              : filteredScores
            ).map((score) => (
              <TableRow hover role="checkbox" tabIndex={-1} key={score._id}>
                <TableCell component="th" scope="row">
                  <Typography variant="subtitle2">
                    {score.class_info?.name || "N/A"}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {score.class_info?.subject?.name || "N/A"} (Mã MH:{" "}
                    {score.class_info?.subject?.code || "N/A"})
                  </Typography>
                  <br />
                  <Typography variant="caption" color="textSecondary">
                    GV: {score.class_info?.teacher?.name || "N/A"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="h6"
                    color={getScoreColor(score.attendance_score)}
                  >
                    {score.attendance_score} / 10
                  </Typography>
                  <Tooltip
                    title={score.attendance_calculation || score.score_formula}
                  >
                    <Info
                      fontSize="inherit"
                      sx={{
                        verticalAlign: "middle",
                        ml: 0.5,
                        cursor: "help",
                        opacity: 0.7,
                      }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={score.attendance_status}
                    color={score.is_failed_due_to_absent ? "error" : "success"}
                    size="small"
                    icon={
                      score.is_failed_due_to_absent ? (
                        <Error />
                      ) : (
                        <CheckCircle />
                      )
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip
                    title={`Đã hoàn thành ${score.completed_sessions} / ${score.total_planned_sessions} buổi dự kiến`}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Box sx={{ width: "100%", mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={score.course_progress || 0}
                        />
                      </Box>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >{`${Math.round(
                          score.course_progress || 0
                        )}%`}</Typography>
                      </Box>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={0.5}
                  >
                    <Chip
                      icon={<EventAvailable />}
                      label={`${score.attended_sessions} có mặt (${score.attendance_percentage}%)`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      icon={<EventBusy />}
                      label={`${score.absent_sessions} vắng`}
                      size="small"
                      color={score.absent_sessions > 0 ? "error" : "default"}
                      variant="outlined"
                    />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Timeline />}
                    onClick={() => {
                      // Sử dụng trực tiếp score.teaching_class_id vì nó đã là string ID từ backend
                      const teachingClassId = score.teaching_class_id;
                      if (teachingClassId) {
                        navigate(`/student/attendance/${teachingClassId}`);
                      } else {
                        console.error(
                          "Không tìm thấy ID lớp học (teaching_class_id) trong score object:",
                          score
                        );
                        // TODO: Có thể thêm thông báo cho người dùng ở đây bằng enqueueSnackbar nếu cần
                      }
                    }}
                  >
                    Xem Log
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredScores.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số hàng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} trên ${count}`
          }
        />
      </TableContainer>
    </Box>
  );
};

export default ScoresPage;
