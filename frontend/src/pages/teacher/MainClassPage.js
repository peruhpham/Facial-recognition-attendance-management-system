import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Badge,
  Skeleton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  AlertTitle,
  InputAdornment,
  DialogContentText,
  CardHeader,
  ListItemIcon,
} from "@mui/material";
import {
  Check,
  Close,
  PersonAdd,
  PersonRemove,
  School,
  Info,
  Warning,
  AccessTime,
  Error,
  CheckCircle,
  HourglassEmpty,
  SwapHoriz,
  Class,
  Refresh,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add,
  Cancel,
  Face,
  Person,
  LockPerson,
  SentimentDissatisfied as NoFace,
  Edit,
  DeleteForever,
  Group,
  Business,
  HelpOutline,
  Assessment,
  FileDownload,
  TableChart,
} from "@mui/icons-material";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckIcon from "@mui/icons-material/Check";
import NoDataSvg from "../../components/NoDataSvg";
import MainClassStatistics from "../../components/MainClassStatistics";

const API_URL = process.env.REACT_APP_API_URL;

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherMainClassPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [mainClass, setMainClass] = useState(null);
  const [mainClasses, setMainClasses] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    studentId: null,
    reason: "",
  });

  // State for confirming student deletion from main class
  const [confirmDeleteStudentDialog, setConfirmDeleteStudentDialog] = useState({
    open: false,
    student: null,
  });

  // State for confirming main class deletion
  const [confirmDeleteMainClassDialog, setConfirmDeleteMainClassDialog] =
    useState({
      open: false,
    });

  // States cho modal chi tiết sinh viên
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openStudentDetail, setOpenStudentDetail] = useState(false);

  // States cho modal thêm lớp chính
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [newClass, setNewClass] = useState({
    name: "",
    class_code: "",
    selected_department_id: "",
    major_id: "",
    advisor_id: user?._id || "",
    students: [],
    year_start: new Date().getFullYear(),
    year_end: new Date().getFullYear() + 4,
  });
  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [majorsForSelectedDept, setMajorsForSelectedDept] = useState([]);
  const [isLoadingMajors, setIsLoadingMajors] = useState(false);

  // Phân trang
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Thêm state cho tìm kiếm sinh viên
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [approvedSearchTerm, setApprovedSearchTerm] = useState("");

  // Thêm state cho tổng số sinh viên đã duyệt
  const [totalApproved, setTotalApproved] = useState(0);

  // States cho modal chỉnh sửa lớp chính
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [editClassData, setEditClassData] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  useEffect(() => {
    fetchMainClasses();
    fetchDepartments();
  }, [token]);

  // Effect để tự động tìm kiếm khi searchTerm hoặc pagination thay đổi
  useEffect(() => {
    if (mainClass) {
      fetchApprovedStudents(mainClass._id);
    }
  }, [approvedSearchTerm, page, rowsPerPage, mainClass?._id]);

  // Lấy danh sách các lớp chính mà giảng viên được phân công làm cố vấn
  const fetchMainClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Lấy danh sách lớp được phân công cố vấn
      // Thử lại endpoint với query parameter advisor_id, bỏ all=true
      const response = await axios.get(
        `${API_URL}/classes/main?advisor_id=${user._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        const classes = response.data.data;
        setMainClasses(classes);

        // Lấy lớp đầu tiên làm mặc định
        const classData = classes[0];
        setMainClass(classData);

        // Lấy danh sách sinh viên chờ duyệt và đã duyệt
        await fetchPendingStudents(classData._id);
        await fetchApprovedStudents(classData._id);
      } else {
        // enqueueSnackbar("Bạn chưa được phân công làm cố vấn cho lớp nào", {
        //   variant: "info",
        // });
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu lớp chính:", error);
      setError("Không thể tải thông tin lớp chính. Vui lòng thử lại sau.");
      // enqueueSnackbar("Lỗi khi tải dữ liệu lớp chính", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  // Lấy sinh viên đang chờ duyệt
  const fetchPendingStudents = async (mainClassId) => {
    setIsLoadingPending(true);
    try {
      const response = await axios.get(
        `${API_URL}/classes/main/${mainClassId}/pending-students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPendingStudents(response.data.data || []);
    } catch (error) {
      const errorMessage = error.response
        ? error.response.status === 403
          ? "Bạn không có quyền xem danh sách sinh viên chờ duyệt"
          : error.response.status === 404
          ? "Không tìm thấy lớp học"
          : "Lỗi khi tải danh sách sinh viên chờ duyệt"
        : "Lỗi kết nối đến máy chủ";

      // enqueueSnackbar(
      //   <div>
      //     {errorMessage}
      //     {!error.response && (
      //       <Button
      //         size="small"
      //         onClick={() => fetchPendingStudents(mainClassId)}
      //         sx={{ mt: 1, display: "block" }}
      //         variant="outlined"
      //       >
      //         Thử lại
      //       </Button>
      //     )}
      //   </div>
      // );
      console.error("Error fetching pending students:", error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  // Lấy sinh viên đã được duyệt
  const fetchApprovedStudents = async (classId) => {
    try {
      setIsLoadingApproved(true);

      const response = await axios.get(
        `${API_URL}/classes/main/${classId}/approved-students`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            search: approvedSearchTerm,
            page: page + 1,
            limit: rowsPerPage,
            sort: "full_name",
          },
        }
      );

      setApprovedStudents(response.data.data?.students || []);
      setTotalApproved(response.data.data?.total || 0);
    } catch (error) {
      console.error("Lỗi khi tải danh sách sinh viên đã duyệt:", error);

      let errorMessage = "Lỗi khi tải danh sách sinh viên đã duyệt";

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }

      // enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // Lấy danh sách khoa
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách khoa:", error);
      // enqueueSnackbar("Không thể tải danh sách khoa", { variant: "error" });
    }
  };

  // Xử lý thay đổi tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Xử lý thay đổi trang
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Xử lý thay đổi số dòng mỗi trang
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Phê duyệt sinh viên
  const handleApproveStudent = async (studentId) => {
    try {
      await axios.put(
        `${API_URL}/classes/main/${mainClass._id}/approve-student/${studentId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // enqueueSnackbar("Phê duyệt sinh viên thành công", { variant: "success" });

      // Cập nhật lại danh sách
      await fetchPendingStudents(mainClass._id);
      await fetchApprovedStudents(mainClass._id);
    } catch (error) {
      console.error("Lỗi khi phê duyệt sinh viên:", error);
      // enqueueSnackbar(
      //   error.response?.data?.message || "Lỗi khi phê duyệt sinh viên",
      //   { variant: "error" }
      // );
    }
  };

  // Mở dialog từ chối sinh viên
  const openRejectDialog = (studentId) => {
    setRejectDialog({
      open: true,
      studentId,
      reason: "",
    });
  };

  // Đóng dialog từ chối sinh viên
  const closeRejectDialog = () => {
    setRejectDialog({
      open: false,
      studentId: null,
      reason: "",
    });
  };

  // Từ chối sinh viên
  const handleRejectStudent = async () => {
    try {
      await axios.put(
        `${API_URL}/classes/main/${mainClass._id}/reject-student/${rejectDialog.studentId}`,
        { reason: rejectDialog.reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // enqueueSnackbar("Đã từ chối sinh viên", { variant: "success" });
      closeRejectDialog();

      // Cập nhật lại danh sách
      await fetchPendingStudents(mainClass._id);
    } catch (error) {
      console.error("Lỗi khi từ chối sinh viên:", error);
      // enqueueSnackbar(
      //   error.response?.data?.message || "Lỗi khi từ chối sinh viên",
      //   { variant: "error" }
      // );
    }
  };

  // Xử lý khi thay đổi lớp
  const handleChangeClass = (event) => {
    const selectedClassId = event.target.value;
    const selectedClass = mainClasses.find(
      (cls) => cls._id === selectedClassId
    );

    if (selectedClass) {
      setMainClass(selectedClass);
      setPendingStudents([]);
      setApprovedStudents([]);
      setPage(0);
      fetchPendingStudents(selectedClassId);
      fetchApprovedStudents(selectedClassId);
    }
  };

  // Render thông tin lớp
  const renderClassInfo = () => {
    if (!mainClass) return null;

    return (
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <Class />
            </Avatar>
          }
          titleTypographyProps={{ variant: "h6", fontWeight: "bold" }}
          title={`Lớp Chủ Nhiệm: ${mainClass.name}`}
          subheader={`Mã: ${mainClass.class_code}`}
          action={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Edit />}
                onClick={handleOpenEditClassDialog}
              >
                Chỉnh sửa
              </Button>
              {user &&
                mainClass &&
                mainClass.advisor_id &&
                user._id ===
                  (typeof mainClass.advisor_id === "string"
                    ? mainClass.advisor_id
                    : mainClass.advisor_id._id) && (
                  <Tooltip title="Xóa Lớp Chủ Nhiệm Này">
                    <IconButton
                      color="error"
                      onClick={handleOpenConfirmDeleteMainClassDialog}
                      size="small"
                    >
                      <DeleteForever />
                    </IconButton>
                  </Tooltip>
                )}
            </Box>
          }
          sx={{ borderBottom: 1, borderColor: "divider" }}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontWeight: "medium", color: "text.secondary" }}
              >
                Thông tin chi tiết
              </Typography>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <InfoIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Tên lớp:" secondary={mainClass.name} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <InfoIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Mã lớp:"
                    secondary={mainClass.class_code}
                  />
                </ListItem>
                {mainClass.major_id && (
                  <>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <School fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Ngành:"
                        secondary={
                          mainClass.major_id.name
                            ? `${mainClass.major_id.name} (${
                                mainClass.major_id.code || "N/A"
                              })`
                            : "N/A"
                        }
                      />
                    </ListItem>
                    {mainClass.major_id.department_id && (
                      <ListItem disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Business sx={{ fontSize: "1.25rem" }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Khoa:"
                          secondary={
                            mainClass.major_id.department_id.name
                              ? `${mainClass.major_id.department_id.name} (${
                                  mainClass.major_id.department_id.code || "N/A"
                                })`
                              : "N/A"
                          }
                        />
                      </ListItem>
                    )}
                  </>
                )}
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <AccessTime fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Năm bắt đầu:"
                    secondary={mainClass.year_start || "Chưa cập nhật"}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <AccessTime fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Năm kết thúc:"
                    secondary={mainClass.year_end || "Chưa cập nhật"}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Group fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tổng số sinh viên:"
                    secondary={
                      <Chip
                        label={mainClass.students?.length || 0}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: "bold" }}
                      />
                    }
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ fontWeight: "medium", color: "text.secondary" }}
              >
                Giáo viên cố vấn
              </Typography>
              {mainClass.advisor_id ? (
                <List dense disablePadding>
                  <ListItem disableGutters alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "secondary.main" }}>
                        {mainClass.advisor_id.full_name?.charAt(0) || "GV"}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={mainClass.advisor_id.full_name}
                      secondary={mainClass.advisor_id.email}
                      primaryTypographyProps={{ fontWeight: "medium" }}
                    />
                  </ListItem>
                  <ListItem disableGutters sx={{ pl: 7 }}>
                    {" "}
                    {/* Align with text of avatar list item */}
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: 16 }} />}
                      label="Cố vấn hiện tại"
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  </ListItem>
                </List>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: "text.secondary",
                    mt: 1,
                  }}
                >
                  <Warning sx={{ mr: 1, color: "warning.main" }} />
                  <Typography variant="body2">
                    Chưa có giáo viên cố vấn.
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Xem chi tiết sinh viên
  const handleViewStudent = (studentIdOrObject) => {
    if (typeof studentIdOrObject === "string") {
      navigate(`/profile/${studentIdOrObject}`);
    } else if (studentIdOrObject && studentIdOrObject._id) {
      setSelectedStudent(studentIdOrObject);
      setOpenStudentDetail(true);
    }
  };

  // Render khi đang tải dữ liệu
  const renderLoadingState = () => (
    <Box sx={{ p: 3 }}>
      <Skeleton
        variant="rectangular"
        width="100%"
        height={100}
        sx={{ mb: 2 }}
      />
      <Skeleton variant="rectangular" width="100%" height={400} />
    </Box>
  );

  // Làm mới toàn bộ dữ liệu
  const refreshAllData = async () => {
    if (mainClass) {
      setIsLoadingPending(true);
      setIsLoadingApproved(true);
      await fetchPendingStudents(mainClass._id);
      await fetchApprovedStudents(mainClass._id);
      setIsLoadingPending(false);
      setIsLoadingApproved(false);
    }
  };

  // Xuất danh sách sinh viên ra Excel
  const handleExportStudents = async (type) => {
    try {
      const response = await axios.get(
        `${API_URL}/classes/main/${mainClass._id}/export-students?type=${type}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Tạo file Excel từ dữ liệu
        const { headerInfo, students, filename } = response.data.data;

        // Sử dụng thư viện XLSX để tạo file Excel
        const XLSX = require("xlsx");
        const wb = XLSX.utils.book_new();

        // Tạo sheet với thông tin header
        const headerData = Object.entries(headerInfo).map(([key, value]) => [
          key,
          value,
        ]);
        const wsHeader = XLSX.utils.aoa_to_sheet([
          ["THÔNG TIN LỚP HỌC"],
          [],
          ...headerData,
          [],
          ["DANH SÁCH SINH VIÊN"],
          [],
        ]);

        // Tạo sheet với dữ liệu sinh viên
        const wsData = XLSX.utils.json_to_sheet(students);

        // Thêm sheets vào workbook
        XLSX.utils.book_append_sheet(wb, wsHeader, "Thông tin");
        XLSX.utils.book_append_sheet(wb, wsData, "Danh sách sinh viên");

        // Tải file
        XLSX.writeFile(wb, filename);

        // enqueueSnackbar("Xuất file Excel thành công!", { variant: "success" });
      }
    } catch (error) {
      console.error("Lỗi khi xuất file Excel:", error);
      // enqueueSnackbar("Lỗi khi xuất file Excel", { variant: "error" });

      // Fallback: tạo CSV đơn giản
      try {
        const response = await axios.get(
          `${API_URL}/classes/main/${mainClass._id}/export-students?type=${type}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          const { students } = response.data.data;
          const csvContent = [
            Object.keys(students[0]).join(","),
            ...students.map((student) => Object.values(student).join(",")),
          ].join("\n");

          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const link = document.createElement("a");
          if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
              "download",
              `DanhSachSinhVien_${type}_${Date.now()}.csv`
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } catch (csvError) {
        console.error("Lỗi khi tạo CSV:", csvError);
      }
    }
  };

  // Render khi có lỗi
  const renderErrorStateJSX = () => (
    <Box sx={{ p: 3, mt: 2 /* Thêm khoảng cách từ header */ }}>
      <Alert
        severity="error"
        sx={{ mb: 2 }}
        action={
          <Button color="inherit" size="small" onClick={fetchMainClasses}>
            Thử lại
          </Button>
        }
      >
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          Lỗi khi tải dữ liệu
        </Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate("/teacher/dashboard")}
        startIcon={<School />}
      >
        Quay lại trang chủ
      </Button>
    </Box>
  );

  // Hàm lọc sinh viên theo từ khóa tìm kiếm
  const filteredPendingStudents = pendingStudents.filter(
    (student) =>
      student.full_name
        ?.toLowerCase()
        .includes(pendingSearchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(pendingSearchTerm.toLowerCase()) ||
      student.school_info?.student_id
        ?.toLowerCase()
        .includes(pendingSearchTerm.toLowerCase()) ||
      student.school_info?.class_id?.name
        ?.toLowerCase()
        .includes(pendingSearchTerm.toLowerCase()) ||
      student.school_info?.class_id?.major_id?.name
        ?.toLowerCase()
        .includes(pendingSearchTerm.toLowerCase()) ||
      student.contact?.phone
        ?.toLowerCase()
        .includes(pendingSearchTerm.toLowerCase())
  );

  const filteredApprovedStudents = approvedStudents.filter(
    (student) =>
      student.full_name
        ?.toLowerCase()
        .includes(approvedSearchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(approvedSearchTerm.toLowerCase()) ||
      student.school_info?.student_id
        ?.toLowerCase()
        .includes(approvedSearchTerm.toLowerCase()) ||
      student.school_info?.class_id?.name
        ?.toLowerCase()
        .includes(approvedSearchTerm.toLowerCase()) ||
      student.school_info?.class_id?.major_id?.name
        ?.toLowerCase()
        .includes(approvedSearchTerm.toLowerCase()) ||
      student.contact?.phone
        ?.toLowerCase()
        .includes(approvedSearchTerm.toLowerCase())
  );

  // Mở dialog thêm lớp chính
  const handleOpenAddClassDialog = () => {
    setOpenAddClassDialog(true);
  };

  // Đóng dialog thêm lớp chính
  const handleCloseAddClassDialog = () => {
    setOpenAddClassDialog(false);
    setNewClass({
      name: "",
      class_code: "",
      selected_department_id: "",
      major_id: "",
      advisor_id: user?._id || "",
      students: [],
      year_start: new Date().getFullYear(),
      year_end: new Date().getFullYear() + 4,
    });
    setMajorsForSelectedDept([]);
  };

  // Xử lý thay đổi thông tin lớp mới
  const handleNewClassChange = async (e) => {
    const { name, value } = e.target;
    setNewClass((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "selected_department_id") {
      setNewClass((prev) => ({ ...prev, major_id: "" }));
      setMajorsForSelectedDept([]);
      if (value) {
        setIsLoadingMajors(true);
        try {
          const response = await axios.get(
            `${API_URL}/majors?department_id=${value}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setMajorsForSelectedDept(response.data.data || []);
        } catch (err) {
          console.error("Failed to fetch majors:", err);
          enqueueSnackbar(
            "Không thể tải danh sách ngành học cho khoa đã chọn.",
            { variant: "error" }
          );
          setMajorsForSelectedDept([]);
        } finally {
          setIsLoadingMajors(false);
        }
      }
    }
  };

  // Xử lý tạo lớp chính mới
  const handleCreateMainClass = async () => {
    try {
      setIsSubmitting(true);

      const parsedYearStart = parseInt(newClass.year_start, 10);
      const parsedYearEnd = parseInt(newClass.year_end, 10);

      // Kiểm tra các trường bắt buộc
      if (
        !newClass.name ||
        !newClass.class_code ||
        !newClass.major_id ||
        isNaN(parsedYearStart)
      ) {
        enqueueSnackbar(
          "Vui lòng điền đầy đủ thông tin: Tên lớp, Mã lớp, Khoa, Ngành, Năm bắt đầu (phải là số hợp lệ).",
          {
            variant: "warning",
          }
        );
        setIsSubmitting(false);
        return;
      }

      const payload = {
        name: newClass.name,
        class_code: newClass.class_code,
        major_id: newClass.major_id,
        advisor_id: newClass.advisor_id,
        year_start: parsedYearStart,
        year_end: isNaN(parsedYearEnd) ? undefined : parsedYearEnd, // Send undefined if NaN
      };
      console.log("Creating Main Class with payload:", payload);

      const response = await axios.post(`${API_URL}/classes/main`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // enqueueSnackbar("Tạo lớp chính thành công", { variant: "success" });
      handleCloseAddClassDialog();
      fetchMainClasses(); // Tải lại danh sách lớp
    } catch (error) {
      console.error("Lỗi khi tạo lớp chính:", error);
      // enqueueSnackbar(
      //   error.response?.data?.message || "Lỗi khi tạo lớp chính",
      //   { variant: "error" }
      // );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dialog xem chi tiết sinh viên
  const renderStudentDetailDialog = () => (
    <Dialog
      open={openStudentDetail}
      onClose={() => setOpenStudentDetail(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Thông tin sinh viên</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setOpenStudentDetail(false)}
            startIcon={<Close />}
          >
            Đóng
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {selectedStudent && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Avatar
                  src={selectedStudent.avatar_url}
                  alt={selectedStudent.full_name}
                  sx={{
                    width: 120,
                    height: 120,
                    mx: "auto",
                    mb: 2,
                    border: "3px solid",
                    borderColor: "primary.main",
                  }}
                >
                  {selectedStudent.full_name?.charAt(0) || "S"}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {selectedStudent.full_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedStudent.email}
                </Typography>

                {/* Mã sinh viên hiển thị rõ ràng nếu có */}
                {selectedStudent.school_info?.student_id && (
                  <Typography
                    variant="subtitle1"
                    sx={{ mt: 1, fontWeight: "medium" }}
                  >
                    MSSV: {selectedStudent.school_info.student_id}
                  </Typography>
                )}

                {/* Trạng thái và mã sinh viên */}
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Chip
                    label={
                      selectedStudent.status === "pending"
                        ? "Chờ duyệt"
                        : "Đã duyệt"
                    }
                    color={
                      selectedStudent.status === "pending"
                        ? "warning"
                        : "success"
                    }
                    sx={{ mb: 1 }}
                  />
                </Box>

                {/* Thông tin có dữ liệu khuôn mặt */}
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={
                      selectedStudent.has_face_data ? (
                        <CheckCircle />
                      ) : (
                        <Cancel />
                      )
                    }
                    label={
                      selectedStudent.has_face_data
                        ? "Đã đăng ký khuôn mặt"
                        : "Chưa đăng ký khuôn mặt"
                    }
                    color={selectedStudent.has_face_data ? "success" : "error"}
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "primary.main",
                }}
              >
                <School sx={{ mr: 1 }} />
                Thông tin học tập
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {selectedStudent.school_info?.class_id?.major_id?.department_id
                  ?.name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Khoa
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {
                        selectedStudent.school_info?.class_id?.major_id
                          ?.department_id?.name
                      }
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.school_info?.class_id?.major_id?.name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Ngành học
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.class_id.major_id.name} (
                      {selectedStudent.school_info.class_id.major_id.code})
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.school_info?.class_id?.name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Lớp
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.class_id.name} (
                      {selectedStudent.school_info.class_id.class_code})
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.school_info?.student_id && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      MSSV
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.student_id}
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.school_info?.year && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Khóa
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.school_info.year}
                    </Typography>
                  </Grid>
                )}

                {selectedStudent.contact?.phone && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Số điện thoại
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {selectedStudent.contact.phone}
                    </Typography>
                  </Grid>
                )}

                {/* Hiển thị "Chưa cập nhật" cho các trường còn thiếu */}
                {!selectedStudent.school_info?.student_id && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      MSSV
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontStyle="italic"
                    >
                      Chưa cập nhật
                    </Typography>
                  </Grid>
                )}

                {!selectedStudent.school_info?.class_id?.major_id?.department_id
                  ?.name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Khoa
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontStyle="italic"
                    >
                      Chưa cập nhật
                    </Typography>
                  </Grid>
                )}

                {!selectedStudent.school_info?.class_id?.major_id?.name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Ngành học
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontStyle="italic"
                    >
                      Chưa cập nhật
                    </Typography>
                  </Grid>
                )}

                {!selectedStudent.school_info?.class_id?.name && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Lớp
                    </Typography>
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontStyle="italic"
                    >
                      Chưa cập nhật
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {/* Hiển thị ảnh khuôn mặt nếu có */}
              {selectedStudent.has_face_data &&
                selectedStudent.faceFeatures && (
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        fontWeight: "bold",
                        color: "primary.main",
                      }}
                    >
                      <Face sx={{ mr: 1 }} />
                      Hình ảnh khuôn mặt đã đăng ký
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {selectedStudent.faceImages &&
                      selectedStudent.faceImages.length > 0 ? (
                        selectedStudent.faceImages.map((img, index) => (
                          <Box
                            key={index}
                            component="img"
                            src={img}
                            alt={`Khuôn mặt ${index + 1}`}
                            sx={{
                              width: 100,
                              height: 100,
                              objectFit: "cover",
                              borderRadius: 1,
                              border: "1px solid #ddd",
                            }}
                          />
                        ))
                      ) : (
                        <Alert severity="info" sx={{ width: "100%" }}>
                          <Typography variant="body2">
                            Sinh viên đã đăng ký dữ liệu khuôn mặt nhưng không
                            có hình ảnh mẫu hiển thị. Hệ thống vẫn có thể nhận
                            diện khuôn mặt này cho việc điểm danh.
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Box>
                )}

              {/* Nút hành động */}
              {selectedStudent.status === "pending" && (
                <Box
                  sx={{
                    mt: 3,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      handleApproveStudent(selectedStudent._id);
                      setOpenStudentDetail(false);
                    }}
                  >
                    Phê duyệt
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => {
                      openRejectDialog(selectedStudent._id);
                      setOpenStudentDetail(false);
                    }}
                  >
                    Từ chối
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );

  // Mở dialog chỉnh sửa lớp chính
  const handleOpenEditClassDialog = async () => {
    if (!mainClass) return;

    const initialSelectedDepartmentId =
      mainClass.major_id?.department_id?._id || "";

    setEditClassData({
      name: mainClass.name || "",
      class_code: mainClass.class_code || "",
      major_id: mainClass.major_id?._id || "",
      selected_department_id: initialSelectedDepartmentId,
      year_start: mainClass.year_start || new Date().getFullYear(),
      year_end: mainClass.year_end || new Date().getFullYear() + 4,
    });

    setMajorsForSelectedDept([]);
    if (initialSelectedDepartmentId) {
      setIsLoadingMajors(true);
      try {
        const response = await axios.get(
          `${API_URL}/majors?department_id=${initialSelectedDepartmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMajorsForSelectedDept(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch majors for editing:", err);
        enqueueSnackbar("Lỗi tải ngành học cho khoa hiện tại.", {
          variant: "error",
        });
      } finally {
        setIsLoadingMajors(false);
      }
    }

    setOpenEditClassDialog(true);
  };

  // Đóng dialog chỉnh sửa lớp chính
  const handleCloseEditClassDialog = () => {
    setOpenEditClassDialog(false);
    setEditClassData(null);
    setMajorsForSelectedDept([]);
  };

  // Xử lý thay đổi trong form chỉnh sửa
  const handleEditClassChange = async (e) => {
    const { name, value } = e.target;
    setEditClassData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "selected_department_id") {
      setEditClassData((prev) => ({ ...prev, major_id: "" }));
      setMajorsForSelectedDept([]);
      if (value) {
        setIsLoadingMajors(true);
        try {
          const response = await axios.get(
            `${API_URL}/majors?department_id=${value}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setMajorsForSelectedDept(response.data.data || []);
        } catch (err) {
          console.error("Failed to fetch majors:", err);
          enqueueSnackbar(
            "Không thể tải danh sách ngành học cho khoa đã chọn.",
            { variant: "error" }
          );
          setMajorsForSelectedDept([]);
        } finally {
          setIsLoadingMajors(false);
        }
      }
    }
  };

  // Cập nhật thông tin lớp chính
  const handleUpdateMainClass = async () => {
    try {
      setIsSubmittingEdit(true);

      const parsedEditYearStart = parseInt(editClassData.year_start, 10);
      const parsedEditYearEnd = parseInt(editClassData.year_end, 10);

      // Kiểm tra các trường bắt buộc
      if (
        !editClassData.name ||
        !editClassData.class_code ||
        !editClassData.major_id ||
        isNaN(parsedEditYearStart)
      ) {
        enqueueSnackbar(
          "Vui lòng điền đầy đủ thông tin: Tên lớp, Mã lớp, Khoa, Ngành, Năm bắt đầu (phải là số hợp lệ).",
          {
            variant: "warning",
          }
        );
        setIsSubmittingEdit(false);
        return;
      }

      const payload = {
        name: editClassData.name,
        class_code: editClassData.class_code,
        major_id: editClassData.major_id,
        year_start: parsedEditYearStart,
        year_end: isNaN(parsedEditYearEnd) ? undefined : parsedEditYearEnd, // Send undefined if NaN
      };
      console.log("Updating Main Class with payload:", payload);

      const response = await axios.put(
        `${API_URL}/classes/main/${mainClass._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // enqueueSnackbar("Cập nhật lớp chính thành công", { variant: "success" });
      handleCloseEditClassDialog();

      // Cập nhật thông tin lớp chính trong state
      if (response.data.success && response.data.data) {
        const updatedClass = response.data.data;

        // Cập nhật lớp chính hiện tại
        setMainClass(updatedClass);

        // Cập nhật danh sách lớp chính
        setMainClasses(
          mainClasses.map((cls) =>
            cls._id === updatedClass._id ? updatedClass : cls
          )
        );
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật lớp chính:", error);
      // enqueueSnackbar(
      //   error.response?.data?.message || "Lỗi khi cập nhật lớp chính",
      //   { variant: "error" }
      // );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenConfirmDeleteStudentDialog = (student) => {
    setConfirmDeleteStudentDialog({ open: true, student: student });
  };

  const handleCloseConfirmDeleteStudentDialog = () => {
    setConfirmDeleteStudentDialog({ open: false, student: null });
  };

  const handleDeleteStudentFromMainClass = async () => {
    if (!mainClass || !confirmDeleteStudentDialog.student) return;

    const classId = mainClass._id;
    const studentId = confirmDeleteStudentDialog.student._id;

    try {
      setIsLoadingApproved(true); // Indicate loading
      await axios.delete(
        `${API_URL}/classes/main/${classId}/students/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // enqueueSnackbar("Xóa sinh viên khỏi lớp chính thành công!", {
      //   variant: "success",
      // });
      // Refresh the list of approved students
      fetchApprovedStudents(classId);
      // Close the confirmation dialog
      handleCloseConfirmDeleteStudentDialog();
    } catch (error) {
      console.error("Lỗi khi xóa sinh viên khỏi lớp chính:", error);
      // enqueueSnackbar(
      //   error.response?.data?.message || "Lỗi khi xóa sinh viên khỏi lớp chính",
      //   { variant: "error" }
      // );
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // State for confirming main class deletion
  const handleOpenConfirmDeleteMainClassDialog = () => {
    setConfirmDeleteMainClassDialog({ open: true });
  };

  const handleCloseConfirmDeleteMainClassDialog = () => {
    setConfirmDeleteMainClassDialog({ open: false });
  };

  // Dialog xác nhận xóa lớp chính
  const renderConfirmDeleteMainClassDialog = () => (
    <Dialog
      open={confirmDeleteMainClassDialog.open}
      onClose={handleCloseConfirmDeleteMainClassDialog}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ bgcolor: "error.dark", color: "white" }}>
        {/* <Warning sx={{ verticalAlign: "middle", mr: 1 }} />  Assume Warning is imported */}
        Xác nhận xóa Lớp Chủ Nhiệm
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <DialogContentText component="div">
          <Typography variant="body1" gutterBottom>
            Bạn có chắc chắn muốn xóa lớp chủ nhiệm này không:
          </Typography>
          <Typography
            variant="h6"
            gutterBottom
            color="text.primary"
            sx={{ fontWeight: "bold" }}
          >
            {mainClass?.name} ({mainClass?.class_code})
          </Typography>
          <Typography
            variant="body2"
            color="error.main"
            sx={{ mt: 1, fontWeight: "bold" }}
          >
            {/* <Warning sx={{ verticalAlign: "middle", fontSize: "1.1rem", mr: 0.5 }} /> Assume Warning is imported */}
            LƯU Ý: Hành động này không thể hoàn tác.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Tất cả dữ liệu liên quan đến lớp chủ nhiệm này (bao gồm việc gỡ bỏ
            liên kết của sinh viên khỏi lớp, cập nhật các lớp giảng dạy liên
            quan, và xóa các thông báo liên quan) sẽ được thực hiện.
          </Typography>
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleCloseConfirmDeleteMainClassDialog}
          color="inherit"
          variant="outlined"
        >
          Hủy
        </Button>
        <Button
          onClick={async () => {
            if (!mainClass?._id) return;
            try {
              setIsLoading(true);
              await axios.delete(`${API_URL}/classes/main/${mainClass._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              // enqueueSnackbar(
              //   "Xóa lớp chủ nhiệm và các dữ liệu liên quan thành công!",
              //   { variant: "success" }
              // );
              handleCloseConfirmDeleteMainClassDialog();
              navigate("/teacher/dashboard");
            } catch (error) {
              console.error("Lỗi khi xóa lớp chủ nhiệm:", error);
              // enqueueSnackbar(
              //   error.response?.data?.message || "Lỗi khi xóa lớp chủ nhiệm",
              //   { variant: "error" }
              // );
              setIsLoading(false);
            }
          }}
          color="error"
          variant="contained"
          autoFocus
          startIcon={<DeleteForever />}
        >
          Xóa Lớp Chủ Nhiệm
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (isLoading) {
    return (
      <Box sx={{ padding: 3 }}>
        {/* Phần Header luôn hiển thị */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h4"
            gutterBottom={false}
            sx={{
              fontWeight: "bold",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              m: 0,
            }}
          >
            <School sx={{ mr: 1, fontSize: 32 }} />
            Quản lý lớp chính
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleOpenAddClassDialog}
            >
              Thêm lớp chính
            </Button>
            {/* Nút Làm mới sẽ không hiển thị khi đang loading và chưa có mainClass */}
          </Box>
        </Box>
        {renderLoadingState()}
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      {/* Phần Header luôn hiển thị */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          gutterBottom={false}
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            m: 0,
          }}
        >
          <School sx={{ mr: 1, fontSize: 32 }} />
          Quản lý lớp chính
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleOpenAddClassDialog}
          >
            Thêm lớp chính
          </Button>
          {mainClass && ( // Chỉ hiển thị nút Làm mới nếu có mainClass
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={refreshAllData}
              startIcon={<HourglassEmpty />}
              disabled={isLoadingPending || isLoadingApproved}
            >
              {isLoadingPending || isLoadingApproved
                ? "Đang làm mới..."
                : "Làm mới dữ liệu"}
            </Button>
          )}
        </Box>
      </Box>

      {/* Nội dung chính của trang, render có điều kiện */}
      {(() => {
        // isLoading đã được xử lý ở trên bằng cách return sớm toàn bộ component với header + loading state
        // nên ở đây không cần check isLoading nữa nếu cấu trúc return sớm được giữ

        if (error && !mainClass) {
          // Nếu có lỗi ban đầu và không có mainClass nào được tải
          return renderErrorStateJSX();
        }

        if (!mainClass) {
          // Nếu không có mainClass nào được phân công (sau khi đã load xong, không có lỗi ban đầu)
          return (
            <Box sx={{ p: 3, mt: 2 /* Thêm khoảng cách từ header */ }}>
              <Alert
                severity="info"
                icon={<Info />}
                sx={{ mb: 2, display: "flex", alignItems: "center" }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Bạn chưa được phân công làm cố vấn cho lớp nào
                  </Typography>
                  <Typography variant="body2">
                    Vui lòng liên hệ với quản trị viên để được phân công lớp cố
                    vấn
                  </Typography>
                </Box>
              </Alert>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/teacher/dashboard")}
                startIcon={<School />}
              >
                Quay lại trang chủ
              </Button>
            </Box>
          );
        }

        // Nếu có mainClass, hiển thị thông tin lớp và các tab
        return (
          <>
            {mainClasses.length > 1 && (
              <Card sx={{ mb: 3, p: 2, boxShadow: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Class sx={{ mr: 2, color: "primary.main", fontSize: 28 }} />
                  <FormControl fullWidth>
                    <InputLabel id="class-select-label">
                      Chọn lớp để quản lý
                    </InputLabel>
                    <Select
                      labelId="class-select-label"
                      id="class-select"
                      value={mainClass ? mainClass._id : ""}
                      onChange={handleChangeClass}
                      input={<OutlinedInput label="Chọn lớp để quản lý" />}
                      renderValue={(selectedId) => {
                        const selectedClass = mainClasses.find(
                          (cls) => cls._id === selectedId
                        );
                        return (
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <School sx={{ mr: 1, color: "primary.main" }} />
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: "bold" }}
                            >
                              {selectedClass?.name} ({selectedClass?.class_code}
                              )
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                ml: 2,
                              }}
                            >
                              <Chip
                                size="small"
                                color="primary"
                                label={`${
                                  selectedClass?.students?.length || 0
                                } sinh viên`}
                              />
                              {mainClass &&
                                mainClass._id === selectedId &&
                                pendingStudents.length > 0 && (
                                  <Chip
                                    size="small"
                                    color="error"
                                    icon={<HourglassEmpty />}
                                    label={`${pendingStudents.length} chờ duyệt`}
                                    sx={{ ml: 1 }}
                                  />
                                )}
                            </Box>
                          </Box>
                        );
                      }}
                    >
                      {mainClasses.map((cls) => (
                        <MenuItem key={cls._id} value={cls._id}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <School
                                sx={{
                                  mr: 1,
                                  color:
                                    cls._id === mainClass?._id
                                      ? "primary.main"
                                      : "text.secondary",
                                }}
                              />
                              <Typography
                                color={
                                  cls._id === mainClass?._id
                                    ? "primary.main"
                                    : "text.primary"
                                }
                                sx={{
                                  fontWeight:
                                    cls._id === mainClass?._id
                                      ? "bold"
                                      : "normal",
                                }}
                              >
                                {cls.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ ml: 1, color: "text.secondary" }}
                              >
                                ({cls.class_code})
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              color={
                                cls._id === mainClass?._id
                                  ? "primary"
                                  : "default"
                              }
                              variant={
                                cls._id === mainClass?._id
                                  ? "filled"
                                  : "outlined"
                              }
                              label={`${cls.students?.length || 0} sinh viên`}
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Card>
            )}

            {renderClassInfo()}

            <Paper
              sx={{ width: "100%", mb: 2, overflow: "hidden", boxShadow: 3 }}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  "& .MuiTab-root": { fontWeight: "bold" },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Badge
                        badgeContent={pendingStudents.length}
                        color="error"
                        max={99}
                        sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}
                      >
                        <HourglassEmpty sx={{ mr: 1 }} />
                      </Badge>
                      <Box sx={{ ml: pendingStudents.length > 0 ? 1 : 0 }}>
                        Sinh viên chờ duyệt
                      </Box>
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Badge
                        badgeContent={totalApproved}
                        color="success"
                        max={999}
                        sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}
                      >
                        <School sx={{ mr: 1 }} />
                      </Badge>
                      <Box sx={{ ml: totalApproved > 0 ? 1 : 0 }}>
                        Sinh viên của lớp ({totalApproved})
                      </Box>
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Assessment sx={{ mr: 1 }} />
                      Thống kê chi tiết
                    </Box>
                  }
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                    Danh sách sinh viên chờ duyệt
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      size="small"
                      label="Tìm kiếm sinh viên (tên, email, MSSV, lớp, ngành, SĐT)"
                      variant="outlined"
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {pendingSearchTerm && (
                              <IconButton
                                size="small"
                                onClick={() => setPendingSearchTerm("")}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            )}
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 350 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => {
                        fetchPendingStudents(mainClass._id);
                      }}
                      disabled={isLoadingPending}
                    >
                      Làm mới
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<FileDownload />}
                      onClick={() => handleExportStudents("pending")}
                      disabled={filteredPendingStudents.length === 0}
                    >
                      Xuất Excel
                    </Button>
                  </Box>
                </Box>

                {isLoadingPending ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 4 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : filteredPendingStudents.length > 0 ? (
                  <TableContainer
                    component={Paper}
                    sx={{
                      overflowX: "auto", // Đảm bảo overflowX được áp dụng
                      boxShadow: 1,
                      "&::-webkit-scrollbar": {
                        // Tùy chỉnh thanh cuộn cho Webkit browsers (Chrome, Safari)
                        height: "8px",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "rgba(0,0,0,0.2)",
                        borderRadius: "4px",
                      },
                    }}
                  >
                    <Table
                      sx={{ minWidth: 1200 }}
                      aria-label="pending students table"
                    >
                      {" "}
                      {/* Tăng mạnh minWidth để dễ test */}
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: "bold", width: "5%" }}>
                            STT
                          </TableCell>{" "}
                          {/* Thêm STT */}
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Họ và tên
                          </TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>MSSV</TableCell>
                          <TableCell>Lớp ĐK</TableCell>{" "}
                          {/* Đổi tên cột lớp cho rõ */}
                          <TableCell>Ngành ĐK</TableCell>
                          <TableCell>Khoa ĐK</TableCell>
                          <TableCell>Ngày ĐK</TableCell>
                          <TableCell>SĐT</TableCell>
                          <TableCell align="center">Hành động</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredPendingStudents.map((student, index) => (
                          <TableRow key={student._id}>
                            <TableCell>{index + 1}</TableCell> {/* STT */}
                            <TableCell component="th" scope="row">
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <Avatar
                                  src={student.avatar_url}
                                  alt={student.full_name}
                                  sx={{ width: 36, height: 36, mr: 1.5 }}
                                >
                                  {student.full_name?.charAt(0) || "S"}
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "medium" }}
                                  >
                                    {student.full_name}
                                  </Typography>
                                  {student.has_face_data && (
                                    <Chip
                                      icon={<Face />}
                                      label="Đã đăng ký khuôn mặt"
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                      sx={{ mt: 0.5, height: 24 }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>
                              {student.school_info?.student_id ||
                                student.school_info?.student_code || (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                  >
                                    Chưa cập nhật
                                  </Typography>
                                )}
                            </TableCell>
                            <TableCell>
                              {student.school_info?.class_id?.name || ( // Hiển thị tên lớp sinh viên đã chọn khi ĐK
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  fontStyle="italic"
                                >
                                  Chưa có
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {student.school_info?.class_id?.major_id
                                ?.name || (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  fontStyle="italic"
                                >
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {student.school_info?.class_id?.major_id
                                ?.department_id?.name || (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  fontStyle="italic"
                                >
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {student.created_at
                                ? new Date(
                                    student.created_at
                                  ).toLocaleDateString("vi-VN")
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {student.contact?.phone || (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  fontStyle="italic"
                                >
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <Tooltip title="Xem chi tiết">
                                  <IconButton
                                    size="small" // Thêm size small để tiết kiệm không gian
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setOpenStudentDetail(true);
                                    }}
                                  >
                                    <InfoIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Duyệt sinh viên">
                                  <IconButton
                                    size="small" // Thêm size small
                                    color="primary"
                                    onClick={() =>
                                      handleApproveStudent(student._id)
                                    }
                                  >
                                    <CheckIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Từ chối">
                                  <IconButton
                                    size="small" // Thêm size small
                                    color="error"
                                    onClick={() =>
                                      openRejectDialog(student._id)
                                    }
                                  >
                                    <ClearIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <NoDataSvg width="200px" height="200px" />
                    <Typography
                      variant="h6"
                      color="textSecondary"
                      sx={{ mt: 2 }}
                    >
                      Không có sinh viên nào chờ duyệt
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Khi có sinh viên đăng ký vào lớp, họ sẽ xuất hiện ở đây
                    </Typography>
                  </Paper>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box
                  sx={{
                    mb: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography variant="h6" component="div">
                    Danh sách sinh viên đã duyệt
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      size="small"
                      label="Tìm kiếm sinh viên (tên, email, MSSV, lớp, ngành, SĐT)"
                      variant="outlined"
                      value={approvedSearchTerm}
                      onChange={(e) => {
                        setApprovedSearchTerm(e.target.value);
                        setPage(0);
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {approvedSearchTerm && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setApprovedSearchTerm("");
                                  setPage(0);
                                }}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            )}
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 350 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => {
                        setApprovedSearchTerm("");
                        setPage(0);
                        fetchApprovedStudents(mainClass._id);
                      }}
                      disabled={isLoadingApproved}
                    >
                      Làm mới
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<TableChart />}
                      onClick={() => handleExportStudents("approved")}
                      disabled={approvedStudents.length === 0}
                    >
                      Xuất Excel
                    </Button>
                  </Box>
                </Box>

                {isLoadingApproved ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 4 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : approvedStudents.length > 0 ? (
                  <>
                    <TableContainer
                      component={Paper}
                      sx={{
                        overflowX: "auto", // Đảm bảo overflowX được áp dụng
                        boxShadow: 2,
                        "&::-webkit-scrollbar": {
                          height: "8px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: "rgba(0,0,0,0.2)",
                          borderRadius: "4px",
                        },
                      }}
                    >
                      <Table
                        sx={{ minWidth: 1400 }}
                        aria-label="approved students table"
                      >
                        {" "}
                        {/* Tăng minWidth để chứa nhiều cột hơn */}
                        <TableHead>
                          <TableRow sx={{ bgcolor: "primary.lighter" }}>
                            <TableCell sx={{ fontWeight: "bold", width: "5%" }}>
                              STT
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>
                              Họ và tên
                            </TableCell>
                            <TableCell>MSSV</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Lớp đăng ký</TableCell>
                            <TableCell>Ngành</TableCell>
                            <TableCell>Khoa</TableCell>
                            <TableCell>Số điện thoại</TableCell>
                            <TableCell>Địa chỉ</TableCell>
                            <TableCell>Khuôn mặt</TableCell>
                            <TableCell align="center">Hành động</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {approvedStudents.map((student, index) => (
                            <TableRow key={student._id} hover>
                              <TableCell>
                                {page * rowsPerPage + index + 1}
                              </TableCell>
                              <TableCell>
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  <Avatar
                                    src={student.avatar_url}
                                    sx={{ width: 32, height: 32, mr: 1 }}
                                  >
                                    {student.full_name?.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Typography variant="body2">
                                    {student.full_name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {student.school_info?.student_id || (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                  >
                                    Chưa cập nhật
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>
                                {student.school_info?.class_id?.name ? (
                                  <Box>
                                    <Typography variant="body2">
                                      {student.school_info.class_id.name}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      ({student.school_info.class_id.class_code}
                                      )
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                  >
                                    Chưa cập nhật
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {student.school_info?.class_id?.major_id
                                  ?.name ? (
                                  <Box>
                                    <Typography variant="body2">
                                      {
                                        student.school_info.class_id.major_id
                                          .name
                                      }
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      (
                                      {
                                        student.school_info.class_id.major_id
                                          .code
                                      }
                                      )
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                  >
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {student.school_info?.class_id?.major_id
                                  ?.department_id?.name ? (
                                  <Box>
                                    <Typography variant="body2">
                                      {
                                        student.school_info.class_id.major_id
                                          .department_id.name
                                      }
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      (
                                      {
                                        student.school_info.class_id.major_id
                                          .department_id.code
                                      }
                                      )
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                  >
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {student.contact?.phone || (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                  >
                                    Chưa cập nhật
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {student.contact?.address ? (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      maxWidth: 150,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={student.contact.address}
                                  >
                                    {student.contact.address}
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontStyle="italic"
                                  >
                                    Chưa cập nhật
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {student.has_face_data ? (
                                  <Chip
                                    icon={<Face />}
                                    label="Đã đăng ký"
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                  />
                                ) : (
                                  <Chip
                                    icon={<NoFace />}
                                    label="Chưa đăng ký"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="Xem chi tiết sinh viên">
                                  <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => handleViewStudent(student)}
                                  >
                                    <InfoIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa sinh viên này khỏi lớp chính">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleOpenConfirmDeleteStudentDialog(
                                        student
                                      )
                                    }
                                  >
                                    <DeleteForever fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      component="div"
                      count={totalApproved}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      labelRowsPerPage="Số hàng mỗi trang:"
                      labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} của ${count}`
                      }
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <NoDataSvg width="200px" height="200px" />
                    <Typography
                      variant="h6"
                      color="textSecondary"
                      sx={{ mt: 2 }}
                    >
                      Chưa có sinh viên nào được duyệt
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Khi bạn duyệt sinh viên, họ sẽ xuất hiện ở đây
                    </Typography>
                  </Paper>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <MainClassStatistics
                  classId={mainClass._id}
                  className={mainClass.name}
                />
              </TabPanel>
            </Paper>
          </>
        );
      })()}

      {/* Dialogs: Đảm bảo tất cả các dialog được render ở đây, bên ngoài IIFE */}
      <Dialog
        open={openAddClassDialog}
        onClose={handleCloseAddClassDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}
        >
          <Add sx={{ verticalAlign: "middle", mr: 1 }} />
          Thêm lớp chính mới
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tên lớp"
                name="name"
                value={newClass.name}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="Nhập tên lớp (VD: Công nghệ thông tin K19)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mã lớp"
                name="class_code"
                value={newClass.class_code}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="Nhập mã lớp (VD: CNTT-K19)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Năm bắt đầu"
                name="year_start"
                type="number"
                value={newClass.year_start}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="VD: 2021"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Năm kết thúc"
                name="year_end"
                type="number"
                value={newClass.year_end}
                onChange={handleNewClassChange}
                required
                variant="outlined"
                placeholder="VD: 2025"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined" required>
                <InputLabel>Khoa</InputLabel>
                <Select
                  name="selected_department_id"
                  value={newClass.selected_department_id}
                  onChange={handleNewClassChange}
                  label="Khoa"
                >
                  <MenuItem value="">
                    <em>Chọn Khoa</em>
                  </MenuItem>
                  {departments.map((department) => (
                    <MenuItem key={department._id} value={department._id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl
                fullWidth
                variant="outlined"
                required
                disabled={!newClass.selected_department_id || isLoadingMajors}
              >
                <InputLabel>Ngành</InputLabel>
                <Select
                  name="major_id"
                  value={newClass.major_id}
                  onChange={handleNewClassChange}
                  label="Ngành"
                >
                  <MenuItem value="">
                    <em>
                      {isLoadingMajors
                        ? "Đang tải ngành..."
                        : newClass.selected_department_id
                        ? "Chọn Ngành"
                        : "Vui lòng chọn Khoa trước"}
                    </em>
                  </MenuItem>
                  {majorsForSelectedDept.map((major) => (
                    <MenuItem key={major._id} value={major._id}>
                      {major.name} ({major.code})
                    </MenuItem>
                  ))}
                </Select>
                {isLoadingMajors && (
                  <CircularProgress
                    size={24}
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      marginTop: "-12px",
                      marginLeft: "-12px",
                    }}
                  />
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddClassDialog} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={handleCreateMainClass}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Add />}
          >
            {isSubmitting ? "Đang tạo..." : "Tạo lớp"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditClassDialog}
        onClose={handleCloseEditClassDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}
        >
          <Edit sx={{ verticalAlign: "middle", mr: 1 }} />
          Chỉnh sửa thông tin lớp chính
        </DialogTitle>
        <DialogContent dividers>
          {editClassData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tên lớp"
                  name="name"
                  value={editClassData.name}
                  onChange={handleEditClassChange}
                  required
                  variant="outlined"
                  placeholder="VD: Công nghệ thông tin 1"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mã lớp"
                  name="class_code"
                  value={editClassData.class_code}
                  onChange={handleEditClassChange}
                  required
                  variant="outlined"
                  placeholder="VD: CNTT2021-1"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Năm bắt đầu"
                  name="year_start"
                  type="number"
                  value={editClassData.year_start}
                  onChange={handleEditClassChange}
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Năm kết thúc"
                  name="year_end"
                  type="number"
                  value={editClassData.year_end}
                  onChange={handleEditClassChange}
                  required
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Khoa</InputLabel>
                  <Select
                    label="Khoa"
                    name="selected_department_id"
                    value={editClassData.selected_department_id}
                    onChange={handleEditClassChange}
                  >
                    <MenuItem value="">
                      <em>Chọn Khoa</em>
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  required
                  disabled={
                    !editClassData.selected_department_id || isLoadingMajors
                  }
                >
                  <InputLabel>Ngành</InputLabel>
                  <Select
                    label="Ngành"
                    name="major_id"
                    value={editClassData.major_id}
                    onChange={handleEditClassChange}
                  >
                    <MenuItem value="">
                      <em>
                        {isLoadingMajors
                          ? "Đang tải ngành..."
                          : editClassData.selected_department_id
                          ? "Chọn Ngành"
                          : "Vui lòng chọn Khoa trước"}
                      </em>
                    </MenuItem>
                    {majorsForSelectedDept.map((major) => (
                      <MenuItem key={major._id} value={major._id}>
                        {major.name} ({major.code})
                      </MenuItem>
                    ))}
                  </Select>
                  {isLoadingMajors && (
                    <CircularProgress
                      size={24}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        marginTop: "-12px",
                        marginLeft: "-12px",
                      }}
                    />
                  )}
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseEditClassDialog}
            disabled={isSubmittingEdit}
          >
            Hủy
          </Button>
          <Button
            onClick={handleUpdateMainClass}
            variant="contained"
            color="primary"
            disabled={isSubmittingEdit}
            startIcon={
              isSubmittingEdit ? <CircularProgress size={20} /> : <Edit />
            }
          >
            {isSubmittingEdit ? "Đang cập nhật..." : "Cập nhật lớp"}
          </Button>
        </DialogActions>
      </Dialog>

      {renderStudentDetailDialog()}

      <Dialog
        open={confirmDeleteStudentDialog.open}
        onClose={handleCloseConfirmDeleteStudentDialog}
        maxWidth="xs"
      >
        <DialogTitle>Xác nhận xóa sinh viên</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Bạn có chắc chắn muốn xóa sinh viên `}
            <strong>{confirmDeleteStudentDialog.student?.full_name}</strong>
            {` (MSSV: `}
            <strong>
              {confirmDeleteStudentDialog.student?.school_info?.student_id ||
                "N/A"}
            </strong>
            {`) khỏi lớp chủ nhiệm này không? Hành động này sẽ gỡ sinh viên ra khỏi lớp.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseConfirmDeleteStudentDialog}
            color="inherit"
          >
            Hủy
          </Button>
          <Button
            onClick={handleDeleteStudentFromMainClass}
            color="error"
            autoFocus
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {renderConfirmDeleteMainClassDialog()}

      <Dialog
        open={rejectDialog.open}
        onClose={closeRejectDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle
          sx={{ bgcolor: "error.light", color: "white", fontWeight: "bold" }}
        >
          <Close sx={{ verticalAlign: "middle", mr: 1 }} />
          Từ chối sinh viên
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2">
              Sinh viên sẽ nhận được thông báo về việc bị từ chối và lý do.
              Trạng thái tài khoản của sinh viên sẽ chuyển sang "Từ chối".
            </Typography>
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Lý do từ chối"
            placeholder="Nhập lý do từ chối để thông báo cho sinh viên"
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog({ ...rejectDialog, reason: e.target.value })
            }
            variant="outlined"
            required
            error={rejectDialog.reason.trim() === ""}
            helperText={
              rejectDialog.reason.trim() === ""
                ? "Vui lòng nhập lý do từ chối"
                : ""
            }
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeRejectDialog}
            variant="outlined"
            startIcon={<Close />}
          >
            Hủy
          </Button>
          <Button
            onClick={handleRejectStudent}
            color="error"
            variant="contained"
            startIcon={<Close />}
            disabled={rejectDialog.reason.trim() === ""}
          >
            Từ chối sinh viên
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherMainClassPage;
