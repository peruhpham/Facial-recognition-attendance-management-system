import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Collapse,
  Card,
  CardContent,
  FormHelperText,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Alert,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Search,
  Refresh,
  School,
  People,
  Dashboard,
  FilterList,
  Person,
  PersonAdd,
  AccessTime,
  Check,
  Close,
  Group,
  DeleteForever,
} from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Helper function to determine course status
const getCourseStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Adjust end date to be the end of the day
  end.setHours(23, 59, 59, 999);

  if (now < start) {
    return { text: "Chưa bắt đầu", color: "primary", variant: "outlined" };
  } else if (now >= start && now <= end) {
    return { text: "Đang học", color: "success", variant: "outlined" };
  } else {
    return { text: "Đã kết thúc", color: "default", variant: "outlined" };
  }
};

const ClassesPage = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useSelector((state) => state.auth);

  // State
  const [tabValue, setTabValue] = useState(0);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMajors, setIsLoadingMajors] = useState(false); // New state for loading majors

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // State cho danh sách lớp chính riêng biệt
  const [mainClasses, setMainClasses] = useState([]);

  // Lookup data states
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filteredMajors, setFilteredMajors] = useState([]); // New state for majors filtered by department

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedClass, setSelectedClass] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Main Class Form Data
  const [mainClassForm, setMainClassForm] = useState({
    name: "",
    class_code: "", // Renamed from code
    selected_department_id: "", // For department dropdown to filter majors
    major_id: "", // New: to store selected major's ID
    advisor_id: "",
    students: [],
    year_start: new Date().getFullYear(), // Default to current year
    year_end: new Date().getFullYear() + 4, // Default to 4 years later
  });

  // Teaching Class Form Data
  const [teachingClassForm, setTeachingClassForm] = useState({
    class_name: "",
    class_code: "",
    subject_id: "",
    semester_id: "",
    teacher_id: "",
    main_class_id: "",
    selected_students: [],
    description: "",
  });

  // State nâng cao
  const [filterOptions, setFilterOptions] = useState({
    department: "",
    teacher: "",
    course: "",
    semester: "",
    year_start: "", // Added year_start filter
  });

  // Thêm states cho thống kê
  const [stats, setStats] = useState({
    mainClasses: 0,
    teachingClasses: 0,
    students: 0,
    teachers: 0,
  });

  // Thêm state cho lỗi validation
  const [formErrors, setFormErrors] = useState({
    main: {
      name: false,
      code: false,
      selected_department_id: false, // Added for validation if needed
      major_id: false, // Added for validation
    },
    teaching: {
      class_name: false,
      class_code: false,
      subject_id: false,
      semester_id: false,
    },
  });

  // State cho tìm kiếm và phân trang
  const [search, setSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });
  const [studentApprovalDialog, setStudentApprovalDialog] = useState({
    open: false,
    classItem: null,
    tabValue: 0,
    pendingStudents: [],
    approvedStudents: [],
    loading: false,
    rejectDialog: {
      open: false,
      studentId: null,
      reason: "",
    },
    studentToDeleteFromMainClass: null, // For main class student deletion
    confirmDeleteMainClassStudentDialogOpen: false, // For main class student deletion
  });

  // State for viewing students of a teaching class
  const [viewTeachingClassStudentsDialog, setViewTeachingClassStudentsDialog] =
    useState({
      open: false,
      classItem: null,
      students: [],
      loading: false,
      studentToDelete: null,
      confirmDeleteDialogOpen: false,
    });

  // Thêm state để kiểm soát việc vô hiệu hóa chọn môn học
  const [isSubjectSelectionDisabled, setIsSubjectSelectionDisabled] =
    useState(false);
  // Thêm state để kiểm soát việc vô hiệu hóa chọn học kỳ
  const [isSemesterSelectionDisabled, setIsSemesterSelectionDisabled] =
    useState(false);

  // Load data on mount and when pagination/search changes
  useEffect(() => {
    loadClasses();
  }, [page, rowsPerPage, tabValue, filterOptions]);

  useEffect(() => {
    loadLookupData();
    loadMainClasses(); // ensure this is called or integrated with loadClasses
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  const loadLookupData = async () => {
    try {
      setIsLoading(true);
      // Load teachers với tham số tìm kiếm nâng cao
      const teachersResponse = await axios.get(
        `${API_URL}/users?role=teacher&status=approved&limit=200&sort=full_name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTeachers(teachersResponse.data.data || []);

      // Load departments
      const departmentsResponse = await axios.get(
        `${API_URL}/departments?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartments(departmentsResponse.data.data || []);

      // Load students
      const studentsResponse = await axios.get(
        `${API_URL}/users?role=student&status=approved&limit=200&sort=full_name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStudents(studentsResponse.data.data || []);

      // Load subjects
      const subjectsResponse = await axios.get(
        `${API_URL}/subjects?limit=200&sort=name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Lọc các môn học có status là "đang dạy"
      const activeSubjects = subjectsResponse.data.data.filter(
        (subject) => subject.status === "đang dạy"
      );
      setSubjects(activeSubjects || []);

      // Load semesters
      const semestersResponse = await axios.get(
        `${API_URL}/semesters?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSemesters(semestersResponse.data.data || []);

      setIsLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tham chiếu:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu tham chiếu", { variant: "error" });
      setIsLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      let url;
      let queryParams = `page=${
        page + 1
      }&limit=${rowsPerPage}&search=${searchTerm}`;

      if (tabValue === 0) {
        // Lớp chính
        url = `${API_URL}/classes/main`;
        if (filterOptions.department) {
          queryParams += `&department_id=${filterOptions.department}`; // Send department_id directly for backend to handle major lookup
        }
        if (filterOptions.year_start) {
          queryParams += `&year_start=${filterOptions.year_start}`;
        }
        if (filterOptions.teacher) {
          queryParams += `&advisor_id=${filterOptions.teacher}`;
        }
      } else {
        // Lớp giảng dạy
        url = `${API_URL}/classes/teaching`;
        if (filterOptions.course) {
          queryParams += `&subject_id=${filterOptions.course}`;
        }
        if (filterOptions.teacher) {
          queryParams += `&teacher_id=${filterOptions.teacher}`;
        }
        if (filterOptions.semester) {
          queryParams += `&semester=${filterOptions.semester}`;
        }
      }

      const response = await axios.get(`${url}?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (tabValue === 0) {
        setMainClasses(response.data.data || []);
        setTotalCount(response.data.total || 0); // Assuming backend returns total for main classes
      } else {
        setClasses(response.data.data || []);
        setTotalCount(response.data.total || 0); // Assuming backend returns total for teaching classes
      }
    } catch (error) {
      enqueueSnackbar(
        `Lỗi khi tải danh sách lớp: ${
          error?.response?.data?.message || error.message
        }`,
        { variant: "error" }
      );
      if (tabValue === 0) {
        setMainClasses([]);
      } else {
        setClasses([]);
      }
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadClasses();
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
    setSearchTerm("");
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Thêm hàm xử lý lọc
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setPage(0); // Reset page when filter changes
    setFilterOptions((prevOptions) => ({
      ...prevOptions,
      [name]: value,
    }));
  };

  // Thêm hàm áp dụng bộ lọc
  const applyFilters = () => {
    setPage(0);
    loadClasses();
  };

  // Thêm hàm xóa bộ lọc
  const clearFilters = () => {
    setFilterOptions({
      department: "",
      teacher: "",
      course: "",
      semester: "",
      year_start: "",
    });
    setSearchTerm(""); // Also clear search term
    // loadClasses will be triggered by useEffect on filterOptions
  };

  const loadMajorsByDepartment = async (departmentId) => {
    if (!departmentId) {
      setFilteredMajors([]);
      return;
    }
    setIsLoadingMajors(true);
    try {
      const response = await axios.get(
        `${API_URL}/majors?department_id=${departmentId}&all=true`, // Fetch all majors for the department
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFilteredMajors(response.data.data || []);
    } catch (error) {
      enqueueSnackbar(
        `Lỗi khi tải danh sách ngành: ${
          error?.response?.data?.message || error.message
        }`,
        { variant: "error" }
      );
      setFilteredMajors([]);
    } finally {
      setIsLoadingMajors(false);
    }
  };

  // Dialog handlers
  const openDialog = async (mode, classItem = null) => {
    setDialogMode(mode);
    setFormErrors({
      main: {
        name: false,
        code: false,
        selected_department_id: false,
        major_id: false,
      },
      teaching: {
        class_name: false,
        class_code: false,
        subject_id: false,
        semester_id: false,
      },
    });
    // Reset filteredMajors khi mở dialog, sẽ được load lại nếu cần
    setFilteredMajors([]);

    if (mode === "create") {
      setSelectedClass(null);
      if (tabValue === 0) {
        // Main Class
        setMainClassForm({
          name: "",
          class_code: "",
          selected_department_id: "",
          major_id: "",
          advisor_id: "",
          students: [],
          year_start: new Date().getFullYear(),
          year_end: new Date().getFullYear() + 4,
        });
      } else {
        // Teaching Class
        setTeachingClassForm({
          class_name: "",
          class_code: "",
          subject_id: "",
          semester_id: "",
          teacher_id: "",
          main_class_id: "",
          selected_students: [],
          description: "",
        });
      }
    } else if (mode === "edit" && classItem) {
      setSelectedClass(classItem);
      if (tabValue === 0) {
        // Main Class
        const departmentIdForMajorFilter =
          classItem.major_id?.department_id?._id;

        // Initialize form state, temporarily set major_id to empty
        // It will be set correctly after majors are loaded
        setMainClassForm({
          name: classItem.name || "",
          class_code: classItem.class_code || "",
          selected_department_id: departmentIdForMajorFilter || "",
          major_id: "", // Temporarily reset, will be set after loadMajorsByDepartment
          advisor_id: classItem.advisor_id?._id || "",
          students: classItem.students?.map((s) => s._id) || [],
          year_start: classItem.year_start || new Date().getFullYear(),
          year_end: classItem.year_end || new Date().getFullYear() + 4,
        });

        if (departmentIdForMajorFilter) {
          await loadMajorsByDepartment(departmentIdForMajorFilter);
          // Now that filteredMajors should be populated, set the actual major_id
          setMainClassForm((prev) => ({
            ...prev,
            major_id: classItem.major_id?._id || "",
          }));
        } else {
          // If there's no department, ensure filteredMajors is empty
          setFilteredMajors([]);
        }
      } else {
        // Teaching Class
        setTeachingClassForm({
          class_name: classItem.class_name || classItem.name,
          class_code: classItem.class_code,
          subject_id:
            classItem.subject_id?._id || classItem.course_id?._id || "",
          semester_id: classItem.semester_id?._id || "",
          teacher_id: classItem.teacher_id?._id || "",
          main_class_id: classItem.main_class_id?._id || "",
          selected_students: classItem.students?.map((s) => s._id) || [],
          description: classItem.description || "",
        });

        if (classItem.semester_id?._id) {
          const currentSemesterOfClass = semesters.find(
            (s) => s._id === classItem.semester_id._id
          );
          if (currentSemesterOfClass) {
            if (currentSemesterOfClass.calculated_status === "Đã kết thúc") {
              setIsSubjectSelectionDisabled(true);
              setIsSemesterSelectionDisabled(true);
              // enqueueSnackbar(
              //   `Lớp học này thuộc về học kỳ '${currentSemesterOfClass.name}' đã kết thúc. Không thể thay đổi học kỳ hoặc môn học.`,
              //   { variant: "warning", autoHideDuration: 7000 }
              // );
            } else {
              setIsSubjectSelectionDisabled(false);
              setIsSemesterSelectionDisabled(false);
            }
          } else {
            setIsSubjectSelectionDisabled(false);
            setIsSemesterSelectionDisabled(false);
          }
        }
      }
    }
    setSelectedClass(classItem); // selectedClass vẫn được dùng cho delete dialog
    setDialogOpen(true);
  };

  // Cập nhật hàm handleMainClassFormChange để có validation
  const handleMainClassFormChange = (e) => {
    const { name, value } = e.target;
    setMainClassForm({
      ...mainClassForm,
      [name]: value,
    });

    // Xóa lỗi khi người dùng nhập liệu
    if (formErrors.main[name] && String(value).trim() !== "") {
      // Improved check for any field in formErrors.main
      setFormErrors({
        ...formErrors,
        main: {
          ...formErrors.main,
          [name]: false,
        },
      });
    }
  };

  // Cập nhật hàm handleTeachingClassFormChange để có validation
  const handleTeachingClassFormChange = (e) => {
    const { name, value } = e.target;

    if (name === "semester_id") {
      const selectedSemester = semesters.find((s) => s._id === value);

      if (selectedSemester) {
        if (selectedSemester.calculated_status === "Đã kết thúc") {
          setIsSubjectSelectionDisabled(true);
          setTeachingClassForm((prevForm) => ({
            ...prevForm,
            semester_id: value,
            subject_id: "",
          }));
          // enqueueSnackbar(
          //   `Học kỳ '${selectedSemester.name}' đã kết thúc. Môn học đã được bỏ chọn và không thể gán mới.`,
          //   { variant: "warning", autoHideDuration: 7000 }
          // );
        } else {
          setIsSubjectSelectionDisabled(false);
          setTeachingClassForm((prevForm) => ({
            ...prevForm,
            semester_id: value,
          }));
        }
        const formatDate = (dateString) => {
          const date = new Date(dateString);
          return date.toLocaleDateString("vi-VN");
        };
        // Giữ lại snackbar thông tin về thời gian học kỳ nếu bạn thấy cần thiết, hoặc xóa nếu không muốn thông báo nào cả.
        // enqueueSnackbar(
        //   `Thời gian học kỳ ${selectedSemester.name}: ${formatDate(selectedSemester.start_date)} - ${formatDate(selectedSemester.end_date)}.`,
        //   { variant: "info", autoHideDuration: 8000 }
        // );
      } else {
        setIsSubjectSelectionDisabled(false);
        setTeachingClassForm((prevForm) => ({
          ...prevForm,
          semester_id: value,
        }));
      }
    } else {
      setTeachingClassForm((prevForm) => ({ ...prevForm, [name]: value }));
    }

    if (name in formErrors.teaching && String(value).trim() !== "") {
      setFormErrors({
        ...formErrors,
        teaching: {
          ...formErrors.teaching,
          [name]: false,
        },
      });
    }
  };

  // Thêm hàm validateMainClassForm
  const validateMainClassForm = () => {
    const errors = {
      name: !mainClassForm.name,
      class_code: !mainClassForm.class_code,
      selected_department_id: !mainClassForm.selected_department_id,
      major_id: !mainClassForm.major_id,
    };
    setFormErrors((prev) => ({ ...prev, main: errors }));
    return (
      !errors.name &&
      !errors.class_code &&
      !errors.selected_department_id &&
      !errors.major_id
    );
  };

  // Thêm hàm validateTeachingClassForm
  const validateTeachingClassForm = () => {
    const errors = {
      class_name: teachingClassForm.class_name.trim() === "",
      class_code: teachingClassForm.class_code.trim() === "",
      subject_id: teachingClassForm.subject_id === "",
      semester_id: teachingClassForm.semester_id === "",
    };

    setFormErrors({
      ...formErrors,
      teaching: errors,
    });

    return !Object.values(errors).some(Boolean);
  };

  // Cập nhật hàm handleFormSubmit để tải lại danh sách lớp chính sau khi thêm/sửa
  const handleFormSubmit = async () => {
    try {
      let isValid = false;

      if (tabValue === 0) {
        isValid = validateMainClassForm();
        if (!isValid) {
          enqueueSnackbar("Vui lòng điền đầy đủ thông tin bắt buộc", {
            variant: "error",
          });
          return;
        }

        // Main class
        const payload = {
          name: mainClassForm.name,
          class_code: mainClassForm.class_code,
          major_id: mainClassForm.major_id, // Correctly send major_id
          advisor_id: mainClassForm.advisor_id || null,
          year_start: parseInt(mainClassForm.year_start, 10),
          year_end: parseInt(mainClassForm.year_end, 10),
        };

        if (dialogMode === "create") {
          await axios.post(`${API_URL}/classes/main`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
          enqueueSnackbar("Tạo lớp chính mới thành công", {
            variant: "success",
          });
        } else {
          await axios.put(
            `${API_URL}/classes/main/${selectedClass._id}`,
            payload,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          enqueueSnackbar("Cập nhật lớp chính thành công", {
            variant: "success",
          });
        }
        // Tải lại danh sách lớp chính sau khi cập nhật
        loadMainClasses();
      } else {
        isValid = validateTeachingClassForm();
        if (!isValid) {
          enqueueSnackbar("Vui lòng điền đầy đủ thông tin bắt buộc", {
            variant: "error",
          });
          return;
        }

        // Teaching class
        if (dialogMode === "create") {
          await axios.post(`${API_URL}/classes/teaching`, teachingClassForm, {
            headers: { Authorization: `Bearer ${token}` },
          });
          enqueueSnackbar("Tạo lớp giảng dạy mới thành công", {
            variant: "success",
          });
        } else {
          await axios.put(
            `${API_URL}/classes/teaching/${selectedClass._id}`,
            teachingClassForm,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          enqueueSnackbar("Cập nhật lớp giảng dạy thành công", {
            variant: "success",
          });
        }
      }

      setDialogOpen(false);
      loadClasses();
      loadStats(); // Cập nhật lại thống kê sau khi thao tác
    } catch (error) {
      console.error("Lỗi khi thao tác với lớp học:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi thao tác với lớp học",
        { variant: "error" }
      );
    }
  };

  // Mở hộp thoại xóa
  const openDeleteDialog = (classItem) => {
    setDeleteDialog({
      open: true,
      item: classItem,
    });
  };

  // Mở hộp thoại quản lý sinh viên
  const openStudentApproval = async (classItem) => {
    try {
      setStudentApprovalDialog({
        ...studentApprovalDialog,
        open: true,
        classItem: classItem,
        loading: true,
      });

      // Lấy danh sách sinh viên chờ duyệt
      const pendingResponse = await axios.get(
        `${API_URL}/classes/main/${classItem._id}/pending-students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Lấy danh sách sinh viên đã được duyệt
      const approvedResponse = await axios.get(
        `${API_URL}/classes/main/${classItem._id}/approved-students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStudentApprovalDialog({
        ...studentApprovalDialog,
        open: true,
        classItem: classItem,
        pendingStudents: pendingResponse.data.data || [],
        approvedStudents: approvedResponse.data.data?.students || [],
        loading: false,
      });
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sinh viên:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu sinh viên", { variant: "error" });
      setStudentApprovalDialog({
        ...studentApprovalDialog,
        loading: false,
      });
    }
  };

  // Đóng hộp thoại quản lý sinh viên
  const closeStudentApproval = () => {
    setStudentApprovalDialog((prevState) => ({
      ...prevState,
      open: false,
      classItem: null,
      // tabValue: 0, // Keep current tab or reset as needed
      // pendingStudents: [], // Don't clear if re-opening same class dialog
      // approvedStudents: [],
      loading: false,
      rejectDialog: {
        open: false,
        studentId: null,
        reason: "",
      },
      studentToDeleteFromMainClass: null,
      confirmDeleteMainClassStudentDialogOpen: false,
    }));
  };

  // Xử lý thay đổi tab trong quản lý sinh viên
  const handleApprovalTabChange = (event, newValue) => {
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      tabValue: newValue,
    });
  };

  // Phê duyệt sinh viên
  const handleApproveStudent = async (studentId) => {
    try {
      const { classItem } = studentApprovalDialog;

      await axios.put(
        `${API_URL}/classes/main/${classItem._id}/approve-student/${studentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      enqueueSnackbar("Phê duyệt sinh viên thành công", { variant: "success" });

      // Cập nhật lại danh sách
      openStudentApproval(classItem);
    } catch (error) {
      console.error("Lỗi khi phê duyệt sinh viên:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi phê duyệt sinh viên",
        { variant: "error" }
      );
    }
  };

  // Mở dialog từ chối sinh viên
  const openRejectDialog = (studentId) => {
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      rejectDialog: {
        open: true,
        studentId,
        reason: "",
      },
    });
  };

  // Đóng dialog từ chối sinh viên
  const closeRejectDialog = () => {
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      rejectDialog: {
        open: false,
        studentId: null,
        reason: "",
      },
    });
  };

  // Từ chối sinh viên
  const handleRejectStudent = async () => {
    try {
      const { classItem, rejectDialog } = studentApprovalDialog;

      await axios.put(
        `${API_URL}/classes/main/${classItem._id}/reject-student/${rejectDialog.studentId}`,
        { reason: rejectDialog.reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      enqueueSnackbar("Đã từ chối sinh viên", { variant: "success" });
      closeRejectDialog();

      // Cập nhật lại danh sách
      openStudentApproval(classItem);
    } catch (error) {
      console.error("Lỗi khi từ chối sinh viên:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi từ chối sinh viên",
        { variant: "error" }
      );
    }
  };

  // Xử lý thay đổi lý do từ chối
  const handleRejectReasonChange = (e) => {
    setStudentApprovalDialog({
      ...studentApprovalDialog,
      rejectDialog: {
        ...studentApprovalDialog.rejectDialog,
        reason: e.target.value,
      },
    });
  };

  // Xử lý xóa lớp
  const handleDeleteClass = async () => {
    // Đảm bảo deleteDialog.item và deleteDialog.item._id tồn tại
    if (!deleteDialog.item || !deleteDialog.item._id) {
      enqueueSnackbar("Không thể xác định mục để xóa. Vui lòng thử lại.", {
        variant: "error",
      });
      setDeleteDialog({ open: false, item: null }); // Đóng dialog và reset
      return;
    }

    try {
      const endpoint = tabValue === 0 ? "classes/main" : "classes/teaching";

      // Sử dụng deleteDialog.item._id thay vì selectedClass._id
      await axios.delete(`${API_URL}/${endpoint}/${deleteDialog.item._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      enqueueSnackbar(
        `Xóa ${tabValue === 0 ? "lớp chính" : "lớp giảng dạy"} thành công`,
        { variant: "success" }
      );
      setDeleteDialog({ open: false, item: null }); // Reset cả item
      loadClasses();
      if (tabValue === 0) {
        loadMainClasses(); // Tải lại danh sách lớp chính nếu xóa lớp chính
      }
      loadStats(); // Cập nhật lại thống kê sau khi thao tác
    } catch (error) {
      console.error(
        `Lỗi khi xóa ${tabValue === 0 ? "lớp chính" : "lớp giảng dạy"}:`,
        error
      );
      enqueueSnackbar(
        error.response?.data?.message ||
          `Lỗi khi xóa ${tabValue === 0 ? "lớp chính" : "lớp giảng dạy"}`,
        { variant: "error" }
      );
      setDeleteDialog({ open: false, item: null }); // Reset cả item khi có lỗi
    }
  };

  // Cập nhật hàm loadStats để sử dụng API endpoint mới
  const loadStats = async () => {
    try {
      const mainClassResponse = await axios.get(
        `${API_URL}/classes/main-statistics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const teachingClassResponse = await axios.get(
        `${API_URL}/classes/teaching-statistics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const userStatsResponse = await axios.get(`${API_URL}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats({
        mainClasses: mainClassResponse.data.totalCount || 0,
        teachingClasses: teachingClassResponse.data.totalCount || 0,
        students: userStatsResponse.data.approvedStudents || 0,
        teachers: userStatsResponse.data.approvedTeachers || 0,
      });
    } catch (error) {
      console.error("Lỗi khi tải thống kê:", error);
      // Tiếp tục hiển thị giao diện ngay cả khi không thể tải thống kê
    }
  };

  // Thêm lại hàm handleStudentSelection bị xóa nhầm
  const handleStudentSelection = (event, newValue) => {
    if (tabValue === 0) {
      setMainClassForm({
        ...mainClassForm,
        students: newValue.map((student) => student._id),
      });
    } else {
      setTeachingClassForm({
        ...teachingClassForm,
        selected_students: newValue.map((student) => student._id),
      });
    }
  };

  // Thêm hàm tải danh sách lớp chính
  const loadMainClasses = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/classes/main?all=true&sort=name`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMainClasses(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp chính:", error);
      enqueueSnackbar("Không thể tải danh sách lớp chính", {
        variant: "error",
      });
    }
  };

  // Handlers for viewing teaching class students dialog
  const handleOpenViewTeachingClassStudentsDialog = async (classItem) => {
    setViewTeachingClassStudentsDialog({
      open: true,
      classItem,
      students: [],
      loading: true,
      studentToDelete: null,
      confirmDeleteDialogOpen: false,
    });
    try {
      const response = await axios.get(
        `${API_URL}/classes/teaching/${classItem._id}/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setViewTeachingClassStudentsDialog({
        open: true,
        classItem,
        students: response.data.data || [],
        loading: false,
        studentToDelete: null,
        confirmDeleteDialogOpen: false,
      });
    } catch (error) {
      console.error("Lỗi khi tải danh sách sinh viên lớp giảng dạy:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi tải danh sách sinh viên",
        { variant: "error" }
      );
      setViewTeachingClassStudentsDialog({
        open: true,
        classItem,
        students: [],
        loading: false,
        studentToDelete: null,
        confirmDeleteDialogOpen: false,
      });
    }
  };

  const handleCloseViewTeachingClassStudentsDialog = () => {
    setViewTeachingClassStudentsDialog({
      open: false,
      classItem: null,
      students: [],
      loading: false,
      studentToDelete: null,
      confirmDeleteDialogOpen: false,
    });
  };

  const handleOpenConfirmDeleteStudentDialog = (student) => {
    setViewTeachingClassStudentsDialog((prevState) => ({
      ...prevState,
      studentToDelete: student,
      confirmDeleteDialogOpen: true,
    }));
  };

  const handleCloseConfirmDeleteStudentDialog = () => {
    setViewTeachingClassStudentsDialog((prevState) => ({
      ...prevState,
      studentToDelete: null,
      confirmDeleteDialogOpen: false,
    }));
  };

  const handleDeleteStudentFromTeachingClass = async () => {
    if (
      !viewTeachingClassStudentsDialog.classItem ||
      !viewTeachingClassStudentsDialog.studentToDelete
    )
      return;

    const classId = viewTeachingClassStudentsDialog.classItem._id;
    const studentId = viewTeachingClassStudentsDialog.studentToDelete._id;

    try {
      await axios.delete(
        `${API_URL}/classes/teaching/${classId}/students/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      enqueueSnackbar("Xóa sinh viên khỏi lớp thành công", {
        variant: "success",
      });
      // Refresh student list in dialog
      setViewTeachingClassStudentsDialog((prevState) => ({
        ...prevState,
        students: prevState.students.filter((s) => s._id !== studentId),
        studentToDelete: null,
        confirmDeleteDialogOpen: false,
      }));
      // Optionally, reload all classes if student count on the main table needs update
      // loadClasses();
    } catch (error) {
      console.error("Lỗi khi xóa sinh viên:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi xóa sinh viên",
        { variant: "error" }
      );
      handleCloseConfirmDeleteStudentDialog();
    }
  };

  const handleOpenConfirmDeleteMainClassStudentDialog = (student) => {
    setStudentApprovalDialog((prevState) => ({
      ...prevState,
      studentToDeleteFromMainClass: student,
      confirmDeleteMainClassStudentDialogOpen: true,
    }));
  };

  const handleCloseConfirmDeleteMainClassStudentDialog = () => {
    setStudentApprovalDialog((prevState) => ({
      ...prevState,
      studentToDeleteFromMainClass: null,
      confirmDeleteMainClassStudentDialogOpen: false,
    }));
  };

  const handleDeleteStudentFromMainClass = async () => {
    if (
      !studentApprovalDialog.classItem ||
      !studentApprovalDialog.studentToDeleteFromMainClass
    )
      return;

    const classId = studentApprovalDialog.classItem._id;
    const studentId = studentApprovalDialog.studentToDeleteFromMainClass._id;

    try {
      await axios.delete(
        `${API_URL}/classes/main/${classId}/students/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      enqueueSnackbar("Xóa sinh viên khỏi lớp chính thành công", {
        variant: "success",
      });
      setStudentApprovalDialog((prevState) => ({
        ...prevState,
        approvedStudents: prevState.approvedStudents.filter(
          (s) => s._id !== studentId
        ),
        studentToDeleteFromMainClass: null,
        confirmDeleteMainClassStudentDialogOpen: false,
      }));
      // Optionally, reload main classes if student count on the main table needs update
      // loadClasses();
    } catch (error) {
      console.error("Lỗi khi xóa sinh viên khỏi lớp chính:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi xóa sinh viên khỏi lớp chính",
        { variant: "error" }
      );
      handleCloseConfirmDeleteMainClassStudentDialog();
    }
  };

  // Render main class table
  const renderMainClassesTable = () => (
    <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={{ bgcolor: "#f5f5f5" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>Tên lớp</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Mã lớp</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Ngành</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Khoa</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>
              Giáo viên chủ nhiệm
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Năm BĐ</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Năm KT</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold" }}>
              Số lượng SV
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>
              Hành động
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} align="center">
                {" "}
                {/* Increased colSpan from 6 to 8 */}
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              </TableCell>
            </TableRow>
          ) : mainClasses.length === 0 ? ( // Sử dụng mainClasses ở đây
            <TableRow>
              <TableCell colSpan={8} align="center">
                {" "}
                {/* Increased colSpan from 6 to 8 */}
                <Box sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    Không tìm thấy lớp học nào
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    onClick={clearFilters}
                    sx={{ mt: 1 }}
                  >
                    Xóa bộ lọc
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            mainClasses.map(
              (
                classItem // Sử dụng mainClasses ở đây
              ) => (
                <TableRow
                  key={classItem._id}
                  hover
                  sx={{ "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" } }}
                >
                  <TableCell>
                    <Typography variant="body1">{classItem.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={classItem.class_code}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {classItem.major_id?.name ? (
                      <Chip
                        label={classItem.major_id.name}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="N/A" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {classItem.major_id?.department_id?.name ? (
                      <Chip
                        label={classItem.major_id.department_id.name}
                        size="small"
                        sx={{ bgcolor: "#e3f2fd" }}
                      />
                    ) : (
                      <Chip
                        label="N/A" // Changed from "Chưa phân khoa"
                        size="small"
                        variant="outlined"
                        color="default"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {classItem.advisor_id?.full_name ? (
                      <Box>
                        <Typography variant="body2">
                          {classItem.advisor_id.full_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {classItem.advisor_id.email || ""}
                        </Typography>
                      </Box>
                    ) : (
                      <Chip
                        label="Chưa phân công"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>{classItem.year_start || "N/A"}</TableCell>
                  <TableCell>{classItem.year_end || "N/A"}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={classItem.students?.length || 0}
                      color={
                        classItem.students?.length > 0 ? "success" : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end">
                      <Tooltip title="Sửa lớp">
                        <IconButton
                          color="primary"
                          onClick={() => openDialog("edit", classItem)}
                          size="small"
                          sx={{ mx: 0.5 }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa lớp">
                        <IconButton
                          color="error"
                          onClick={() => openDeleteDialog(classItem)}
                          size="small"
                          sx={{ mx: 0.5 }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Quản lý sinh viên Lớp Chính">
                        <IconButton
                          color="info"
                          onClick={() => openStudentApproval(classItem)}
                          size="small"
                          sx={{ mx: 0.5 }}
                        >
                          <People fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              )
            )
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Dòng mỗi trang:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count}`
        }
      />
    </TableContainer>
  );

  // Render teaching class table
  const renderTeachingClassesTable = () => (
    <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={{ bgcolor: "#f5f5f5" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>Tên lớp</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Môn học</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Kỳ học</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Giáo viên</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Lớp chính</TableCell>
            <TableCell align="center" sx={{ fontWeight: "bold" }}>
              Số lượng SV
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>
              Hành động
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              </TableCell>
            </TableRow>
          ) : classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    Không tìm thấy lớp học nào
                  </Typography>
                  <Button
                    variant="text"
                    color="primary"
                    onClick={clearFilters}
                    sx={{ mt: 1 }}
                  >
                    Xóa bộ lọc
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            classes.map((classItem) => (
              <TableRow
                key={classItem._id}
                hover
                sx={{ "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" } }}
              >
                <TableCell>
                  <Typography variant="body1">
                    {classItem.class_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {classItem.subject_id?.name || classItem.course_id?.name ? (
                    <Box>
                      <Typography variant="body2">
                        {classItem.subject_id?.name ||
                          classItem.course_id?.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {classItem.subject_id?.code ||
                          classItem.course_id?.code ||
                          ""}
                      </Typography>
                    </Box>
                  ) : (
                    <Chip label="N/A" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  {classItem.semester_id ? (
                    <Chip
                      label={classItem.semester_id.name}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Không xác định"
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {classItem.teacher_id?.full_name ? (
                    <Box>
                      <Typography variant="body2">
                        {classItem.teacher_id.full_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {classItem.teacher_id.email || ""}
                      </Typography>
                    </Box>
                  ) : (
                    <Chip
                      label="Chưa phân công"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {classItem.main_class_id?.name ? (
                    <Chip
                      label={classItem.main_class_id.name}
                      size="small"
                      sx={{ bgcolor: "#e3f2fd" }}
                    />
                  ) : (
                    <Chip
                      label="Không có"
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={classItem.students?.length || 0}
                    color={
                      classItem.students?.length > 0 ? "success" : "default"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end">
                    <Tooltip title="Sửa lớp">
                      <IconButton
                        color="primary"
                        onClick={() => openDialog("edit", classItem)}
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa lớp">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(classItem)}
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xem Sinh viên Lớp Giảng Dạy">
                      <IconButton
                        color="secondary"
                        onClick={() =>
                          handleOpenViewTeachingClassStudentsDialog(classItem)
                        }
                        size="small"
                        sx={{ mx: 0.5 }}
                      >
                        <Group fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Dòng mỗi trang:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count}`
        }
      />
    </TableContainer>
  );

  // Render main class form dialog
  const renderMainClassFormDialog = () => (
    <Dialog
      open={dialogOpen && tabValue === 0}
      onClose={() => setDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {dialogMode === "create" ? "Thêm lớp chính mới" : "Sửa lớp chính"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label="Tên lớp"
              fullWidth
              required
              value={mainClassForm.name}
              onChange={handleMainClassFormChange}
              error={formErrors.main.name}
              helperText={
                formErrors.main.name ? "Tên lớp không được để trống" : ""
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="class_code"
              label="Mã lớp"
              fullWidth
              required
              value={mainClassForm.class_code}
              onChange={handleMainClassFormChange}
              error={formErrors.main.code}
              helperText={
                formErrors.main.code
                  ? "Mã lớp không được để trống"
                  : "Nhập đầy đủ mã lớp (VD: D22CQCN02-N)"
              }
              placeholder="VD: D22CQCN02-N"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              error={formErrors.main.selected_department_id}
            >
              <InputLabel>Khoa</InputLabel>
              <Select
                name="selected_department_id"
                value={mainClassForm.selected_department_id}
                onChange={async (e) => {
                  const newDeptId = e.target.value;
                  setMainClassForm((prev) => ({
                    ...prev,
                    selected_department_id: newDeptId,
                    major_id: "", // Reset major when department changes
                  }));
                  // setFilteredMajors([]); // Removed, loadMajorsByDepartment or explicit clear below will handle
                  if (newDeptId) {
                    await loadMajorsByDepartment(newDeptId);
                  } else {
                    setFilteredMajors([]); // Explicitly clear if no department is selected
                  }
                  // Validate again if needed, or on submit
                  if (formErrors.main.selected_department_id && newDeptId) {
                    setFormErrors((prev) => ({
                      ...prev,
                      main: { ...prev.main, selected_department_id: false },
                    }));
                  }
                }}
                label="Khoa"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.main.selected_department_id && (
                <FormHelperText>Vui lòng chọn khoa</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={formErrors.main.major_id}>
              <InputLabel>Ngành</InputLabel>
              <Select
                name="major_id"
                value={mainClassForm.major_id}
                onChange={(e) => {
                  handleMainClassFormChange(e);
                  // Validate again if needed, or on submit
                  if (formErrors.main.major_id && e.target.value) {
                    setFormErrors((prev) => ({
                      ...prev,
                      main: { ...prev.main, major_id: false },
                    }));
                  }
                }}
                label="Ngành"
                disabled={
                  !mainClassForm.selected_department_id ||
                  isLoadingMajors ||
                  filteredMajors.length === 0
                }
              >
                <MenuItem value="">
                  <em>
                    {!mainClassForm.selected_department_id
                      ? "Vui lòng chọn khoa trước"
                      : isLoadingMajors
                      ? "Đang tải ngành..."
                      : "Chọn Ngành"}
                  </em>
                </MenuItem>
                {filteredMajors.map((major) => (
                  <MenuItem key={major._id} value={major._id}>
                    {major.name} ({major.code})
                  </MenuItem>
                ))}
              </Select>
              {formErrors.main.major_id && (
                <FormHelperText>Vui lòng chọn ngành</FormHelperText>
              )}
              {mainClassForm.selected_department_id &&
                filteredMajors.length === 0 &&
                !isLoadingMajors && (
                  <FormHelperText>
                    Không có ngành nào thuộc khoa đã chọn.
                  </FormHelperText>
                )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              id="advisor-select"
              options={teachers}
              getOptionLabel={(option) =>
                `${option.full_name} ${option.email ? `(${option.email})` : ""}`
              }
              value={
                teachers.find((t) => t._id === mainClassForm.advisor_id) || null
              }
              onChange={(event, newValue) => {
                setMainClassForm({
                  ...mainClassForm,
                  advisor_id: newValue?._id || "",
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Giáo viên chủ nhiệm"
                  variant="outlined"
                  fullWidth
                  helperText="Quan trọng: Mỗi lớp cần có một giáo viên chủ nhiệm"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.email}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="year_start"
              label="Năm bắt đầu"
              type="number"
              fullWidth
              value={mainClassForm.year_start}
              onChange={handleMainClassFormChange}
              helperText="Năm học bắt đầu (VD: 2021)"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="year_end"
              label="Năm kết thúc"
              type="number"
              fullWidth
              value={mainClassForm.year_end}
              onChange={handleMainClassFormChange}
              helperText="Năm học dự kiến kết thúc (VD: 2025)"
            />
          </Grid>
          <Grid item xs={12}>
            <FormHelperText sx={{ mt: 1, fontStyle: "italic" }}>
              Lưu ý: Sinh viên sẽ do giáo viên chủ nhiệm quản lý và thêm vào lớp
              sau khi lớp được tạo và giáo viên được phân công.
            </FormHelperText>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions
        sx={{ p: 2, justifyContent: "space-between", bgcolor: "grey.50" }}
      >
        <Button
          onClick={() => setDialogOpen(false)}
          variant="outlined"
          color="inherit"
        >
          Hủy
        </Button>
        <Button
          onClick={handleFormSubmit}
          variant="contained"
          color="primary"
          disabled={
            isLoading ||
            !mainClassForm.name ||
            !mainClassForm.class_code ||
            !mainClassForm.major_id
          } // Added major_id to disable condition
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : dialogMode === "create" ? (
            "Tạo mới"
          ) : (
            "Cập nhật"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render teaching class form dialog
  const renderTeachingClassFormDialog = () => (
    <Dialog
      open={dialogOpen && tabValue === 1}
      onClose={() => setDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {dialogMode === "create"
          ? "Thêm lớp giảng dạy mới"
          : "Sửa lớp giảng dạy"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              name="class_name"
              label="Tên lớp"
              fullWidth
              required
              value={teachingClassForm.class_name}
              onChange={handleTeachingClassFormChange}
              error={formErrors.teaching.class_name}
              helperText={
                formErrors.teaching.class_name
                  ? "Tên lớp không được để trống"
                  : ""
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="class_code"
              label="Mã lớp"
              fullWidth
              required
              value={teachingClassForm.class_code}
              onChange={handleTeachingClassFormChange}
              placeholder="VD: IT4060.TH01.N22"
              helperText="Mã định danh của lớp học phần"
              error={formErrors.teaching.class_code}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              required
              error={formErrors.teaching.subject_id}
            >
              <InputLabel>Môn học</InputLabel>
              <Select
                name="subject_id"
                value={teachingClassForm.subject_id}
                onChange={handleTeachingClassFormChange}
                label="Môn học"
                disabled={isSubjectSelectionDisabled}
              >
                {subjects.map((subject) => (
                  <MenuItem key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </MenuItem>
                ))}
              </Select>
              {formErrors.teaching.subject_id &&
                !isSubjectSelectionDisabled && (
                  <FormHelperText>Vui lòng chọn môn học</FormHelperText>
                )}
              {isSubjectSelectionDisabled && (
                <FormHelperText error>
                  Không thể chọn/thay đổi môn học cho học kỳ đã kết thúc.
                </FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              id="teacher-select"
              options={teachers}
              getOptionLabel={(option) =>
                `${option.full_name} ${option.email ? `(${option.email})` : ""}`
              }
              value={
                teachers.find((t) => t._id === teachingClassForm.teacher_id) ||
                null
              }
              onChange={(event, newValue) => {
                setTeachingClassForm({
                  ...teachingClassForm,
                  teacher_id: newValue?._id || "",
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Giáo viên"
                  variant="outlined"
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.email}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={12}>
            <FormControl
              fullWidth
              required
              error={formErrors.teaching.semester_id}
            >
              <InputLabel>Học kỳ</InputLabel>
              <Select
                name="semester_id"
                value={teachingClassForm.semester_id}
                onChange={handleTeachingClassFormChange}
                label="Học kỳ"
                disabled={isSemesterSelectionDisabled}
              >
                <MenuItem value="">
                  <em>Không chọn</em>
                </MenuItem>
                {semesters
                  .filter(
                    (sem) =>
                      sem.calculated_status === "Chưa bắt đầu" ||
                      sem.calculated_status === "Đang diễn ra"
                  )
                  .map((semester) => (
                    <MenuItem key={semester._id} value={semester._id}>
                      {semester.name} ({semester.year})
                      {semester.is_current && (
                        <Chip
                          label="Hiện tại"
                          color="success"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </MenuItem>
                  ))}
              </Select>
              {formErrors.teaching.semester_id &&
                !isSemesterSelectionDisabled && (
                  <FormHelperText>Vui lòng chọn học kỳ</FormHelperText>
                )}
              {isSemesterSelectionDisabled && (
                <FormHelperText error>
                  Không thể thay đổi học kỳ vì lớp học này thuộc về một học kỳ
                  đã kết thúc.
                </FormHelperText>
              )}
              {/* Hiển thị thông tin thời gian của học kỳ đã chọn */}
              {!isSemesterSelectionDisabled &&
                teachingClassForm.semester_id &&
                (() => {
                  const selectedSemesterInfo = semesters.find(
                    (s) => s._id === teachingClassForm.semester_id
                  );
                  if (
                    selectedSemesterInfo &&
                    selectedSemesterInfo.start_date &&
                    selectedSemesterInfo.end_date
                  ) {
                    const formatDate = (dateString) => {
                      const date = new Date(dateString);
                      return date.toLocaleDateString("vi-VN");
                    };
                    return (
                      <FormHelperText sx={{ color: "text.secondary", mt: 0.5 }}>
                        Thời gian học kỳ:{" "}
                        {formatDate(selectedSemesterInfo.start_date)} -{" "}
                        {formatDate(selectedSemesterInfo.end_date)}
                      </FormHelperText>
                    );
                  }
                  return null;
                })()}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12}>
            <Autocomplete
              id="main-class-select"
              options={mainClasses}
              getOptionLabel={(option) =>
                `${option.name} (${option.class_code})`
              }
              value={
                mainClasses.find(
                  (cls) => cls._id === teachingClassForm.main_class_id
                ) || null
              }
              onChange={(event, newValue) => {
                setTeachingClassForm({
                  ...teachingClassForm,
                  main_class_id: newValue?._id || "",
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Lớp chính" fullWidth />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.class_code}
                    </Typography>
                  </Box>
                </li>
              )}
            />
            <FormHelperText>
              Liên kết với lớp chính (không bắt buộc).
            </FormHelperText>
          </Grid>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 1 }}>
              <strong>Lưu ý:</strong> Sau khi tạo lớp thành công, giáo viên cần
              vào mục 'Chỉnh sửa lớp học' (biểu tượng cây bút) để thiết lập lịch
              học chi tiết, quản lý danh sách sinh viên và các thông tin khác.
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions
        sx={{ p: 2, justifyContent: "space-between", bgcolor: "grey.50" }}
      >
        <Button
          onClick={() => setDialogOpen(false)}
          variant="outlined"
          color="inherit"
        >
          Hủy
        </Button>
        <Button
          onClick={handleFormSubmit}
          variant="contained"
          color="primary"
          disabled={
            !teachingClassForm.class_name ||
            !teachingClassForm.class_code ||
            (!isSubjectSelectionDisabled && !teachingClassForm.subject_id) || // Chỉ kiểm tra subject_id nếu không bị disable
            (!isSemesterSelectionDisabled && !teachingClassForm.semester_id) // Chỉ kiểm tra semester_id nếu không bị disable
          }
        >
          {dialogMode === "create" ? "Tạo mới" : "Cập nhật"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Thêm component hiển thị thống kê
  const renderStatCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #3f51b5",
            boxShadow: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Lớp chính
            </Typography>
            <Typography variant="h4">{stats.mainClasses}</Typography>
          </CardContent>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{
              p: 1.5,
              bgcolor: "rgba(63, 81, 181, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => {
              setTabValue(0);
              clearFilters();
            }}
          >
            <School fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">Xem tất cả lớp chính</Typography>
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #f50057",
            boxShadow: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Lớp giảng dạy
            </Typography>
            <Typography variant="h4">{stats.teachingClasses}</Typography>
          </CardContent>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{
              p: 1.5,
              bgcolor: "rgba(245, 0, 87, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => {
              setTabValue(1);
              clearFilters();
            }}
          >
            <People fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">Xem tất cả lớp giảng dạy</Typography>
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #4caf50",
            boxShadow: 2,
            height: "100%",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Sinh viên
            </Typography>
            <Typography variant="h4">{stats.students}</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Tổng số sinh viên đã phê duyệt
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card
          sx={{
            borderLeft: "4px solid #ff9800",
            boxShadow: 2,
            height: "100%",
          }}
        >
          <CardContent>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Giáo viên
            </Typography>
            <Typography variant="h4">{stats.teachers}</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Tổng số giáo viên đã phê duyệt
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Thêm component hiển thị thẻ thông tin khi không có dữ liệu
  const renderEmptyState = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 5,
        px: 2,
        bgcolor: "#f5f5f5",
        borderRadius: 2,
      }}
    >
      <Box sx={{ mb: 2 }}>
        {tabValue === 0 ? (
          <School sx={{ fontSize: 60, color: "#3f51b5" }} />
        ) : (
          <People sx={{ fontSize: 60, color: "#f50057" }} />
        )}
      </Box>
      <Typography variant="h6" gutterBottom>
        {tabValue === 0 ? "Chưa có lớp chính nào" : "Chưa có lớp giảng dạy nào"}
      </Typography>
      <Typography
        variant="body2"
        color="textSecondary"
        align="center"
        sx={{ mb: 3 }}
      >
        {tabValue === 0
          ? "Lớp chính dùng để quản lý danh sách sinh viên theo khóa học và khoa phòng. Mỗi lớp chính có một giáo viên chủ nhiệm."
          : "Lớp giảng dạy dùng để quản lý các môn học cụ thể. Mỗi lớp giảng dạy có một giáo viên giảng dạy và có thể liên kết với lớp chính."}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={() => openDialog("create")}
      >
        {tabValue === 0 ? "Tạo lớp chính mới" : "Tạo lớp giảng dạy mới"}
      </Button>
    </Box>
  );

  // Render dialog for viewing teaching class students
  const renderViewTeachingClassStudentsDialog = () => (
    <>
      <Dialog
        open={viewTeachingClassStudentsDialog.open}
        onClose={handleCloseViewTeachingClassStudentsDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Danh sách sinh viên -{" "}
          {viewTeachingClassStudentsDialog.classItem?.class_name}
        </DialogTitle>
        <DialogContent>
          {viewTeachingClassStudentsDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : viewTeachingClassStudentsDialog.students.length === 0 ? (
            <Alert severity="info">Lớp này chưa có sinh viên nào.</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Họ tên</TableCell>
                    <TableCell>MSSV</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewTeachingClassStudentsDialog.students.map(
                    (student, index) => (
                      <TableRow key={student._id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{student.full_name}</TableCell>
                        <TableCell>
                          {student.school_info?.student_id || "N/A"}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="Xóa sinh viên này khỏi lớp">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleOpenConfirmDeleteStudentDialog(student)
                              }
                            >
                              <DeleteForever fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseViewTeachingClassStudentsDialog}
            color="primary"
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for deleting student from teaching class */}
      <Dialog
        open={viewTeachingClassStudentsDialog.confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDeleteStudentDialog}
        maxWidth="xs"
      >
        <DialogTitle>Xác nhận xóa sinh viên</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Bạn có chắc chắn muốn xóa sinh viên `}
            <strong>
              {viewTeachingClassStudentsDialog.studentToDelete?.full_name}
            </strong>
            {` (MSSV: `}
            <strong>
              {viewTeachingClassStudentsDialog.studentToDelete?.school_info
                ?.student_id || "N/A"}
            </strong>
            {`) khỏi lớp này không? Tất cả dữ liệu điểm danh và điểm số liên quan của sinh viên này trong lớp sẽ bị xóa.`}
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
            onClick={handleDeleteStudentFromTeachingClass}
            color="error"
            autoFocus
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // Render dialog for viewing students of a main class (studentApprovalDialog)
  const renderViewMainClassStudentsDialog = () => (
    <>
      <Dialog
        open={studentApprovalDialog.open}
        onClose={closeStudentApproval}
        maxWidth="lg" // Changed from md to lg for more space
        fullWidth
      >
        <DialogTitle>
          Quản lý sinh viên - {studentApprovalDialog.classItem?.name}
        </DialogTitle>
        <DialogContent>
          {studentApprovalDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ width: "100%" }}>
              <Tabs
                value={studentApprovalDialog.tabValue}
                onChange={handleApprovalTabChange}
                indicatorColor="primary"
                textColor="primary"
                centered
              >
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <AccessTime sx={{ mr: 1 }} />
                      Sinh viên chờ duyệt{" "}
                      {studentApprovalDialog.pendingStudents.length > 0 && (
                        <Chip
                          label={studentApprovalDialog.pendingStudents.length}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <School sx={{ mr: 1 }} />
                      Sinh viên của lớp
                    </Box>
                  }
                />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {studentApprovalDialog.tabValue === 0 && ( // Pending Students Tab
                  <>
                    {studentApprovalDialog.pendingStudents.length === 0 ? (
                      <Alert severity="info">
                        Không có sinh viên nào đang chờ phê duyệt
                      </Alert>
                    ) : (
                      <List>
                        {studentApprovalDialog.pendingStudents.map(
                          (student) => (
                            <ListItem
                              key={student._id}
                              sx={{
                                mb: 1,
                                border: "1px solid #e0e0e0",
                                borderRadius: 1,
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar src={student.avatar_url}>
                                  {student.full_name.charAt(0).toUpperCase()}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {student.full_name}
                                    <Chip
                                      label="Chờ duyệt"
                                      color="warning"
                                      size="small"
                                      sx={{ ml: 1 }}
                                    />
                                  </Box>
                                }
                                secondary={
                                  <>
                                    <Typography variant="body2">
                                      Email: {student.email}
                                    </Typography>
                                    <Typography variant="body2">
                                      MSSV:{" "}
                                      {student.school_info?.student_id ||
                                        "Chưa có mã SV"}
                                    </Typography>
                                    <Typography variant="body2">
                                      Ngày đăng ký:{" "}
                                      {new Date(
                                        student.created_at
                                      ).toLocaleDateString("vi-VN")}
                                    </Typography>
                                  </>
                                }
                              />
                              <ListItemSecondaryAction>
                                <Tooltip title="Phê duyệt">
                                  <IconButton
                                    edge="end"
                                    color="success"
                                    onClick={() =>
                                      handleApproveStudent(student._id)
                                    }
                                  >
                                    <Check />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Từ chối">
                                  <IconButton
                                    edge="end"
                                    color="error"
                                    onClick={() =>
                                      openRejectDialog(student._id)
                                    }
                                    sx={{ ml: 0.5 }} // Reduced margin
                                  >
                                    <Close />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            </ListItem>
                          )
                        )}
                      </List>
                    )}
                  </>
                )}

                {studentApprovalDialog.tabValue === 1 && ( // Approved Students Tab
                  <>
                    {studentApprovalDialog.approvedStudents.length === 0 ? (
                      <Alert severity="info">
                        Chưa có sinh viên nào trong lớp
                      </Alert>
                    ) : (
                      <TableContainer component={Paper} sx={{ mt: 1 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ width: "5%" }}>STT</TableCell>
                              <TableCell sx={{ width: "30%" }}>
                                Họ tên
                              </TableCell>
                              <TableCell sx={{ width: "20%" }}>MSSV</TableCell>
                              <TableCell sx={{ width: "30%" }}>Email</TableCell>
                              <TableCell align="center" sx={{ width: "15%" }}>
                                Hành động
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {studentApprovalDialog.approvedStudents.map(
                              (student, index) => (
                                <TableRow key={student._id} hover>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>{student.full_name}</TableCell>
                                  <TableCell>
                                    {student.school_info?.student_id || "N/A"}
                                  </TableCell>
                                  <TableCell>{student.email}</TableCell>
                                  <TableCell align="center">
                                    <Tooltip title="Xóa sinh viên này khỏi lớp chính">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          handleOpenConfirmDeleteMainClassStudentDialog(
                                            student
                                          )
                                        }
                                      >
                                        <DeleteForever fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStudentApproval} color="primary">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for deleting student from main class */}
      <Dialog
        open={studentApprovalDialog.confirmDeleteMainClassStudentDialogOpen}
        onClose={handleCloseConfirmDeleteMainClassStudentDialog}
        maxWidth="xs"
      >
        <DialogTitle>Xác nhận xóa sinh viên khỏi lớp chính</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Bạn có chắc chắn muốn xóa sinh viên `}
            <strong>
              {studentApprovalDialog.studentToDeleteFromMainClass?.full_name}
            </strong>
            {` (MSSV: `}
            <strong>
              {studentApprovalDialog.studentToDeleteFromMainClass?.school_info
                ?.student_id || "N/A"}
            </strong>
            {`) khỏi lớp chính này? Sinh viên sẽ bị gỡ khỏi lớp và các thông báo liên quan đến việc duyệt vào lớp này có thể bị xóa.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseConfirmDeleteMainClassStudentDialog}
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

      {/* Dialog từ chối sinh viên */}
      <Dialog
        open={studentApprovalDialog.rejectDialog.open}
        onClose={closeRejectDialog}
        maxWidth="xs"
      >
        <DialogTitle>Từ chối sinh viên</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Bạn có chắc chắn muốn từ chối sinh viên `}
            <strong>{studentApprovalDialog.rejectDialog.studentId}</strong>
            {` không?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectDialog} color="primary">
            Hủy
          </Button>
          <Button onClick={handleRejectStudent} color="error" autoFocus>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  return (
    <Box>
      {" "}
      {/* Thẻ Box bao ngoài cùng */}
      {/* ... (Nội dung Typography, renderStatCards, Paper với Tabs, Paper với search và filter) ... */}
      <Typography variant="h5" gutterBottom>
        Quản lý lớp học
      </Typography>
      {renderStatCards()}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Lớp chính" icon={<School />} iconPosition="start" />
          <Tab label="Lớp giảng dạy" icon={<People />} iconPosition="start" />
        </Tabs>
      </Paper>
      <Paper sx={{ p: 2, mb: 3 }}>
        {/* ... (Box chứa TextField tìm kiếm và các Button) ... */}
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          gap={2}
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
            <TextField
              label={`Tìm kiếm ${
                tabValue === 0 ? "lớp chính" : "lớp giảng dạy"
              }`}
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              startIcon={<Search />}
            >
              Tìm
            </Button>
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadClasses}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog("create")}
            >
              Thêm {tabValue === 0 ? "lớp chính" : "lớp giảng dạy"}
            </Button>
          </Box>
        </Box>

        {/* Bộ lọc nâng cao */}
        <Collapse in={true}>
          <Box
            sx={{ p: 1, border: "1px solid #e0e0e0", borderRadius: 1, mt: 1 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Bộ lọc nâng cao
            </Typography>
            <Grid container spacing={2}>
              {tabValue === 0 ? (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Khoa/Bộ môn</InputLabel>
                      <Select
                        name="department"
                        value={filterOptions.department}
                        onChange={handleFilterChange}
                        label="Khoa/Bộ môn"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {departments.map((dept) => (
                          <MenuItem key={dept._id} value={dept._id}>
                            {dept.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Giáo viên chủ nhiệm</InputLabel>
                      <Select
                        name="teacher"
                        value={filterOptions.teacher}
                        onChange={handleFilterChange}
                        label="Giáo viên chủ nhiệm"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {teachers.map((teacher) => (
                          <MenuItem key={teacher._id} value={teacher._id}>
                            {teacher.full_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Năm bắt đầu"
                      name="year_start"
                      type="number"
                      size="small"
                      value={filterOptions.year_start}
                      onChange={handleFilterChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Môn học</InputLabel>
                      <Select
                        name="course" // Giữ nguyên name="course" cho filterOptions
                        value={filterOptions.course}
                        onChange={handleFilterChange}
                        label="Môn học"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {subjects.map((subject) => (
                          <MenuItem key={subject._id} value={subject._id}>
                            {subject.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Giáo viên</InputLabel>
                      <Select
                        name="teacher"
                        value={filterOptions.teacher}
                        onChange={handleFilterChange}
                        label="Giáo viên"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {teachers.map((teacher) => (
                          <MenuItem key={teacher._id} value={teacher._id}>
                            {teacher.full_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Học kỳ</InputLabel>
                      <Select
                        name="semester" // Đã sửa ở lần trước, giữ nguyên nếu filterOptions.semester_id
                        // Hoặc name="semester" nếu filterOptions.semester
                        value={filterOptions.semester}
                        onChange={handleFilterChange}
                        label="Học kỳ"
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {semesters.map((semester) => (
                          <MenuItem key={semester._id} value={semester._id}>
                            {semester.name} ({semester.year})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </Collapse>
      </Paper>
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : // Điều kiện kiểm tra empty state cho cả 2 tab
      tabValue === 0 &&
        mainClasses.length === 0 &&
        searchTerm === "" &&
        !filterOptions.department &&
        !filterOptions.teacher &&
        !filterOptions.year_start ? (
        renderEmptyState()
      ) : tabValue === 1 &&
        classes.length === 0 &&
        searchTerm === "" &&
        !filterOptions.course &&
        !filterOptions.teacher &&
        !filterOptions.semester ? (
        renderEmptyState()
      ) : // Hiển thị bảng tương ứng
      tabValue === 0 ? (
        renderMainClassesTable()
      ) : (
        renderTeachingClassesTable()
      )}
      {tabValue === 0
        ? renderMainClassFormDialog()
        : renderTeachingClassFormDialog()}
      {renderViewTeachingClassStudentsDialog()}
      {renderViewMainClassStudentsDialog()}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {tabValue === 0
              ? "Bạn có chắc chắn muốn xóa lớp chính này? Hành động này không thể hoàn tác."
              : "Bạn có chắc chắn muốn xóa lớp giảng dạy này? Hành động này không thể hoàn tác."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, item: null })}
            color="inherit"
          >
            Hủy
          </Button>
          <Button onClick={handleDeleteClass} color="error" autoFocus>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassesPage;
