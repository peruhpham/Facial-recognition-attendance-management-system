import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Stack,
  LinearProgress,
  Tooltip,
  IconButton,
  CardActions,
  CardMedia,
  CardHeader,
  Avatar,
  Alert,
} from "@mui/material";
import {
  Search,
  School,
  CalendarToday,
  AccessTime,
  VerifiedUser,
  Warning,
  Visibility,
  Person,
  Face,
  Book,
  Class,
  Info,
  BarChart,
  Clear,
} from "@mui/icons-material";

// Import studentService
import studentService from "../../services/studentService";

const API_URL = process.env.REACT_APP_API_URL;
// Thời gian chờ debounce (ms)
const DEBOUNCE_DELAY = 500;

const StudentClassesPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // State cho tìm kiếm và lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  // State cho thông tin đăng ký khuôn mặt
  const [faceRegistrationStatus, setFaceRegistrationStatus] = useState(false);
  const debounceTimeoutRef = useRef(null); // Ref cho debounce timeout

  // Load dữ liệu ban đầu
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // Kiểm tra trạng thái đăng ký khuôn mặt
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setFaceRegistrationStatus(
          userResponse.data.data.faceFeatures?.descriptors?.length > 0 || false
        );

        // Load các học kỳ - Lấy tất cả không phân trang
        const semestersResponse = await axios.get(`${API_URL}/semesters`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 1000 }, // Tăng giới hạn để lấy nhiều học kỳ hơn
        });
        setSemesters(semestersResponse.data.data || []);

        // Load lớp học theo mặc định
        await fetchClasses(debouncedSearchTerm, semester, academicYear);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [token, enqueueSnackbar, user._id]);

  // Effect cho debounce search term
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);
    return () => {
      clearTimeout(debounceTimeoutRef.current);
    };
  }, [searchTerm]);

  // Effect để fetch lại classes khi debouncedSearchTerm hoặc filter thay đổi
  useEffect(() => {
    fetchClasses(debouncedSearchTerm, semester, academicYear);
  }, [debouncedSearchTerm, semester, academicYear]);

  // Tải danh sách lớp học sử dụng service
  const fetchClasses = async (currentSearch, currentSemester, currentYear) => {
    try {
      setIsLoading(true);
      const options = {
        search: currentSearch,
        semester: currentSemester,
        academicYear: currentYear,
        skipCache: true,
      };
      const response = await studentService.getStudentClasses(
        user._id,
        token,
        options
      );
      if (!response.success) {
        enqueueSnackbar(response.error, { variant: "error" });
        setClasses([]);
        return;
      }
      const classesData = response.data || [];
      setClasses(classesData);
      if (classesData.length > 0) {
        const statsPromises = classesData.map((classItem) =>
          studentService.getAttendanceStats(user._id, classItem._id, token)
        );
        const statsResults = await Promise.all(statsPromises);
        const statsMap = {};
        statsResults.forEach((result, index) => {
          if (result.success && classesData[index]) {
            statsMap[classesData[index]._id] = result.data.stats;
          }
        });
        setAttendanceStats(statsMap);
      } else {
        setAttendanceStats({});
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp học:", error);
      enqueueSnackbar("Lỗi khi tải danh sách lớp học", { variant: "error" });
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý thay đổi input tìm kiếm
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Xóa tìm kiếm
  const clearSearch = () => {
    setSearchTerm("");
  };

  // Xử lý thay đổi bộ lọc học kỳ
  const handleSemesterChange = (event) => {
    setSemester(event.target.value);
  };

  // Xử lý thay đổi bộ lọc năm học
  const handleYearChange = (event) => {
    setAcademicYear(event.target.value);
    setSemester(""); // Reset học kỳ khi đổi năm học
  };

  // Xem chi tiết điểm danh của lớp học
  const handleViewAttendance = (classId) => {
    navigate(`/student/attendance/${classId}`);
  };

  // Đăng ký khuôn mặt
  const handleRegisterFace = () => {
    navigate("/register-face");
  };

  // Lấy danh sách năm học từ danh sách học kỳ
  const getAcademicYears = () => {
    const years = new Set();
    semesters.forEach((semester) => {
      if (semester.academic_year) {
        years.add(semester.academic_year);
      }
    });
    return Array.from(years).sort().reverse();
  };

  // Hiển thị trạng thái lớp học
  const renderClassStatus = (classItem) => {
    // Sử dụng status đã tính toán từ backend
    switch (classItem.status) {
      case "chưa bắt đầu":
        return <Chip label="Chưa bắt đầu" color="info" size="small" />;
      case "đang học":
        return <Chip label="Đang học" color="success" size="small" />;
      case "đã kết thúc":
        return <Chip label="Đã kết thúc" color="secondary" size="small" />;
      default:
        return <Chip label="Không xác định" color="default" size="small" />;
    }
  };

  // Render Card cho một lớp học
  const renderClassCard = (classItem) => {
    const stats = attendanceStats[classItem._id] || {
      total: 0,
      present: 0,
      absent: 0,
      attendanceRate: 0,
    };

    // Tính toán các giá trị phụ trợ cho card cũ
    const totalPlannedSessions = classItem.total_sessions || "?"; // Lấy từ classItem
    const presentPercentage =
      stats.total > 0 ? (stats.present / stats.total) * 100 : 0;

    // Giả định studentService có các hàm này (cần kiểm tra)
    let attendanceStatus = { status: "default", message: "Chưa có dữ liệu" };
    let attendanceScore = "N/A";
    try {
      if (stats.total > 0) {
        // Cần đảm bảo hàm này tồn tại và nhận đúng tham số
        attendanceStatus = studentService.getAttendanceStatus(stats);
        // Cần đảm bảo hàm này tồn tại và nhận đúng tham số
        attendanceScore = studentService.calculateAttendanceScore(stats.absent);
      }
    } catch (e) {
      console.error("Lỗi khi tính toán trạng thái/điểm từ service:", e);
      // Sử dụng giá trị mặc định nếu có lỗi
    }

    return (
      <Card
        elevation={2} // Quay lại elevation cũ
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: 3, // Giữ lại hiệu ứng hover nếu muốn
          transition: "box-shadow 0.3s ease-in-out",
          "&:hover": {
            boxShadow: 6,
          },
        }}
      >
        <CardHeader
          avatar={
            // Quay lại avatar cũ
            <Avatar sx={{ bgcolor: "primary.light" }}>
              <School />
            </Avatar>
          }
          title={classItem.class_name} // Tiêu đề đơn giản
          subheader={`${classItem.subject_id?.name || "Không rõ môn"} (${
            classItem.subject_id?.code || "N/A"
          })`} // Subheader cũ
          action={renderClassStatus(classItem)} // Giữ lại status chip
          // sx={{ pb: 0 }} // Bỏ padding bottom nếu cần
        />
        <Divider /> {/* Thêm divider */}
        <CardContent sx={{ flexGrow: 1 }}>
          <Stack spacing={1.5}>
            {" "}
            {/* Layout Stack cũ */}
            <Box display="flex" alignItems="center">
              <Book sx={{ mr: 1, fontSize: 18, color: "primary.main" }} />
              <Typography variant="body2">
                {classItem.semester_id?.name || "Không rõ học kỳ"}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Person sx={{ mr: 1, fontSize: 18, color: "primary.main" }} />
              <Typography variant="body2">
                GV: {classItem.teacher_id?.full_name || "Không rõ GV"}
              </Typography>
            </Box>
            <Divider />
            <Typography variant="subtitle2" gutterBottom>
              Thông tin điểm danh:
            </Typography>
            <Stack spacing={1}>
              <Box>
                <Typography
                  variant="body2"
                  display="flex"
                  justifyContent="space-between"
                >
                  <span>Buổi đã học:</span>
                  <span>
                    {stats.total} / {totalPlannedSessions}
                  </span>
                </Typography>
              </Box>

              {stats.total > 0 ? (
                <>
                  <Box>
                    <Typography
                      variant="body2"
                      display="flex"
                      justifyContent="space-between"
                    >
                      <span>Tham gia:</span>
                      <span>
                        {stats.present} buổi ({Math.round(presentPercentage)}%)
                      </span>
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="body2"
                      display="flex"
                      justifyContent="space-between"
                      color={stats.absent > 0 ? "error.main" : "text.secondary"}
                    >
                      <span>Vắng mặt:</span>
                      <span>{stats.absent} buổi</span>
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Tỷ lệ tham gia:
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.attendanceRate || 0}
                      color={attendanceStatus.status || "default"} // Fallback
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Box display="flex" justifyContent="space-between" mt={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        {attendanceStatus.message || ""} {/* Fallback */}
                      </Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {Math.round(stats.attendanceRate || 0)}%
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ py: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    Chưa có dữ liệu điểm danh
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>
        </CardContent>
        <CardActions>
          <Box display="flex" justifyContent="space-between" width="100%">
            <Button
              size="small"
              color="primary" // Màu nút cũ
              startIcon={<Visibility />} // Icon cũ
              onClick={() => handleViewAttendance(classItem._id)}
            >
              Xem điểm danh
            </Button>

            {stats.total > 0 && (
              <Chip
                label={`Điểm: ${attendanceScore}`}
                color={
                  attendanceScore === "N/A"
                    ? "default"
                    : attendanceScore >= 8
                    ? "success"
                    : attendanceScore >= 5
                    ? "warning"
                    : "error"
                }
                size="small"
              />
            )}
          </Box>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Danh sách lớp học
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {!faceRegistrationStatus && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleRegisterFace}
              startIcon={<Face />}
            >
              Đăng ký ngay
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Bạn chưa đăng ký khuôn mặt. Vui lòng đăng ký để sử dụng chức năng điểm
          danh bằng khuôn mặt.
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Tìm kiếm lớp học"
              placeholder="Tên lớp, môn học, giảng viên..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {searchTerm && (
                      <IconButton
                        aria-label="clear search"
                        onClick={clearSearch}
                        edge="end"
                        size="small"
                      >
                        <Clear />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Năm học</InputLabel>
              <Select
                value={academicYear}
                label="Năm học"
                onChange={handleYearChange}
              >
                <MenuItem value="">Tất cả năm học</MenuItem>
                {getAcademicYears().map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Học kỳ</InputLabel>
              <Select
                value={semester}
                label="Học kỳ"
                onChange={handleSemesterChange}
                disabled={!academicYear} // Chỉ cho chọn kỳ khi đã chọn năm
              >
                <MenuItem value="">Tất cả học kỳ</MenuItem>
                {semesters
                  .filter(
                    (s) => !academicYear || s.academic_year === academicYear
                  )
                  .map((sem) => (
                    <MenuItem key={sem._id} value={sem._id}>
                      {sem.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Hiển thị danh sách lớp học */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      ) : classes.length === 0 ? (
        <Typography align="center" my={5}>
          Không tìm thấy lớp học nào phù hợp.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {classes.map((classItem) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={classItem._id}>
              {renderClassCard(classItem)}
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default StudentClassesPage;
