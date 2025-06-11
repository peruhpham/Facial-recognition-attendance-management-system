import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
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
  Tabs,
  Tab,
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
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tooltip,
  Checkbox,
  FormHelperText,
  AlertTitle,
  ListItemIcon,
} from "@mui/material";
import {
  PersonAdd,
  Delete,
  Add,
  Edit,
  PlayArrow,
  Stop,
  CheckCircle,
  Warning,
  Info,
  CalendarToday,
  AccessTime,
  Download,
  School,
  Settings,
  Event,
  Person,
  Room,
  Assignment as AssignmentIcon,
  MailOutline as MailOutlineIcon,
  Image as ImageIcon,
  Close,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Visibility,
} from "@mui/icons-material";
import StudentAttendanceDetail from "../../components/StudentAttendanceDetail";
import {
  getTeachingClassById,
  updateTeachingClass,
  checkScheduleConflicts,
} from "../../services/api";
import {
  fetchAllAbsenceRequestsForReview,
  reviewerUpdateRequestStatus,
} from "../../redux/slices/absenceRequestSlice";

const API_URL = process.env.REACT_APP_API_URL;

// --- Định nghĩa thời gian tiết học --- (Thêm vào đây)
const periodTimings = {
  1: { start: "07:00", end: "07:45" },
  2: { start: "07:50", end: "08:35" },
  3: { start: "08:40", end: "09:25" },
  4: { start: "09:35", end: "10:20" },
  5: { start: "10:25", end: "11:10" },
  6: { start: "11:15", end: "12:00" },
  7: { start: "13:00", end: "13:45" },
  8: { start: "13:50", end: "14:35" },
  9: { start: "14:40", end: "15:25" },
  10: { start: "15:35", end: "16:20" },
  11: { start: "16:25", end: "17:10" },
  12: { start: "17:15", end: "18:00" },
  13: { start: "18:05", end: "18:50" },
  14: { start: "18:55", end: "19:40" },
  15: { start: "19:45", end: "20:30" },
};
// --- Kết thúc định nghĩa ---

function a11yProps(index) {
  return {
    id: `class-tab-${index}`,
    "aria-controls": `class-tabpanel-${index}`,
  };
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`class-tabpanel-${index}`}
      aria-labelledby={`class-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherClassDetailPage = () => {
  const { classId } = useParams();
  const id = classId;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // State cho dữ liệu
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // State cho UI
  const [tabValue, setTabValue] = useState(0);
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "07:00",
    end_time: "08:40",
    room: "",
    session_number: attendanceSessions.length + 1,
    start_period: 1,
    end_period: 2,
    notes: "",
  });

  // State cho thêm sinh viên
  const [openAddStudentDialog, setOpenAddStudentDialog] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [mainClasses, setMainClasses] = useState([]);
  const [selectedMainClass, setSelectedMainClass] = useState("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // State cho chỉnh sửa thông tin lớp học
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [editClassData, setEditClassData] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);

  // State cho chi tiết điểm danh sinh viên
  const [openAttendanceDetail, setOpenAttendanceDetail] = useState(false);
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] =
    useState(null);

  // Thêm state để lưu danh sách phòng học
  const [rooms, setRooms] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");

  // Thêm state để quản lý lịch học
  const [scheduleDays, setScheduleDays] = useState([]);

  // Thêm state để lưu cảnh báo xung đột lịch
  const [conflictWarnings, setConflictWarnings] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // State cho dialog ghi chú
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [currentSessionForNotes, setCurrentSessionForNotes] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // State kiểm tra lớp học đã bắt đầu chưa - SẼ ĐƯỢC THAY THẾ
  // const [isCourseStarted, setIsCourseStarted] = useState(false);
  const [derivedClassStatus, setDerivedClassStatus] = useState("LOADING");

  // State cho Absence Requests
  const {
    items: absenceRequests,
    loading: absenceRequestsLoading,
    error: absenceRequestsError,
    updating: absenceRequestUpdating,
  } = useSelector((state) => state.absenceRequest.reviewRequests);
  const [filteredAbsenceRequests, setFilteredAbsenceRequests] = useState([]);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [selectedAbsenceRequest, setSelectedAbsenceRequest] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [openTeacherEvidenceModal, setOpenTeacherEvidenceModal] =
    useState(false); // State cho modal xem bằng chứng của giáo viên
  const [teacherEvidenceImageUrl, setTeacherEvidenceImageUrl] = useState(""); // State cho URL ảnh bằng chứng của giáo viên

  // Thêm vào sau các state hiện có
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [reviewNote, setReviewNote] = useState("");
  const [imageScale, setImageScale] = useState(1);

  // Thêm vào phần khai báo state
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  // Thêm useMemo để tính toán thống kê đơn xin nghỉ
  const absenceStats = useMemo(() => {
    if (!absenceRequests)
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

    return {
      total: absenceRequests.length,
      pending: absenceRequests.filter((r) => r.status === "pending").length,
      approved: absenceRequests.filter((r) => r.status === "approved").length,
      rejected: absenceRequests.filter((r) => r.status === "rejected").length,
    };
  }, [absenceRequests]);

  // Thêm useEffect để tính toán sessionStats
  useEffect(() => {
    if (attendanceSessions) {
      setSessionStats({
        total: attendanceSessions.length,
        completed: attendanceSessions.filter((s) => s.status === "completed")
          .length,
        pending: attendanceSessions.filter((s) => s.status !== "completed")
          .length,
      });
    }
  }, [attendanceSessions]);

  // Thêm hàm fetch danh sách phòng học
  const fetchRooms = async (buildingId) => {
    try {
      let url = `${API_URL}/facilities/rooms`;

      // Nếu có buildingId, tải phòng theo tòa nhà
      if (buildingId) {
        url = `${API_URL}/facilities/rooms/building/${buildingId}`;
      } else {
        // Nếu không có buildingId, tải tất cả phòng
        url = `${API_URL}/facilities/rooms?limit=1000`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // console.log("Dữ liệu phòng học từ API:", response.data);

      if (response.data.success && Array.isArray(response.data.data)) {
        // Lưu trữ dữ liệu phòng học và ghi log để kiểm tra
        setRooms(response.data.data);
        // console.log("Đã cập nhật state rooms:", response.data.data);
      } else {
        setRooms([]);
        console.error(
          "API không trả về dữ liệu phòng học hợp lệ:",
          response.data
        );
        enqueueSnackbar(
          "Không thể tải danh sách phòng học (dữ liệu không hợp lệ)",
          { variant: "warning" }
        );
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng học:", error);
      enqueueSnackbar("Không thể tải danh sách phòng học", {
        variant: "error",
      });
      setRooms([]);
    }
  };

  // Load dữ liệu ban đầu
  const fetchClassData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Kiểm tra id có tồn tại không
      if (!id) {
        enqueueSnackbar("ID lớp học không hợp lệ", { variant: "error" });
        navigate("/teacher/classes");
        return;
      }

      // Lấy thông tin lớp học
      const classResponse = await axios.get(
        `${API_URL}/classes/teaching/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // Log dữ liệu để xem cấu trúc
      // console.log("Dữ liệu lớp học nhận về:", classResponse.data);

      // Kiểm tra nếu không có dữ liệu trả về
      if (!classResponse.data.success || !classResponse.data.data) {
        enqueueSnackbar("Không tìm thấy thông tin lớp học", {
          variant: "error",
        });
        navigate("/teacher/classes");
        return;
      }

      const fetchedClassInfo = classResponse.data.data;
      setClassInfo(fetchedClassInfo);

      // Kiểm tra xem khóa học đã bắt đầu chưa - LOGIC CŨ SẼ BỊ XÓA
      // if (fetchedClassInfo.course_start_date) { ... }

      // Fetch rooms right after setting class info to ensure it's done before rendering
      await fetchRooms();

      // Lấy danh sách phiên điểm danh
      const sessionsResponse = await axios.get(
        `${API_URL}/attendance/teaching-class/${id}/sessions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const fetchedSessions = sessionsResponse.data.data || [];
      setAttendanceSessions(fetchedSessions);

      // Tính toán trạng thái lớp học
      setDerivedClassStatus(
        calculateDerivedClassStatus(fetchedClassInfo, fetchedSessions)
      );

      // Tính toán thống kê điểm danh
      const stats = {
        total: fetchedSessions.length,
        pending: fetchedSessions.filter((s) => s.status !== "completed").length,
        completed: fetchedSessions.filter((s) => s.status === "completed")
          .length,
      };

      // Vì API getClassStudents không trả về đầy đủ thông tin, chúng ta sẽ lấy chi tiết từng sinh viên
      if (
        classResponse.data.data.students &&
        classResponse.data.data.students.length > 0
      ) {
        try {
          // Lấy danh sách sinh viên cơ bản
          const studentsResponse = await axios.get(
            `${API_URL}/classes/teaching/${id}/students`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            }
          );

          // console.log("Dữ liệu sinh viên cơ bản:", studentsResponse.data);

          // Lưu danh sách sinh viên cơ bản trước
          let studentsWithBasicInfo = [];
          if (studentsResponse.data.success && studentsResponse.data.data) {
            studentsWithBasicInfo = studentsResponse.data.data;
          } else {
            studentsWithBasicInfo = classResponse.data.data.students || [];
          }

          // Lấy chi tiết cho từng sinh viên (bao gồm faceFeatures)
          const detailedStudents = await Promise.all(
            studentsWithBasicInfo.map(async (student) => {
              try {
                // Gọi API để lấy thông tin chi tiết của sinh viên
                const studentDetailResponse = await axios.get(
                  `${API_URL}/users/${student._id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: "application/json",
                    },
                  }
                );

                // console.log(
                //   `Thông tin chi tiết của sinh viên ${student.full_name}:`,
                //   studentDetailResponse.data
                // );

                if (
                  studentDetailResponse.data.success &&
                  studentDetailResponse.data.data
                ) {
                  // Kết hợp dữ liệu từ API chi tiết sinh viên với dữ liệu cơ bản
                  const detailedInfo = studentDetailResponse.data.data;

                  // Kiểm tra dữ liệu khuôn mặt
                  const hasFaceData = !!(
                    detailedInfo.faceFeatures &&
                    detailedInfo.faceFeatures.descriptors &&
                    detailedInfo.faceFeatures.descriptors.length > 0
                  );

                  // console.log(
                  //   `Sinh viên ${detailedInfo.full_name} có dữ liệu khuôn mặt: ${hasFaceData}`
                  // );

                  return {
                    ...student,
                    ...detailedInfo,
                    has_face_data: hasFaceData,
                  };
                } else {
                  // Nếu không lấy được chi tiết, sử dụng thông tin cơ bản
                  return {
                    ...student,
                    has_face_data: false,
                  };
                }
              } catch (error) {
                console.error(
                  `Lỗi khi lấy thông tin chi tiết của sinh viên ${student._id}:`,
                  error
                );
                return {
                  ...student,
                  has_face_data: false,
                };
              }
            })
          );

          setStudents(detailedStudents);
        } catch (error) {
          console.error("Lỗi khi lấy danh sách sinh viên:", error);
          // Sử dụng danh sách cơ bản nếu có lỗi
          setStudents(classResponse.data.data.students || []);
        }
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu lớp học:", error);
      // Xử lý các loại lỗi từ API
      if (error.response) {
        // Nếu máy chủ phản hồi với mã lỗi
        if (error.response.status === 404) {
          enqueueSnackbar("Không tìm thấy lớp học với ID đã cho", {
            variant: "error",
          });
        } else if (error.response.status === 400) {
          enqueueSnackbar("ID lớp học không hợp lệ", { variant: "error" });
        } else {
          enqueueSnackbar(
            error.response.data?.message || "Lỗi khi tải dữ liệu lớp học",
            { variant: "error" }
          );
        }
      } else {
        enqueueSnackbar("Không thể kết nối đến máy chủ", { variant: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, token, enqueueSnackbar, navigate]);

  useEffect(() => {
    fetchClassData();
    if (id) {
      dispatch(fetchAllAbsenceRequestsForReview({ teaching_class_id: id }));
    }
  }, [dispatch, fetchClassData, id]);

  useEffect(() => {
    if (absenceRequests) {
      setFilteredAbsenceRequests(absenceRequests);
    }
  }, [absenceRequests]);

  // Thay đổi tab
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  // Mở dialog tạo phiên điểm danh
  const handleOpenSessionDialog = () => {
    // Tải danh sách phòng học
    fetchRooms();

    setSessionFormData({
      title: `Buổi học ${attendanceSessions.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      start_time: "07:00",
      end_time: "08:40",
      room: "",
      session_number: attendanceSessions.length + 1,
      start_period: 1,
      end_period: 2,
      notes: "",
    });
    setOpenSessionDialog(true);
  };

  // Đóng dialog tạo phiên điểm danh
  const handleCloseSessionDialog = () => {
    setOpenSessionDialog(false);
  };

  // Cập nhật form dữ liệu phiên điểm danh
  const handleSessionFormChange = (e) => {
    const { name, value } = e.target;
    setSessionFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Tạo phiên điểm danh mới
  const handleCreateSession = async () => {
    try {
      const {
        title,
        date,
        start_time,
        end_time,
        room,
        session_number,
        start_period,
        end_period,
        notes,
      } = sessionFormData;

      // Kiểm tra dữ liệu
      if (!date || !start_time || !end_time || !session_number) {
        enqueueSnackbar("Vui lòng điền đầy đủ thông tin", { variant: "error" });
        return;
      }

      // Tạo đối tượng để gửi lên API
      const sessionData = {
        title,
        date,
        start_time,
        end_time,
        teaching_class_id: id,
        session_number: parseInt(session_number, 10),
        start_period: parseInt(start_period, 10) || 1,
        end_period: parseInt(end_period, 10) || 2,
        notes,
      };

      // Thêm room nếu có
      if (room) {
        sessionData.room = room;
      }

      const response = await axios.post(
        `${API_URL}/attendance/sessions`,
        sessionData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Tạo phiên điểm danh thành công", {
        variant: "success",
      });
      setOpenSessionDialog(false);

      // Cập nhật danh sách phiên
      setAttendanceSessions((prev) => [...prev, response.data.data]);
    } catch (error) {
      console.error("Lỗi khi tạo phiên điểm danh:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi tạo phiên điểm danh",
        { variant: "error" }
      );
    }
  };

  // Cập nhật phiên điểm danh
  const handleUpdateSession = async () => {
    try {
      const {
        _id,
        title,
        date,
        start_time,
        end_time,
        room,
        session_number,
        start_period,
        end_period,
        notes,
      } = sessionFormData;

      // Kiểm tra dữ liệu
      if (!date || !start_time || !end_time || !session_number) {
        enqueueSnackbar("Vui lòng điền đầy đủ thông tin", { variant: "error" });
        return;
      }

      // Tạo đối tượng để gửi lên API
      const sessionData = {
        title,
        date,
        start_time,
        end_time,
        session_number: parseInt(session_number, 10),
        start_period: parseInt(start_period, 10) || 1,
        end_period: parseInt(end_period, 10) || 2,
        notes,
      };

      // Thêm room nếu có
      if (room) {
        sessionData.room = room;
      }

      // Gọi API cập nhật
      const response = await axios.put(
        `${API_URL}/attendance/sessions/${_id}`,
        sessionData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Cập nhật phiên điểm danh thành công", {
        variant: "success",
      });
      setOpenSessionDialog(false);

      // Cập nhật danh sách phiên
      setAttendanceSessions((prev) =>
        prev.map((session) =>
          session._id === _id ? response.data.data : session
        )
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật phiên điểm danh:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi cập nhật phiên điểm danh",
        { variant: "error" }
      );
    }
  };

  // Bắt đầu phiên điểm danh
  const handleStartSession = async (sessionId) => {
    try {
      // Kiểm tra tính hợp lệ của session
      if (!sessionId) {
        enqueueSnackbar("ID phiên điểm danh không hợp lệ", {
          variant: "error",
        });
        return;
      }

      // Kiểm tra trạng thái phiên điểm danh
      const session = attendanceSessions.find((s) => s._id === sessionId);
      if (!session) {
        enqueueSnackbar("Không tìm thấy thông tin phiên điểm danh", {
          variant: "error",
        });
        return;
      }

      // Nếu phiên chưa bắt đầu hoặc đang ở trạng thái pending, cập nhật trạng thái thành active
      if (session.status === "pending") {
        try {
          await axios.put(
            `${API_URL}/attendance/sessions/${sessionId}/status`,
            { status: "active" },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Cập nhật lại trạng thái trong state
          setAttendanceSessions((prev) =>
            prev.map((s) =>
              s._id === sessionId ? { ...s, status: "active" } : s
            )
          );
        } catch (error) {
          console.error("Lỗi khi cập nhật trạng thái phiên:", error);
          // Vẫn tiếp tục điều hướng dù có lỗi
        }
      }

      enqueueSnackbar(`Đang chuyển đến trang điểm danh`, { variant: "info" });
      navigate(`/teacher/attendance/${id}/${sessionId}`);
    } catch (error) {
      console.error("Lỗi khi bắt đầu phiên điểm danh:", error);
      enqueueSnackbar("Có lỗi xảy ra khi bắt đầu phiên điểm danh", {
        variant: "error",
      });
    }
  };

  // Mở dialog thêm sinh viên
  const handleOpenAddStudentDialog = async () => {
    try {
      setIsLoadingStudents(true);
      // Lấy danh sách lớp chính
      const mainClassResponse = await axios.get(
        `${API_URL}/classes/main?all=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // console.log("Danh sách lớp chính:", mainClassResponse.data);

      if (!mainClassResponse.data?.data) {
        enqueueSnackbar("Không thể tải danh sách lớp chính", {
          variant: "error",
        });
        return;
      }

      setMainClasses(mainClassResponse.data.data || []);
      setAvailableStudents([]);
      setSelectedStudents([]);
      setSelectedMainClass("");
      setOpenAddStudentDialog(true);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp chính:", error);
      enqueueSnackbar(
        "Không thể tải danh sách lớp chính. Vui lòng thử lại sau.",
        { variant: "error" }
      );
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Lấy danh sách sinh viên từ lớp chính
  const handleMainClassChange = async (e) => {
    const mainClassId = e.target.value;
    setSelectedMainClass(mainClassId);

    if (!mainClassId) {
      setAvailableStudents([]);
      return;
    }

    try {
      setIsLoadingStudents(true);
      const studentsResponse = await axios.get(
        `${API_URL}/classes/main/${mainClassId}/approved-students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // console.log("Danh sách sinh viên lớp chính:", studentsResponse.data);

      if (!studentsResponse.data?.data) {
        enqueueSnackbar("Không thể tải danh sách sinh viên từ lớp chính", {
          variant: "error",
        });
        return;
      }

      // Lọc sinh viên chưa có trong lớp
      const currentStudentIds = students.map((s) => s._id);
      const filteredStudents = studentsResponse.data.data.students.filter(
        (s) => !currentStudentIds.includes(s._id)
      );

      setAvailableStudents(filteredStudents);
    } catch (error) {
      console.error("Lỗi khi tải danh sách sinh viên từ lớp chính:", error);
      enqueueSnackbar("Không thể tải danh sách sinh viên từ lớp chính", {
        variant: "error",
      });
      setAvailableStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Đóng dialog thêm sinh viên
  const handleCloseAddStudentDialog = () => {
    setOpenAddStudentDialog(false);
  };

  // Xử lý chọn sinh viên để thêm
  const handleSelectStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  // Thêm sinh viên vào lớp
  const handleAddStudents = async () => {
    try {
      if (selectedStudents.length === 0) {
        enqueueSnackbar("Vui lòng chọn ít nhất một sinh viên", {
          variant: "warning",
        });
        return;
      }

      // Gọi API thêm sinh viên
      await axios.post(
        `${API_URL}/classes/teaching/${id}/students/batch`,
        {
          student_ids: selectedStudents,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar(`Đã thêm ${selectedStudents.length} sinh viên vào lớp`, {
        variant: "success",
      });
      setOpenAddStudentDialog(false);

      // Cập nhật lại danh sách sinh viên
      fetchClassData();
    } catch (error) {
      console.error("Lỗi khi thêm sinh viên:", error);

      if (error.response) {
        enqueueSnackbar(
          `Lỗi: ${error.response.status} - ${
            error.response.data?.message || "Không thể thêm sinh viên"
          }`,
          { variant: "error" }
        );
      } else {
        enqueueSnackbar("Lỗi kết nối khi thêm sinh viên vào lớp", {
          variant: "error",
        });
      }
    }
  };

  // Xóa sinh viên khỏi lớp
  const handleRemoveStudent = async (studentId) => {
    if (
      !window.confirm("Bạn có chắc chắn muốn xóa sinh viên này khỏi lớp không?")
    ) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/classes/teaching/${id}/students/${studentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      enqueueSnackbar("Đã xóa sinh viên khỏi lớp", { variant: "success" });

      // Cập nhật lại danh sách sinh viên
      setStudents(students.filter((s) => s._id !== studentId));
    } catch (error) {
      console.error("Lỗi khi xóa sinh viên:", error);
      enqueueSnackbar("Lỗi khi xóa sinh viên khỏi lớp", { variant: "error" });
    }
  };

  // Xuất danh sách sinh viên
  const handleExportStudentList = () => {
    try {
      const studentsData = students.map((student, index) => {
        // Kiểm tra có face data từ cả hai nguồn có thể
        const hasFaceData =
          student.has_face_data ||
          !!(
            student.faceFeatures &&
            student.faceFeatures.descriptors &&
            student.faceFeatures.descriptors.length > 0
          );

        return {
          STT: index + 1,
          "Mã SV": student.school_info?.student_id || "N/A",
          "Họ và tên": student.full_name || student.name,
          Email: student.email,
          "Đăng ký khuôn mặt": hasFaceData ? "Đã đăng ký" : "Chưa đăng ký",
        };
      });

      const header = [
        "STT",
        "Mã SV",
        "Họ và tên",
        "Email",
        "Đăng ký khuôn mặt",
      ];
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          header.join(","),
          ...studentsData.map((row) =>
            [
              row.STT,
              row["Mã SV"],
              row["Họ và tên"],
              row.Email,
              row["Đăng ký khuôn mặt"],
            ].join(",")
          ),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `danh_sach_sinh_vien_${classInfo?.class_name}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar("Xuất danh sách sinh viên thành công", {
        variant: "success",
      });
    } catch (error) {
      console.error("Lỗi khi xuất danh sách:", error);
      enqueueSnackbar("Lỗi khi xuất danh sách sinh viên", { variant: "error" });
    }
  };

  // Lọc sinh viên theo từ khóa tìm kiếm
  const filteredAvailableStudents = availableStudents.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.school_info?.student_id
        ?.toLowerCase()
        .includes(searchStudent.toLowerCase()) ||
      student.email.toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Tải dữ liệu tham chiếu cho form chỉnh sửa
  const fetchReferenceDataForEdit = async () => {
    try {
      const [subjectsRes, semestersRes, mainClassesRes, campusesRes] =
        await Promise.all([
          axios.get(`${API_URL}/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/semesters`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/classes/main?all=true`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/facilities/campuses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      setSubjects(subjectsRes.data.data || []);
      setSemesters(semestersRes.data.data || []);
      setMainClasses(mainClassesRes.data.data || []);
      setCampuses(campusesRes.data.data || []);

      // Nếu lớp học có thông tin campus và building, tải danh sách building và room tương ứng
      if (classInfo && classInfo.room) {
        try {
          const roomDetails = await axios.get(
            `${API_URL}/facilities/rooms/${classInfo.room}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (roomDetails.data.success && roomDetails.data.data) {
            const room = roomDetails.data.data;
            if (room.building_id) {
              setSelectedCampus(room.building_id.campus_id?._id || "");

              // Tải danh sách buildings của campus
              const buildingsRes = await axios.get(
                `${API_URL}/facilities/buildings/campuses/${room.building_id.campus_id?._id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setBuildings(buildingsRes.data.data || []);

              setSelectedBuilding(room.building_id._id || "");

              // Tải danh sách rooms của building
              const roomsRes = await axios.get(
                `${API_URL}/facilities/rooms/building/${room.building_id._id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setRooms(roomsRes.data.data || []);
            }
          }
        } catch (error) {
          console.error("Lỗi khi tải thông tin phòng học:", error);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tham chiếu:", error);
      enqueueSnackbar("Lỗi khi tải dữ liệu tham chiếu", { variant: "error" });
    }
  };

  // Tải danh sách tòa nhà khi chọn campus
  const fetchBuildings = async (campusId) => {
    if (!campusId) {
      setBuildings([]);
      setSelectedBuilding("");
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/facilities/buildings/campuses/${campusId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBuildings(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách tòa nhà:", error);
      enqueueSnackbar("Lỗi khi tải danh sách tòa nhà", { variant: "error" });
    }
  };

  // Mở dialog chỉnh sửa lớp học
  const handleOpenEditClassDialog = async () => {
    setIsLoading(true); // Bắt đầu loading
    // Chuẩn bị dữ liệu ban đầu cho form
    const initialEditData = {
      class_name: classInfo.class_name || "",
      class_code: classInfo.class_code || "",
      subject_id: classInfo.subject_id?._id || "",
      main_class_id: classInfo.main_class_id?._id || "",
      semester_id: classInfo.semester_id?._id || "",
      total_sessions: classInfo.total_sessions || 15,
      // room_id: classInfo.room?._id || "", // Sẽ được quản lý trong từng schedule day
      course_start_date: classInfo.course_start_date
        ? classInfo.course_start_date.split("T")[0]
        : "",
      course_end_date: classInfo.course_end_date
        ? classInfo.course_end_date.split("T")[0]
        : "",
      auto_generate_sessions: classInfo.auto_generate_sessions !== false,
      // schedule: classInfo.schedule || [], // Sẽ được xử lý riêng
    };
    setEditClassData(initialEditData);

    // Tải dữ liệu tham chiếu chung (subjects, semesters, mainClasses, campuses)
    await fetchReferenceDataForEdit(); // Đảm bảo campuses được tải

    // Xử lý scheduleDays (quan trọng)
    if (classInfo.schedule && classInfo.schedule.length > 0) {
      const processedScheduleDays = await Promise.all(
        classInfo.schedule.map(async (item) => {
          let campusId = "";
          let buildingId = "";
          let availableBuildings = [];
          let availableRooms = [];

          if (item.room_id) {
            try {
              const roomDetailRes = await axios.get(
                `${API_URL}/facilities/rooms/${item.room_id}?populate=building_id.campus_id`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (roomDetailRes.data.success && roomDetailRes.data.data) {
                const roomData = roomDetailRes.data.data;
                if (roomData.building_id) {
                  buildingId = roomData.building_id._id;
                  if (roomData.building_id.campus_id) {
                    campusId = roomData.building_id.campus_id._id;
                    // Fetch buildings for this campus
                    const buildingsRes = await axios.get(
                      `${API_URL}/facilities/buildings/campuses/${campusId}`,
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    availableBuildings = buildingsRes.data.data || [];
                  }
                  // Fetch rooms for this building
                  const roomsRes = await axios.get(
                    `${API_URL}/facilities/rooms/building/${buildingId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  availableRooms = roomsRes.data.data || [];
                }
              }
            } catch (error) {
              console.error(
                `Error fetching details for room ${item.room_id}:`,
                error
              );
            }
          }
          return {
            ...item,
            day_of_week: item.day_of_week !== undefined ? item.day_of_week : 1,
            start_period: item.start_period || 1,
            end_period: item.end_period || 2,
            start_time: item.start_time || "07:00",
            end_time: item.end_time || "08:40",
            room_id: item.room_id || "",
            is_recurring:
              item.is_recurring !== undefined ? item.is_recurring : true,
            specific_dates: item.specific_dates || [],
            excluded_dates: item.excluded_dates || [],
            campusId: campusId,
            buildingId: buildingId,
            availableBuildings: availableBuildings,
            availableRooms: availableRooms,
          };
        })
      );
      setScheduleDays(processedScheduleDays);
    } else {
      const dayOfWeek = initialEditData.course_start_date
        ? getDayOfWeekFromDate(initialEditData.course_start_date)
        : 1;
      setScheduleDays([
        {
          day_of_week: dayOfWeek,
          start_period: 1,
          end_period: 2,
          start_time: "07:00",
          end_time: "08:40",
          room_id: "",
          is_recurring: true,
          specific_dates: [],
          excluded_dates: [],
          campusId: "",
          buildingId: "",
          availableBuildings: [],
          availableRooms: [],
        },
      ]);
    }
    setIsLoading(false); // Kết thúc loading
    setOpenEditClassDialog(true);
  };

  // Đóng dialog chỉnh sửa lớp học
  const handleCloseEditClassDialog = () => {
    setOpenEditClassDialog(false);
    setEditClassData(null);
    setScheduleDays([]); // Reset scheduleDays
    setConflictWarnings([]); // Reset conflictWarnings
    setSelectedCampus(""); // Reset selected campus/building for the dialog if they were general
    setSelectedBuilding("");
  };

  // Xử lý thay đổi các trường trong form chỉnh sửa
  const handleEditClassChange = (e) => {
    const { name, value } = e.target;
    setEditClassData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Xử lý thay đổi campus
  const handleCampusChange = (e) => {
    const campusId = e.target.value;
    setSelectedCampus(campusId);
    fetchBuildings(campusId);
    setSelectedBuilding("");
    setEditClassData((prev) => ({
      ...prev,
      room_id: "",
    }));
  };

  // Xử lý thay đổi building
  const handleBuildingChange = (e) => {
    const buildingId = e.target.value;
    setSelectedBuilding(buildingId);
    fetchRooms(buildingId);
    setEditClassData((prev) => ({
      ...prev,
      room_id: "",
    }));
  };

  // Thêm function để kiểm tra xung đột lịch
  const checkConflicts = async (scheduleToCheck = scheduleDays) => {
    // Xóa cảnh báo xung đột cũ
    setConflictWarnings([]);

    try {
      setCheckingConflicts(true);

      // Kiểm tra xem có thông tin đủ để check không
      if (
        !classInfo?.teacher_id?._id ||
        !scheduleToCheck ||
        scheduleToCheck.length === 0 ||
        scheduleToCheck.some((day) => !day.room_id)
      ) {
        return;
      }

      const response = await checkScheduleConflicts({
        teacher_id: classInfo.teacher_id._id,
        schedule: scheduleToCheck,
        class_id: id, // Loại trừ chính lớp này khi kiểm tra
      });

      if (response.data.has_conflicts) {
        setConflictWarnings(response.data.conflicts);
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra xung đột lịch học:", error);
      enqueueSnackbar("Lỗi khi kiểm tra xung đột lịch học", {
        variant: "error",
      });
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Cập nhật hàm handleScheduleChange để check xung đột
  const handleScheduleChange = async (index, field, value) => {
    const updatedSchedule = [...scheduleDays];
    const currentScheduleItem = { ...updatedSchedule[index] };

    currentScheduleItem[field] = value;

    if (field === "campusId") {
      currentScheduleItem.buildingId = "";
      currentScheduleItem.room_id = "";
      currentScheduleItem.availableBuildings = [];
      currentScheduleItem.availableRooms = [];
      if (value && value !== "undefined") {
        // Kiểm tra value !== "undefined"
        try {
          const response = await axios.get(
            `${API_URL}/facilities/buildings/campuses/${value}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          currentScheduleItem.availableBuildings = response.data.data || [];
        } catch (error) {
          console.error("Lỗi khi tải tòa nhà cho lịch học:", error);
          enqueueSnackbar("Lỗi khi tải tòa nhà", { variant: "error" });
        }
      }
    } else if (field === "buildingId") {
      currentScheduleItem.room_id = "";
      currentScheduleItem.availableRooms = [];
      if (value && value !== "undefined") {
        // Kiểm tra value !== "undefined"
        try {
          const response = await axios.get(
            `${API_URL}/facilities/rooms/building/${value}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          currentScheduleItem.availableRooms = response.data.data || [];
        } catch (error) {
          console.error("Lỗi khi tải phòng học cho lịch học:", error);
          enqueueSnackbar("Lỗi khi tải phòng học", { variant: "error" });
        }
      }
    } else if (field === "start_period" || field === "end_period") {
      const intValue = parseInt(value, 10);
      if (isNaN(intValue)) return; // Bỏ qua nếu không phải là số

      if (field === "start_period") {
        currentScheduleItem.start_period = intValue;
        currentScheduleItem.start_time = periodTimings[intValue]?.start || "";
        // Tự động điều chỉnh tiết kết thúc nếu tiết bắt đầu > tiết kết thúc
        if (
          currentScheduleItem.end_period &&
          intValue > currentScheduleItem.end_period
        ) {
          currentScheduleItem.end_period = intValue; // Hoặc intValue + 1 tùy theo logic mong muốn
          currentScheduleItem.end_time =
            periodTimings[currentScheduleItem.end_period]?.end || "";
        }
      } else if (field === "end_period") {
        // Đảm bảo tiết kết thúc không nhỏ hơn tiết bắt đầu
        if (
          currentScheduleItem.start_period &&
          intValue < currentScheduleItem.start_period
        ) {
          currentScheduleItem.end_period = currentScheduleItem.start_period;
        } else {
          currentScheduleItem.end_period = intValue;
        }
        currentScheduleItem.end_time =
          periodTimings[currentScheduleItem.end_period]?.end || "";
      }
    }

    updatedSchedule[index] = currentScheduleItem;
    setScheduleDays(updatedSchedule);

    // Tính lại ngày kết thúc khi lịch học thay đổi
    setEditClassData((prev) => ({
      ...prev,
      course_end_date: calculateEndDate(
        prev.course_start_date,
        updatedSchedule,
        prev.total_sessions
      ),
    }));

    // Kiểm tra xung đột nếu thay đổi phòng học hoặc thời gian
    if (
      field === "room_id" ||
      field === "day_of_week" ||
      field === "start_period" ||
      field === "end_period" ||
      field === "start_time" ||
      field === "end_time"
    ) {
      setTimeout(() => {
        if (
          updatedSchedule[index].room_id &&
          updatedSchedule[index].day_of_week !== undefined
        ) {
          checkConflicts(updatedSchedule);
        }
      }, 500);
    }
  };

  // Cập nhật hàm handleUpdateClass
  const handleUpdateClass = async () => {
    if (!editClassData.class_name || !editClassData.class_code) {
      enqueueSnackbar("Vui lòng điền đầy đủ thông tin bắt buộc", {
        variant: "warning",
      });
      return;
    }

    // Kiểm tra room_id trong từng schedule item
    for (const day of scheduleDays) {
      if (!day.room_id) {
        enqueueSnackbar(
          `Vui lòng chọn phòng học cho buổi học vào ${getDayOfWeekName(
            day.day_of_week
          )}`,
          { variant: "warning" }
        );
        return;
      }
    }

    setIsUpdating(true); // Bắt đầu quá trình cập nhật chung
    setCheckingConflicts(true); // Bắt đầu kiểm tra xung đột

    try {
      const response = await checkScheduleConflicts({
        teacher_id: classInfo.teacher_id._id,
        schedule: scheduleDays,
        class_id: id,
      });

      setCheckingConflicts(false); // Kết thúc kiểm tra xung đột

      if (response.data.has_conflicts) {
        setConflictWarnings(response.data.conflicts);
        if (
          window.confirm(
            "Phát hiện xung đột lịch học. Bạn vẫn muốn cập nhật lịch học này không?\n\n" +
              response.data.conflicts.map((c) => c.message).join("\n")
          )
        ) {
          await updateClassData(); // Người dùng xác nhận, tiến hành cập nhật
        } else {
          setIsUpdating(false); // Người dùng hủy, dừng quá trình cập nhật chung
        }
      } else {
        setConflictWarnings([]); // Không có xung đột, xóa cảnh báo cũ (nếu có)
        await updateClassData(); // Không có xung đột, tiến hành cập nhật
      }
    } catch (error) {
      setCheckingConflicts(false); // Kết thúc kiểm tra xung đột (nếu có lỗi)
      setIsUpdating(false); // Dừng quá trình cập nhật chung (nếu có lỗi)
      console.error("Lỗi khi kiểm tra xung đột lịch học:", error);
      enqueueSnackbar(
        "Lỗi khi kiểm tra xung đột lịch học. Vẫn thử cập nhật...",
        { variant: "warning" }
      );
      // Cân nhắc có nên cho phép cập nhật khi kiểm tra xung đột lỗi không
      // Hiện tại: vẫn thử cập nhật
      await updateClassData();
    }
    // setIsUpdating(false) sẽ được gọi bên trong updateClassData hoặc ở trên nếu hủy
  };

  // Tách logic cập nhật lớp thành hàm riêng
  const updateClassData = async () => {
    // setIsUpdating(true); // Đã set ở handleUpdateClass
    try {
      const updateDataPayload = {
        ...editClassData,
        schedule: scheduleDays.map((day) => ({
          // Chỉ gửi các trường cần thiết cho schedule
          day_of_week: day.day_of_week,
          start_period: day.start_period,
          end_period: day.end_period,
          start_time: day.start_time,
          end_time: day.end_time,
          room_id: day.room_id,
          is_recurring: day.is_recurring,
          specific_dates: day.specific_dates,
          excluded_dates: day.excluded_dates,
        })),
      };

      // Xóa các trường không cần thiết khỏi payload chính
      delete updateDataPayload.teacher_id; // Không cho phép thay đổi teacher_id ở đây
      // delete updateDataPayload.createdAt;
      // delete updateDataPayload.updatedAt;
      // ... các trường khác không thuộc TeachingClassSchema hoặc không cho phép sửa

      await updateTeachingClass(id, updateDataPayload);

      enqueueSnackbar("Cập nhật lớp học thành công", {
        variant: "success",
      });
      // setEditClassData(null); // Sẽ được reset bởi handleClose
      // fetchClassData(); // Tải lại dữ liệu lớp học
      // setConflictWarnings([]); // Sẽ được reset bởi handleClose
      handleCloseEditClassDialog(); // Đóng dialog và reset states
      fetchClassData(); // Tải lại dữ liệu sau khi dialog đã đóng
    } catch (error) {
      console.error("Lỗi khi cập nhật lớp học:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi cập nhật lớp học",
        { variant: "error" }
      );
    } finally {
      setIsUpdating(false); // Kết thúc quá trình cập nhật chung
    }
  };

  // Lấy thứ trong tuần từ ngày
  const getDayOfWeekFromDate = (dateString) => {
    if (!dateString) return 1; // Mặc định là thứ 2 nếu không có ngày

    const date = new Date(dateString);
    // getDay() trả về 0 cho Chủ Nhật, 1-6 cho Thứ 2 đến Thứ 7
    const day = date.getDay(); // Chủ nhật - 0, Thứ hai - 1, ... , Thứ bảy - 6

    // Không cần chuyển đổi nữa nếu backend/logic khác cũng dùng 0-6
    return day;
  };

  // Lấy tên của thứ trong tuần
  const getDayOfWeekName = (dayOfWeek) => {
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    return days[dayOfWeek];
  };

  // Thêm lịch học
  const addScheduleDay = () => {
    const startDate = editClassData.course_start_date;
    // ... (logic tìm nextDay có thể giữ nguyên hoặc cải thiện)
    const lastScheduleItem = scheduleDays[scheduleDays.length - 1] || {};

    const updatedSchedule = [
      ...scheduleDays,
      {
        day_of_week:
          lastScheduleItem.day_of_week !== undefined
            ? lastScheduleItem.day_of_week
            : startDate
            ? getDayOfWeekFromDate(startDate)
            : 1,
        start_period: 1,
        end_period: 2,
        start_time: "07:00", // Cần có periodTimings để lấy chính xác
        end_time: "08:40", // Cần có periodTimings để lấy chính xác
        room_id: "", // Để trống ban đầu
        is_recurring: true,
        specific_dates: [],
        excluded_dates: [],
        campusId: lastScheduleItem.campusId || "", // Kế thừa từ buổi cuối hoặc để trống
        buildingId: lastScheduleItem.buildingId || "",
        availableBuildings: lastScheduleItem.availableBuildings || [],
        availableRooms: lastScheduleItem.availableRooms || [],
      },
    ];

    setScheduleDays(updatedSchedule);

    // Tính lại ngày kết thúc sau khi thêm buổi học
    setEditClassData((prev) => ({
      ...prev,
      course_end_date: calculateEndDate(
        prev.course_start_date,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Xóa lịch học
  const removeScheduleDay = (index) => {
    if (scheduleDays.length > 1) {
      const updatedSchedule = scheduleDays.filter((_, i) => i !== index);
      setScheduleDays(updatedSchedule);

      // Tính lại ngày kết thúc sau khi xóa buổi học
      setEditClassData((prev) => ({
        ...prev,
        course_end_date: calculateEndDate(
          prev.course_start_date,
          updatedSchedule,
          prev.total_sessions
        ),
      }));
    }
  };

  // Tính ngày kết thúc dựa trên ngày bắt đầu và lịch học
  const calculateEndDate = (startDate, schedule, totalSessions) => {
    if (!startDate || !schedule || schedule.length === 0 || !totalSessions) {
      return "";
    }

    try {
      // Chuyển ngày bắt đầu thành đối tượng Date
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return "";
      }

      // Tổng số tuần cần thiết = tổng số buổi học / số buổi học mỗi tuần
      const sessionsPerWeek = schedule.length;
      const weeksNeeded = Math.ceil(totalSessions / sessionsPerWeek);

      // Tạo mảng chứa các ngày trong tuần từ lịch học (0-6, với 0 là Chủ Nhật)
      const daysOfWeek = schedule.map((day) => day.day_of_week);

      // Sắp xếp các ngày trong tuần
      daysOfWeek.sort((a, b) => a - b);

      // Tìm ngày đầu tiên trong lịch học sau ngày bắt đầu
      let currentDate = new Date(start);

      // Đếm số buổi học đã xếp lịch
      let sessionCount = 0;

      // Lặp qua từng tuần
      for (let week = 0; week < weeksNeeded * 2; week++) {
        // Nhân 2 để đảm bảo đủ số buổi
        // Lặp qua các ngày trong tuần từ lịch học
        for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
          const targetDayOfWeek = daysOfWeek[dayIndex];

          // Tìm ngày tiếp theo có thứ phù hợp
          while (currentDate.getDay() !== targetDayOfWeek) {
            currentDate.setDate(currentDate.getDate() + 1);
          }

          sessionCount++;

          // Nếu đã đủ số buổi học, trả về ngày hiện tại
          if (sessionCount >= totalSessions) {
            return currentDate.toISOString().split("T")[0];
          }

          // Di chuyển đến ngày tiếp theo
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Nếu không tính được, trả về chuỗi rỗng
      return "";
    } catch (error) {
      console.error("Lỗi khi tính ngày kết thúc:", error);
      return "";
    }
  };

  // Xử lý thay đổi ngày bắt đầu
  const handleStartDateChange = (e) => {
    const startDate = e.target.value;

    // Lấy thứ từ ngày bắt đầu
    const dayOfWeek = getDayOfWeekFromDate(startDate);

    // Cập nhật lịch học với thứ mới
    const updatedSchedule = [
      {
        day_of_week: dayOfWeek,
        start_period: 1,
        end_period: 2,
        start_time: "07:00",
        end_time: "08:40",
        room_id: editClassData.room_id,
        is_recurring: true,
        specific_dates: [],
        excluded_dates: [],
      },
    ];

    // Cập nhật lịch học
    setScheduleDays(updatedSchedule);

    // Cập nhật ngày bắt đầu và tính ngày kết thúc
    setEditClassData((prev) => ({
      ...prev,
      course_start_date: startDate,
      course_end_date: calculateEndDate(
        startDate,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Xử lý thay đổi số buổi học
  const handleTotalSessionsChange = (e) => {
    const totalSessions = e.target.value;

    setEditClassData((prev) => ({
      ...prev,
      total_sessions: totalSessions,
      // Tính lại ngày kết thúc khi thay đổi số buổi học
      course_end_date: calculateEndDate(
        prev.course_start_date,
        scheduleDays,
        totalSessions
      ),
    }));
  };

  // Thêm phần render cảnh báo xung đột lịch
  const renderConflictWarnings = () => {
    if (conflictWarnings.length === 0) {
      return null;
    }

    return (
      <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
        <AlertTitle>Phát hiện xung đột lịch học</AlertTitle>
        <List dense>
          {conflictWarnings.map((conflict, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                {conflict.type === "teacher" ? (
                  <Person color="error" />
                ) : (
                  <Room color="error" />
                )}
              </ListItemIcon>
              <ListItemText primary={conflict.message} />
            </ListItem>
          ))}
        </List>
      </Alert>
    );
  };

  // Hàm mở dialog ghi chú
  const handleOpenNotesDialog = (session) => {
    setCurrentSessionForNotes(session);
    setNotesText(session.notes || "");
    setOpenNotesDialog(true);
  };

  // Hàm đóng dialog ghi chú
  const handleCloseNotesDialog = () => {
    setOpenNotesDialog(false);
    setCurrentSessionForNotes(null);
    setNotesText("");
  };

  // Hàm lưu ghi chú
  const handleSaveNotes = async () => {
    if (!currentSessionForNotes) return;
    setIsSavingNotes(true);
    try {
      // Giả sử API cho phép cập nhật một phần hoặc toàn bộ session
      // Nếu chỉ cập nhật notes, body request có thể chỉ cần { notes: notesText }
      // Endpoint này cần được backend hỗ trợ đúng cách
      await axios.put(
        `${API_URL}/attendance/sessions/${currentSessionForNotes._id}`,
        { ...currentSessionForNotes, notes: notesText }, // Gửi lại session với notes đã cập nhật
        // Hoặc chỉ: { notes: notesText } nếu API hỗ trợ partial update tốt
        { headers: { Authorization: `Bearer ${token}` } }
      );

      enqueueSnackbar("Cập nhật ghi chú thành công", { variant: "success" });
      setAttendanceSessions((prevSessions) =>
        prevSessions.map((s) =>
          s._id === currentSessionForNotes._id ? { ...s, notes: notesText } : s
        )
      );
      handleCloseNotesDialog();
    } catch (error) {
      console.error("Lỗi khi cập nhật ghi chú:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi cập nhật ghi chú",
        { variant: "error" }
      );
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Helper function để lấy thông tin chi tiết phòng học
  const getRoomDetailsString = (roomId) => {
    if (!roomId) return "Chưa xác định";
    // Đảm bảo rooms là một mảng trước khi sử dụng find
    if (!Array.isArray(rooms)) return "Đang tải phòng...";

    const roomDetail = rooms.find((r) => r._id === roomId);
    if (!roomDetail) return "Không tìm thấy phòng";

    const buildingName = roomDetail.building_id?.name || "N/A";
    const campusName = roomDetail.building_id?.campus_id?.name || "N/A";
    return `${roomDetail.room_number} (${buildingName} - ${campusName})`;
  };

  // Hàm tính toán trạng thái lớp học dựa trên dữ liệu hiện có
  const calculateDerivedClassStatus = useCallback((classData, sessions) => {
    if (!classData) return "LOADING";

    const totalPlannedSessions = classData.total_sessions || 0;
    const actualSessions = sessions || [];

    if (totalPlannedSessions === 0 && actualSessions.length === 0) {
      return "NOT_STARTED";
    }

    const completedSessionCount = actualSessions.filter(
      (s) => s.status === "completed"
    ).length;

    if (
      totalPlannedSessions > 0 &&
      completedSessionCount === totalPlannedSessions
    ) {
      return "COMPLETED";
    }

    const anySessionTaken = actualSessions.some(
      (s) => s.status === "active" || s.status === "completed"
    );

    if (anySessionTaken) {
      return "IN_PROGRESS";
    }

    return "NOT_STARTED";
  }, []);

  // Hàm chuyển đổi trạng thái tiếng Anh sang tiếng Việt để hiển thị
  const getVietnameseClassStatus = (status) => {
    switch (status) {
      case "LOADING":
        return "Đang tải...";
      case "NOT_STARTED":
        return "Chưa bắt đầu";
      case "IN_PROGRESS":
        return "Đang học";
      case "COMPLETED":
        return "Đã kết thúc";
      default:
        return status; // Trả về chính nó nếu không khớp
    }
  };

  // Các hàm xử lý Dialog duyệt/từ chối phải được định nghĩa ở đây, trước return
  const handleOpenReviewDialog = (request, action) => {
    setSelectedAbsenceRequest(request);
    setReviewAction(action);
    setOpenReviewDialog(true);
  };

  const handleCloseReviewDialog = () => {
    setOpenReviewDialog(false);
    setSelectedAbsenceRequest(null);
    setReviewAction(null);
  };

  const handleConfirmReview = async () => {
    if (!selectedAbsenceRequest || !reviewAction) return;

    // Kiểm tra nếu từ chối mà chưa có lý do
    if (reviewAction === "rejected" && !reviewNote.trim()) {
      enqueueSnackbar("Vui lòng nhập lý do từ chối", { variant: "warning" });
      return;
    }

    try {
      await dispatch(
        reviewerUpdateRequestStatus({
          requestId: selectedAbsenceRequest._id,
          statusData: {
            status: reviewAction,
            reviewer_notes: reviewNote, // Đổi tên trường ở đây
          },
        })
      ).unwrap();

      // Sau khi cập nhật thành công
      dispatch(fetchAllAbsenceRequestsForReview({ teaching_class_id: id }));

      enqueueSnackbar(
        `Đơn xin nghỉ đã được ${
          reviewAction === "approved" ? "chấp thuận" : "từ chối"
        }.`,
        { variant: "success" }
      );

      // Reset form
      setReviewNote("");
      handleCloseReviewDialog();
    } catch (error) {
      console.error("Lỗi khi xử lý đơn xin nghỉ:", error);
      enqueueSnackbar(
        error.message ||
          `Lỗi khi ${reviewAction === "approved" ? "duyệt" : "từ chối"} đơn.`,
        { variant: "error" }
      );
    }
  };

  // Hàm xuất báo cáo đơn xin nghỉ
  const handleExportAbsenceReport = () => {
    try {
      const csvData = filteredAbsenceRequests
        .filter((request) => {
          if (statusFilter === "all") return true;
          return request.status === statusFilter;
        })
        .map((request) => ({
          MSSV: request.student_id?.school_info?.student_id || "N/A",
          "Họ và tên": request.student_id?.full_name || "N/A",
          "Ngày học": request.session_id?.date
            ? new Date(request.session_id.date).toLocaleDateString("vi-VN")
            : "N/A",
          "Tiết học": `${request.session_id?.start_period || "N/A"} - ${
            request.session_id?.end_period || "N/A"
          }`,
          "Thời gian": `${
            request.session_id?.start_time
              ? new Date(request.session_id.start_time).toLocaleTimeString(
                  "vi-VN",
                  { hour: "2-digit", minute: "2-digit" }
                )
              : "N/A"
          } - ${
            request.session_id?.end_time
              ? new Date(request.session_id.end_time).toLocaleTimeString(
                  "vi-VN",
                  { hour: "2-digit", minute: "2-digit" }
                )
              : "N/A"
          }`,
          "Lý do": request.reason || "N/A",
          "Trạng thái":
            request.status === "pending"
              ? "Chờ duyệt"
              : request.status === "approved"
              ? "Đã duyệt"
              : "Đã từ chối",
          "Ngày gửi": new Date(request.created_at).toLocaleString("vi-VN"),
          "Ngày cập nhật": request.updated_at
            ? new Date(request.updated_at).toLocaleString("vi-VN")
            : "N/A",
        }));

      // Tạo header cho file CSV
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          headers.map((header) => `"${row[header]}"`).join(",")
        ),
      ].join("\n");

      // Tạo và tải file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `don_xin_nghi_${classInfo?.class_code}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      enqueueSnackbar("Xuất báo cáo thành công", { variant: "success" });
    } catch (error) {
      console.error("Lỗi khi xuất báo cáo:", error);
      enqueueSnackbar("Lỗi khi xuất báo cáo", { variant: "error" });
    }
  };

  // Handlers for Teacher Evidence Modal
  const handleOpenTeacherEvidenceModal = (url) => {
    setTeacherEvidenceImageUrl(url);
    setOpenTeacherEvidenceModal(true);
  };

  const handleCloseTeacherEvidenceModal = () => {
    setOpenTeacherEvidenceModal(false);
    setTeacherEvidenceImageUrl("");
  };

  // Hàm xử lý xem chi tiết điểm danh sinh viên
  const handleViewStudentAttendance = (student) => {
    setSelectedStudentForAttendance(student);
    setOpenAttendanceDetail(true);
  };

  const handleCloseAttendanceDetail = () => {
    setOpenAttendanceDetail(false);
    setSelectedStudentForAttendance(null);
  };

  return (
    <Box sx={{ p: 3, bgcolor: "grey.50", minHeight: "100vh" }}>
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
              <School sx={{ mr: 1, verticalAlign: "middle" }} />
              {classInfo?.class_name || "Chi tiết lớp học"}
            </Typography>
            <Box>
              {/* NÚT CHỈNH SỬA LỚP HỌC Ở GÓC TRÊN - XÓA
              <Button
                variant="contained"
                color="primary"
                onClick={() => setEditMode(true)}
                disabled={isLoading} // editMode đã bị xóa
                startIcon={<Edit />}
                sx={{ mr: 1 }}
              >
                Chỉnh sửa lớp học
              </Button>
              */}
            </Box>
          </Box>

          {/* Hiển thị thông tin cơ bản về lớp học */}
          <Paper
            sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 3 }}
            elevation={3}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Mã lớp
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {classInfo?.class_code || "Không có"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Môn học
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {classInfo?.subject_id?.name || "Không xác định"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Kỳ học
                </Typography>
                <Chip
                  label={
                    classInfo?.semester_id?.name
                      ? `${classInfo.semester_id.name} (${
                          classInfo.semester_id.academic_year ||
                          classInfo.semester_id.year
                        })`
                      : "Không xác định"
                  }
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Lớp chính
                </Typography>
                <Chip
                  label={
                    classInfo?.main_class_id?.name ||
                    "Không thuộc lớp chính nào"
                  }
                  color="info"
                  variant={classInfo?.main_class_id ? "filled" : "outlined"}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Giảng viên
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {classInfo?.teacher_id?.full_name || "Không xác định"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Ngày bắt đầu - Kết thúc
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {classInfo?.course_start_date
                    ? new Date(classInfo.course_start_date).toLocaleDateString(
                        "vi-VN"
                      )
                    : "N/A"}{" "}
                  -{" "}
                  {classInfo?.course_end_date
                    ? new Date(classInfo.course_end_date).toLocaleDateString(
                        "vi-VN"
                      )
                    : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Số buổi học
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {classInfo?.total_sessions || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Số lượng sinh viên
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                  {Array.isArray(classInfo?.students)
                    ? classInfo.students.length
                    : 0}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  Trạng thái lớp học
                </Typography>
                <Chip
                  label={
                    getVietnameseClassStatus(derivedClassStatus) ||
                    "Đang tải..."
                  }
                  color={
                    derivedClassStatus === "IN_PROGRESS"
                      ? "warning"
                      : derivedClassStatus === "COMPLETED"
                      ? "success"
                      : derivedClassStatus === "NOT_STARTED"
                      ? "info"
                      : "default"
                  }
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Hiển thị cảnh báo xung đột lịch nếu đang trong chế độ chỉnh sửa - XÓA PHẦN NÀY VÌ editMode BỊ XÓA */}
          {/* {editMode && renderConflictWarnings()} */}

          {/* Các nút hành động khi chỉnh sửa - XÓA KHỐI NÀY VÌ editMode BỊ XÓA */}
          {/*
          {editMode && (
            <Box
              sx={{
                mt: 3,
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                onClick={() => {
                  // setEditMode(false); // Sẽ bị lỗi nếu editMode bị xóa
                  setEditClassData({ ...classInfo });
                  setScheduleDays(
                    classInfo.schedule?.map((item) => ({ ...item })) || []
                  );
                  setConflictWarnings([]); 
                }}
                disabled={isUpdating || checkingConflicts}
              >
                Hủy
              </Button>
              <Button
                variant="contained"
                onClick={handleUpdateClass}
                disabled={isUpdating || checkingConflicts}
                startIcon={
                  isUpdating || checkingConflicts ? (
                    <CircularProgress size={20} />
                  ) : null
                }
              >
                {isUpdating
                  ? "Đang cập nhật..."
                  : checkingConflicts
                  ? "Đang kiểm tra..."
                  : "Lưu thay đổi"}
              </Button>
            </Box>
          )}
          */}

          {/* Tabs */}
          <Box sx={{ width: "100%", mt: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleChangeTab}
                aria-label="class tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab
                  label="Lịch học"
                  {...a11yProps(0)}
                  icon={<Event />}
                  iconPosition="start"
                />
                <Tab
                  label="Buổi điểm danh"
                  {...a11yProps(1)}
                  icon={<CalendarToday />}
                  iconPosition="start"
                />
                <Tab
                  label="Sinh viên"
                  {...a11yProps(2)}
                  icon={<School />}
                  iconPosition="start"
                />
                <Tab
                  label="Thống kê"
                  {...a11yProps(3)}
                  icon={<Info />}
                  iconPosition="start"
                />
                <Tab
                  label="Cấu hình"
                  {...a11yProps(4)}
                  icon={<Settings />}
                  iconPosition="start"
                />
                <Tab
                  label="Đơn xin nghỉ phép"
                  {...a11yProps(5)} // Index mới cho tab
                  icon={<MailOutlineIcon />}
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Tab Lịch học */}
            <TabPanel value={tabValue} index={0}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Lịch học của lớp
                </Typography>
                {classInfo?.schedule && classInfo.schedule.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.100" }}>
                          <TableCell>Thứ</TableCell>
                          <TableCell>Tiết học</TableCell>
                          <TableCell>Thời gian</TableCell>
                          <TableCell>Phòng học</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {classInfo.schedule.map((day, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip
                                label={getDayOfWeekName(day.day_of_week)}
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              Tiết {day.start_period} - {day.end_period}
                            </TableCell>
                            <TableCell>
                              {day.start_time} - {day.end_time}
                            </TableCell>
                            <TableCell>
                              {(day.room_id &&
                                rooms.find((r) => r._id === day.room_id)
                                  ?.room_number) ||
                                (classInfo.room?.room_number
                                  ? classInfo.room.room_number
                                  : "Chưa xác định")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    Chưa có thông tin lịch học cho lớp này
                  </Alert>
                )}
                {/* Nút chỉnh sửa lịch học trong tab Lịch học - Bỏ điều kiện editMode */}
                <Tooltip
                  title={
                    derivedClassStatus !== "NOT_STARTED"
                      ? `Lớp học ${getVietnameseClassStatus(
                          derivedClassStatus
                        )}, không thể chỉnh sửa`
                      : "Chỉnh sửa lịch học"
                  }
                >
                  <span>
                    {" "}
                    {/* Span để Tooltip hoạt động khi Button bị disabled */}
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleOpenEditClassDialog}
                      sx={{ mt: 2 }}
                      startIcon={<Edit />}
                      disabled={
                        derivedClassStatus !== "NOT_STARTED" || isUpdating
                      }
                    >
                      Chỉnh sửa lịch học
                    </Button>
                  </span>
                </Tooltip>
              </Paper>
            </TabPanel>

            {/* Tab Buổi điểm danh */}
            <TabPanel value={tabValue} index={1}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 3,
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Quản lý điểm danh
                  </Typography>
                  {/* Nút tạo buổi điểm danh - ĐÃ BỊ XÓA
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={handleOpenSessionDialog}
                  >
                    Tạo buổi điểm danh
                  </Button>
                  */}
                </Box>

                {attendanceSessions.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.100" }}>
                          <TableCell>Ngày</TableCell>
                          <TableCell>Thời gian</TableCell>
                          <TableCell>Trạng thái</TableCell>
                          <TableCell>Phòng học</TableCell>
                          <TableCell>Ghi chú</TableCell>
                          <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendanceSessions.map((session) => (
                          <TableRow key={session._id}>
                            <TableCell>
                              {new Date(session.date).toLocaleDateString(
                                "vi-VN"
                              )}
                            </TableCell>
                            <TableCell>
                              {session.start_time && session.end_time
                                ? `${new Date(
                                    session.start_time
                                  ).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    // timeZone: "UTC", // Bỏ dòng này để dùng múi giờ địa phương
                                  })} - ${new Date(
                                    session.end_time
                                  ).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    // timeZone: "UTC", // Bỏ dòng này để dùng múi giờ địa phương
                                  })}`
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  session.status === "completed"
                                    ? "Đã hoàn thành"
                                    : session.status === "active"
                                    ? "Đang diễn ra"
                                    : "Chưa bắt đầu"
                                }
                                color={
                                  session.status === "completed"
                                    ? "success"
                                    : session.status === "active"
                                    ? "warning"
                                    : "primary"
                                }
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {getRoomDetailsString(
                                session.room?._id || session.room
                              )}
                            </TableCell>
                            <TableCell>
                              {session.notes && session.notes.length > 20
                                ? `${session.notes.substring(0, 20)}...`
                                : session.notes || ""}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip
                                title={
                                  session.notes
                                    ? "Xem/Sửa Ghi chú"
                                    : "Thêm Ghi chú"
                                }
                              >
                                <IconButton
                                  onClick={() => handleOpenNotesDialog(session)}
                                  size="small"
                                  sx={{ mr: 0.5 }}
                                >
                                  <AssignmentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={() => handleStartSession(session._id)}
                                startIcon={
                                  session.status === "completed" ? (
                                    <CheckCircle />
                                  ) : (
                                    <PlayArrow />
                                  )
                                }
                              >
                                {session.status === "completed"
                                  ? "Xem"
                                  : "Bắt đầu"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    Chưa có buổi điểm danh nào được tạo
                  </Alert>
                )}
              </Paper>
            </TabPanel>

            {/* Tab Sinh viên */}
            <TabPanel value={tabValue} index={2}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 3,
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Danh sách sinh viên ({students.length})
                  </Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<Download />}
                      onClick={handleExportStudentList}
                      sx={{ mr: 1 }}
                    >
                      Xuất DS
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PersonAdd />}
                      onClick={handleOpenAddStudentDialog}
                    >
                      Thêm sinh viên
                    </Button>
                  </Box>
                </Box>

                {students.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "grey.100" }}>
                          <TableCell>STT</TableCell>
                          <TableCell>Mã SV</TableCell>
                          <TableCell>Họ tên</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Đăng ký khuôn mặt</TableCell>
                          <TableCell>Số buổi vắng</TableCell>
                          <TableCell>Điều kiện thi</TableCell>
                          <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {students.map((student, index) => (
                          <TableRow key={student._id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              {student.school_info?.student_id ||
                                "Chưa có mã SV"}
                            </TableCell>
                            <TableCell>{student.full_name}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  student.has_face_data
                                    ? "Đã đăng ký"
                                    : "Chưa đăng ký"
                                }
                                color={
                                  student.has_face_data ? "success" : "warning"
                                }
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {student.score ? (
                                <Tooltip
                                  title={`Tối đa vắng: ${
                                    student.score.max_absent_allowed != null
                                      ? student.score.max_absent_allowed
                                      : classInfo?.max_absent_allowed || "N/A"
                                  } buổi`}
                                >
                                  <Chip
                                    label={`${
                                      student.score.absent_sessions ?? 0
                                    } / ${
                                      student.score.max_absent_allowed != null
                                        ? student.score.max_absent_allowed
                                        : classInfo?.max_absent_allowed || "N/A"
                                    }`}
                                    size="small"
                                    color={
                                      (student.score.absent_sessions ?? 0) >
                                      (student.score.max_absent_allowed != null
                                        ? student.score.max_absent_allowed
                                        : classInfo?.max_absent_allowed ||
                                          Infinity)
                                        ? "error"
                                        : "default"
                                    }
                                    variant="outlined"
                                  />
                                </Tooltip>
                              ) : (
                                <Chip
                                  label="N/A"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {student.score ? (
                                student.score.is_failed_due_to_absent ? (
                                  <Chip
                                    label="Không đủ ĐK (vắng)"
                                    color="error"
                                    size="small"
                                  />
                                ) : (
                                  <Chip
                                    label="Đủ điều kiện"
                                    color="success"
                                    size="small"
                                  />
                                )
                              ) : (
                                <Chip
                                  label="Chưa có dữ liệu"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Xem chi tiết điểm danh">
                                <IconButton
                                  color="primary"
                                  onClick={() =>
                                    handleViewStudentAttendance(student)
                                  }
                                  size="small"
                                  sx={{ mr: 1 }}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa khỏi lớp">
                                <IconButton
                                  color="error"
                                  onClick={() =>
                                    handleRemoveStudent(student._id)
                                  }
                                  size="small"
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    Chưa có sinh viên nào trong lớp này
                  </Alert>
                )}
              </Paper>
            </TabPanel>

            {/* Tab Thống kê */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={2}
                    sx={{ p: 3, borderRadius: 2, height: "100%" }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Thống kê điểm danh
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: "center",
                              bgcolor: "primary.lighter",
                              color: "primary.dark",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="h4">
                              {sessionStats.total}
                            </Typography>
                            <Typography variant="body2">
                              Tổng buổi học
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: "center",
                              bgcolor: "success.lighter",
                              color: "success.dark",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="h4">
                              {sessionStats.completed}
                            </Typography>
                            <Typography variant="body2">
                              Đã hoàn thành
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: "center",
                              bgcolor: "warning.lighter",
                              color: "warning.dark",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="h4">
                              {sessionStats.pending}
                            </Typography>
                            <Typography variant="body2">
                              Chưa bắt đầu
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={2}
                    sx={{ p: 3, borderRadius: 2, height: "100%" }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Thống kê sinh viên
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: "center",
                              bgcolor: "info.lighter",
                              color: "info.dark",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="h4">
                              {students.length}
                            </Typography>
                            <Typography variant="body2">
                              Tổng sinh viên
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: "center",
                              bgcolor: "success.lighter",
                              color: "success.dark",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="h4">
                              {students.filter((s) => s.has_face_data).length}
                            </Typography>
                            <Typography variant="body2">
                              Đã đăng ký KM
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper
                            sx={{
                              p: 2,
                              textAlign: "center",
                              bgcolor: "warning.lighter",
                              color: "warning.dark",
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="h4">
                              {students.filter((s) => !s.has_face_data).length}
                            </Typography>
                            <Typography variant="body2">
                              Chưa đăng ký KM
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab Cấu hình */}
            <TabPanel value={tabValue} index={4}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Cấu hình lớp học
                </Typography>

                <Tooltip
                  title={
                    derivedClassStatus !== "NOT_STARTED"
                      ? `Lớp học ${getVietnameseClassStatus(
                          derivedClassStatus
                        )}, không thể chỉnh sửa`
                      : "Chỉnh sửa thông tin lớp"
                  }
                >
                  <span>
                    {" "}
                    {/* Span để Tooltip hoạt động khi Button bị disabled */}
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Edit />}
                      onClick={handleOpenEditClassDialog}
                      sx={{ mt: 2 }}
                      disabled={
                        derivedClassStatus !== "NOT_STARTED" || isUpdating
                      }
                    >
                      Chỉnh sửa thông tin lớp
                    </Button>
                  </span>
                </Tooltip>
              </Paper>
            </TabPanel>

            {/* Tab Đơn Xin Nghỉ Phép */}
            <TabPanel value={tabValue} index={5}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Danh sách đơn xin nghỉ phép
                </Typography>

                {/* Thống kê tổng quan */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor: "info.lighter",
                      }}
                    >
                      <Typography variant="h4" color="info.dark">
                        {absenceStats.total}
                      </Typography>
                      <Typography variant="body2">Tổng số đơn</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor: "warning.lighter",
                      }}
                    >
                      <Typography variant="h4" color="warning.dark">
                        {absenceStats.pending}
                      </Typography>
                      <Typography variant="body2">Chờ duyệt</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor: "success.lighter",
                      }}
                    >
                      <Typography variant="h4" color="success.dark">
                        {absenceStats.approved}
                      </Typography>
                      <Typography variant="body2">Đã duyệt</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: "center",
                        bgcolor: "error.lighter",
                      }}
                    >
                      <Typography variant="h4" color="error.dark">
                        {absenceStats.rejected}
                      </Typography>
                      <Typography variant="body2">Đã từ chối</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Thanh công cụ */}
                <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Trạng thái"
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      <MenuItem value="pending">Chờ duyệt</MenuItem>
                      <MenuItem value="approved">Đã duyệt</MenuItem>
                      <MenuItem value="rejected">Đã từ chối</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    placeholder="Tìm kiếm theo tên, MSSV..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ flexGrow: 1 }}
                  />

                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleExportAbsenceReport}
                  >
                    Xuất báo cáo
                  </Button>
                </Box>

                {absenceRequestsLoading && <CircularProgress />}
                {absenceRequestsError && (
                  <Alert severity="error">{absenceRequestsError}</Alert>
                )}
                {!absenceRequestsLoading &&
                  !absenceRequestsError &&
                  filteredAbsenceRequests.length === 0 && (
                    <Alert severity="info">
                      Chưa có đơn xin nghỉ phép nào cho lớp này.
                    </Alert>
                  )}
                {!absenceRequestsLoading &&
                  !absenceRequestsError &&
                  filteredAbsenceRequests.length > 0 && (
                    <>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: "grey.100" }}>
                              <TableCell>Sinh viên</TableCell>
                              <TableCell>Buổi học</TableCell>
                              <TableCell>Thời gian</TableCell>
                              <TableCell>Lý do</TableCell>
                              <TableCell>Trạng thái</TableCell>
                              <TableCell align="right">Hành động</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredAbsenceRequests
                              .filter((request) => {
                                if (statusFilter === "all") return true;
                                return request.status === statusFilter;
                              })
                              .filter(
                                (request) =>
                                  request.student_id?.full_name
                                    ?.toLowerCase()
                                    .includes(searchTerm.toLowerCase()) ||
                                  request.student_id?.school_info?.student_id
                                    ?.toLowerCase()
                                    .includes(searchTerm.toLowerCase())
                              )
                              .slice(
                                page * rowsPerPage,
                                (page + 1) * rowsPerPage
                              )
                              .map((request) => (
                                <TableRow key={request._id}>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {request.student_id?.full_name || "N/A"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                    >
                                      MSSV:{" "}
                                      {request.student_id?.school_info
                                        ?.student_id || "N/A"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {request.session_id?.date
                                        ? new Date(
                                            request.session_id.date
                                          ).toLocaleDateString("vi-VN")
                                        : "N/A"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                    >
                                      Tiết: {request.session_id?.start_period} -{" "}
                                      {request.session_id?.end_period}
                                      <br />
                                      {request.session_id?.start_time &&
                                      request.session_id?.end_time
                                        ? `${new Date(
                                            request.session_id.start_time
                                          ).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })} - ${new Date(
                                            request.session_id.end_time
                                          ).toLocaleTimeString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}`
                                        : ""}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      Gửi:{" "}
                                      {new Date(
                                        request.created_at
                                      ).toLocaleString("vi-VN")}
                                    </Typography>
                                    {request.updated_at &&
                                      request.updated_at !==
                                        request.created_at && (
                                        <Typography
                                          variant="caption"
                                          color="textSecondary"
                                        >
                                          Cập nhật:{" "}
                                          {new Date(
                                            request.updated_at
                                          ).toLocaleString("vi-VN")}
                                        </Typography>
                                      )}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      maxWidth: 200,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <Tooltip title={request.reason}>
                                      <Typography variant="body2">
                                        {request.reason}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={
                                        request.status === "pending"
                                          ? "Chờ duyệt"
                                          : request.status === "approved"
                                          ? "Đã duyệt"
                                          : "Đã từ chối"
                                      }
                                      color={
                                        request.status === "pending"
                                          ? "warning"
                                          : request.status === "approved"
                                          ? "success"
                                          : "error"
                                      }
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 1,
                                        justifyContent: "flex-end",
                                      }}
                                    >
                                      {request.status === "pending" && (
                                        <>
                                          <Tooltip title="Duyệt đơn">
                                            <Button
                                              size="small"
                                              variant="contained"
                                              color="success"
                                              onClick={() =>
                                                handleOpenReviewDialog(
                                                  request,
                                                  "approved"
                                                )
                                              }
                                              disabled={absenceRequestUpdating}
                                            >
                                              Duyệt
                                            </Button>
                                          </Tooltip>
                                          <Tooltip title="Từ chối đơn">
                                            <Button
                                              size="small"
                                              variant="contained"
                                              color="error"
                                              onClick={() =>
                                                handleOpenReviewDialog(
                                                  request,
                                                  "rejected"
                                                )
                                              }
                                              disabled={absenceRequestUpdating}
                                            >
                                              Từ chối
                                            </Button>
                                          </Tooltip>
                                        </>
                                      )}
                                      {request.evidence_url && (
                                        <Tooltip title="Xem bằng chứng">
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              handleOpenTeacherEvidenceModal(
                                                request.evidence_url
                                              )
                                            }
                                          >
                                            <ImageIcon />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        component="div"
                        count={filteredAbsenceRequests.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRowsPerPage(parseInt(e.target.value, 10));
                          setPage(0);
                        }}
                        labelRowsPerPage="Số dòng mỗi trang"
                        labelDisplayedRows={({ from, to, count }) =>
                          `${from}-${to} trên ${
                            count !== -1 ? count : `hơn ${to}`
                          }`
                        }
                      />
                    </>
                  )}
              </Paper>
            </TabPanel>
            {/* Kết thúc Tab Đơn Xin Nghỉ Phép */}
          </Box>

          {/* Dialog thêm sinh viên */}
          <Dialog
            open={openAddStudentDialog}
            onClose={handleCloseAddStudentDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Thêm sinh viên vào lớp</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Chọn lớp chính</InputLabel>
                    <Select
                      value={selectedMainClass}
                      onChange={handleMainClassChange}
                      label="Chọn lớp chính"
                    >
                      <MenuItem value="">Chọn lớp chính</MenuItem>
                      {mainClasses.map((cls) => (
                        <MenuItem key={cls._id} value={cls._id}>
                          {cls.name} ({cls.class_code})
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Chọn lớp chính để xem danh sách sinh viên
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Tìm kiếm sinh viên"
                    variant="outlined"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Nhập tên, mã SV hoặc email để tìm kiếm"
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  {isLoadingStudents ? (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        p: 3,
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : filteredAvailableStudents.length > 0 ? (
                    <List
                      sx={{
                        width: "100%",
                        bgcolor: "background.paper",
                        maxHeight: 300,
                        overflow: "auto",
                      }}
                    >
                      {filteredAvailableStudents.map((student) => (
                        <ListItem key={student._id} divider>
                          <Checkbox
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => handleSelectStudent(student._id)}
                          />
                          <ListItemText
                            primary={student.full_name}
                            secondary={
                              <>
                                MSSV: {student.school_info?.student_id || "N/A"}
                                <br />
                                Email: {student.email}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info" sx={{ width: "100%" }}>
                      {!selectedMainClass
                        ? "Vui lòng chọn lớp chính để xem danh sách sinh viên"
                        : "Không tìm thấy sinh viên phù hợp hoặc đã thêm tất cả sinh viên từ lớp này"}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
              <Button
                onClick={handleCloseAddStudentDialog}
                color="inherit"
                variant="outlined"
              >
                Hủy
              </Button>
              <Button
                onClick={handleAddStudents}
                color="primary"
                variant="contained"
                disabled={selectedStudents.length === 0}
              >
                Thêm {selectedStudents.length} sinh viên
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog tạo buổi điểm danh */}
          <Dialog
            open={openSessionDialog}
            onClose={handleCloseSessionDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {sessionFormData._id
                ? "Chỉnh sửa buổi điểm danh"
                : "Tạo buổi điểm danh mới"}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ pt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tên buổi học"
                    name="title"
                    value={sessionFormData.title}
                    onChange={handleSessionFormChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Số buổi (thứ tự)"
                    name="session_number"
                    type="number"
                    value={sessionFormData.session_number}
                    onChange={handleSessionFormChange}
                    required
                    InputProps={{
                      inputProps: {
                        min: 1,
                        max: classInfo?.total_sessions || 15,
                      },
                    }}
                    helperText={`Buổi học thứ (1-${
                      classInfo?.total_sessions || "?"
                    })`}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ngày"
                    name="date"
                    type="date"
                    value={sessionFormData.date}
                    onChange={handleSessionFormChange}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Phòng học</InputLabel>
                    <Select
                      label="Phòng học"
                      name="room"
                      value={sessionFormData.room}
                      onChange={handleSessionFormChange}
                    >
                      <MenuItem value="">
                        <em>Không chọn phòng học</em>
                      </MenuItem>
                      {rooms.map((room) => (
                        <MenuItem key={room._id} value={room._id}>
                          {room.room_number} - Tòa{" "}
                          {room.building_id?.name || "N/A"}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Chọn phòng học cho buổi điểm danh
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Giờ bắt đầu"
                    name="start_time"
                    type="time"
                    value={sessionFormData.start_time}
                    onChange={handleSessionFormChange}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Giờ kết thúc"
                    name="end_time"
                    type="time"
                    value={sessionFormData.end_time}
                    onChange={handleSessionFormChange}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tiết bắt đầu"
                    name="start_period"
                    type="number"
                    value={sessionFormData.start_period}
                    onChange={handleSessionFormChange}
                    InputProps={{ inputProps: { min: 1, max: 15 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tiết kết thúc"
                    name="end_period"
                    type="number"
                    value={sessionFormData.end_period}
                    onChange={handleSessionFormChange}
                    InputProps={{ inputProps: { min: 1, max: 15 } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Ghi chú"
                    name="notes"
                    multiline
                    rows={3}
                    value={sessionFormData.notes}
                    onChange={handleSessionFormChange}
                    placeholder="Nhập ghi chú về buổi học (nếu có)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Lưu ý: Thời gian buổi học phải nằm trong khoảng thời gian
                    của học kỳ (
                    {classInfo?.semester_id?.start_date
                      ? new Date(
                          classInfo.semester_id.start_date
                        ).toLocaleDateString("vi-VN")
                      : "?"}{" "}
                    -
                    {classInfo?.semester_id?.end_date
                      ? new Date(
                          classInfo.semester_id.end_date
                        ).toLocaleDateString("vi-VN")
                      : "?"}
                    )
                  </Alert>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
              <Button
                onClick={handleCloseSessionDialog}
                color="inherit"
                variant="outlined"
              >
                Hủy
              </Button>
              <Button
                onClick={
                  sessionFormData._id
                    ? handleUpdateSession
                    : handleCreateSession
                }
                color="primary"
                variant="contained"
              >
                {sessionFormData._id ? "Cập nhật" : "Tạo buổi điểm danh"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog chỉnh sửa lớp học */}
          <Dialog
            open={openEditClassDialog}
            onClose={handleCloseEditClassDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Chỉnh sửa thông tin lớp học</DialogTitle>
            <DialogContent dividers>
              {editClassData && (
                <Grid container spacing={2} sx={{ pt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Tên lớp"
                      name="class_name"
                      value={editClassData.class_name}
                      onChange={handleEditClassChange}
                      required
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
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Môn học</InputLabel>
                      <Select
                        name="subject_id"
                        value={editClassData.subject_id}
                        onChange={handleEditClassChange}
                        label="Môn học"
                      >
                        {subjects.map((subject) => (
                          <MenuItem key={subject._id} value={subject._id}>
                            {subject.name} ({subject.code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Học kỳ</InputLabel>
                      <Select
                        name="semester_id"
                        value={editClassData.semester_id}
                        onChange={handleEditClassChange}
                        label="Học kỳ"
                      >
                        {semesters.map((semester) => (
                          <MenuItem key={semester._id} value={semester._id}>
                            {semester.name} (
                            {semester.academic_year || semester.year})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Lớp chính</InputLabel>
                      <Select
                        name="main_class_id"
                        value={editClassData.main_class_id}
                        onChange={handleEditClassChange}
                        label="Lớp chính"
                      >
                        <MenuItem value="">Không chọn lớp chính</MenuItem>
                        {mainClasses.map((cls) => (
                          <MenuItem key={cls._id} value={cls._id}>
                            {cls.name} ({cls.class_code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Số buổi học"
                      name="total_sessions"
                      type="number"
                      value={editClassData.total_sessions}
                      onChange={handleTotalSessionsChange}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Ngày bắt đầu"
                      name="course_start_date"
                      type="date"
                      value={editClassData.course_start_date}
                      onChange={handleStartDateChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Ngày kết thúc (tự động tính)"
                      name="course_end_date"
                      type="date"
                      value={editClassData.course_end_date}
                      disabled
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Phần cấu hình lịch học */}
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                      Cấu hình lịch học
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {scheduleDays.map((day, index) => (
                      <Paper
                        key={index}
                        sx={{ p: 2, mb: 2, position: "relative" }}
                        variant="outlined"
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Thứ</InputLabel>
                              <Select
                                label="Thứ"
                                value={
                                  day.day_of_week !== undefined
                                    ? day.day_of_week
                                    : ""
                                }
                                onChange={(e) =>
                                  handleScheduleChange(
                                    index,
                                    "day_of_week",
                                    e.target.value
                                  )
                                }
                              >
                                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                                  <MenuItem key={d} value={d}>
                                    {getDayOfWeekName(d)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6} sm={3} md={1.5}>
                            <TextField
                              fullWidth
                              label="Tiết BĐ"
                              type="number"
                              size="small"
                              value={day.start_period}
                              onChange={(e) =>
                                handleScheduleChange(
                                  index,
                                  "start_period",
                                  e.target.value
                                )
                              }
                              InputProps={{ inputProps: { min: 1, max: 15 } }}
                            />
                          </Grid>
                          <Grid item xs={6} sm={3} md={1.5}>
                            <TextField
                              fullWidth
                              label="Tiết KT"
                              type="number"
                              size="small"
                              value={day.end_period}
                              onChange={(e) =>
                                handleScheduleChange(
                                  index,
                                  "end_period",
                                  e.target.value
                                )
                              }
                              InputProps={{
                                inputProps: {
                                  min: day.start_period || 1,
                                  max: 15,
                                },
                              }}
                            />
                          </Grid>
                          {/* Thời gian có thể ẩn hoặc hiển thị dạng readOnly nếu được tính từ tiết */}
                          <Grid item xs={6} sm={3} md={3}>
                            <TextField
                              fullWidth
                              label="Giờ BĐ"
                              type="time"
                              size="small"
                              value={day.start_time}
                              InputLabelProps={{ shrink: true }}
                              onChange={(e) =>
                                handleScheduleChange(
                                  index,
                                  "start_time",
                                  e.target.value
                                )
                              }
                            />
                          </Grid>
                          <Grid item xs={6} sm={3} md={3}>
                            <TextField
                              fullWidth
                              label="Giờ KT"
                              type="time"
                              size="small"
                              value={day.end_time}
                              InputLabelProps={{ shrink: true }}
                              onChange={(e) =>
                                handleScheduleChange(
                                  index,
                                  "end_time",
                                  e.target.value
                                )
                              }
                            />
                          </Grid>

                          <Grid item xs={12} sm={4} md={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Cơ sở</InputLabel>
                              <Select
                                label="Cơ sở"
                                value={day.campusId || ""}
                                onChange={(e) =>
                                  handleScheduleChange(
                                    index,
                                    "campusId",
                                    e.target.value
                                  )
                                }
                              >
                                <MenuItem value="">
                                  <em>Chọn cơ sở</em>
                                </MenuItem>
                                {campuses.map((campus) => (
                                  <MenuItem key={campus._id} value={campus._id}>
                                    {campus.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={4} md={4}>
                            <FormControl
                              fullWidth
                              size="small"
                              disabled={!day.campusId}
                            >
                              <InputLabel>Tòa nhà</InputLabel>
                              <Select
                                label="Tòa nhà"
                                value={day.buildingId || ""}
                                onChange={(e) =>
                                  handleScheduleChange(
                                    index,
                                    "buildingId",
                                    e.target.value
                                  )
                                }
                              >
                                <MenuItem value="">
                                  <em>Chọn tòa nhà</em>
                                </MenuItem>
                                {day.availableBuildings &&
                                  day.availableBuildings.map((building) => (
                                    <MenuItem
                                      key={building._id}
                                      value={building._id}
                                    >
                                      {building.name}
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={4} md={4}>
                            <FormControl
                              fullWidth
                              size="small"
                              disabled={!day.buildingId}
                            >
                              <InputLabel>Phòng học</InputLabel>
                              <Select
                                label="Phòng học"
                                value={day.room_id || ""}
                                onChange={(e) =>
                                  handleScheduleChange(
                                    index,
                                    "room_id",
                                    e.target.value
                                  )
                                }
                              >
                                <MenuItem value="">
                                  <em>Chọn phòng học</em>
                                </MenuItem>
                                {day.availableRooms &&
                                  day.availableRooms.map((room) => (
                                    <MenuItem key={room._id} value={room._id}>
                                      {room.room_number} (SL: {room.capacity})
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>

                        {scheduleDays.length > 1 && (
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => removeScheduleDay(index)}
                            sx={{ position: "absolute", top: 8, right: 8 }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Paper>
                    ))}

                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={addScheduleDay}
                      sx={{ mt: 1 }}
                    >
                      Thêm buổi học
                    </Button>
                  </Grid>

                  {/* Xóa Phần chọn Cơ sở, Tòa nhà, Phòng học chung ở cuối */}
                  {/*
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Cơ sở</InputLabel>
                      <Select
                        name="campus_id"
                        value={selectedCampus}
                        onChange={handleCampusChange} 
                        label="Cơ sở"
                      >
                        <MenuItem value="">
                          <em>Chọn cơ sở</em>
                        </MenuItem>
                        {campuses.map((campus) => (
                          <MenuItem key={campus._id} value={campus._id}>
                            {campus.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth disabled={!selectedCampus}>
                      <InputLabel>Tòa nhà</InputLabel>
                      <Select
                        name="building_id"
                        value={selectedBuilding}
                        onChange={handleBuildingChange} 
                        label="Tòa nhà"
                      >
                        <MenuItem value="">
                          <em>Chọn tòa nhà</em>
                        </MenuItem>
                        {buildings.map((building) => (
                          <MenuItem key={building._id} value={building._id}>
                            {building.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth disabled={!selectedBuilding}>
                      <InputLabel>Phòng học chung</InputLabel>
                      <Select
                        name="room_id" 
                        value={editClassData.room_id || ""} 
                        onChange={handleEditClassChange} 
                        label="Phòng học chung"
                      >
                        <MenuItem value="">
                          <em>Chọn phòng học chung</em>
                        </MenuItem>
                        {rooms.map((room) => (
                          <MenuItem key={room._id} value={room._id}>
                            {room.room_number}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        Phòng học này sẽ được dùng mặc định cho các buổi học mới
                        trong lịch.
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  */}
                </Grid>
              )}
            </DialogContent>
            <DialogActions
              sx={{ p: 2, justifyContent: "space-between", bgcolor: "grey.50" }}
            >
              <Button
                onClick={handleCloseEditClassDialog}
                color="inherit"
                variant="outlined"
                disabled={isUpdating || checkingConflicts}
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateClass}
                color="primary"
                variant="contained"
                disabled={isUpdating || checkingConflicts || !editClassData}
              >
                {isUpdating
                  ? "Đang lưu..."
                  : checkingConflicts
                  ? "Đang kiểm tra..."
                  : "Cập nhật lớp học"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog Ghi chú */}
          <Dialog
            open={openNotesDialog}
            onClose={handleCloseNotesDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ pb: 1 }}>
              {currentSessionForNotes?.notes
                ? "Xem/Sửa ghi chú"
                : "Thêm ghi chú"}
            </DialogTitle>
            <DialogContent dividers sx={{ pt: "16px !important" }}>
              <TextField
                fullWidth
                multiline
                rows={5}
                label="Nội dung ghi chú"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Nhập nội dung ghi chú cho buổi học..."
                variant="outlined"
              />
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
              <Button
                onClick={handleCloseNotesDialog}
                color="inherit"
                variant="outlined"
              >
                Hủy
              </Button>
              <Button
                onClick={handleSaveNotes}
                color="primary"
                variant="contained"
                disabled={isSavingNotes}
              >
                {isSavingNotes ? <CircularProgress size={20} /> : "Lưu ghi chú"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog xác nhận duyệt/từ chối đơn */}
          <Dialog
            open={openReviewDialog}
            onClose={handleCloseReviewDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {reviewAction === "approved"
                ? "Duyệt đơn xin nghỉ"
                : "Từ chối đơn xin nghỉ"}
              <IconButton
                onClick={handleCloseReviewDialog}
                sx={{ position: "absolute", right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Thông tin đơn xin nghỉ:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Sinh viên:</strong>{" "}
                      {selectedAbsenceRequest?.student_id?.full_name}
                      <br />
                      <strong>MSSV:</strong>{" "}
                      {
                        selectedAbsenceRequest?.student_id?.school_info
                          ?.student_id
                      }
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Buổi học:</strong>{" "}
                      {selectedAbsenceRequest?.session_id?.date
                        ? new Date(
                            selectedAbsenceRequest.session_id.date
                          ).toLocaleDateString("vi-VN")
                        : "N/A"}
                      <br />
                      <strong>Tiết:</strong>{" "}
                      {selectedAbsenceRequest?.session_id?.start_period} -{" "}
                      {selectedAbsenceRequest?.session_id?.end_period}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Lý do xin nghỉ:</strong>
                      <br />
                      {selectedAbsenceRequest?.reason}
                    </Typography>
                  </Grid>
                  {reviewAction === "rejected" && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Lý do từ chối"
                        multiline
                        rows={3}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        required
                        error={reviewAction === "rejected" && !reviewNote}
                        helperText={
                          reviewAction === "rejected" && !reviewNote
                            ? "Vui lòng nhập lý do từ chối"
                            : ""
                        }
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "flex-end" }}>
              <Button
                onClick={handleCloseReviewDialog}
                disabled={absenceRequestUpdating}
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirmReview}
                color={reviewAction === "approved" ? "success" : "error"}
                variant="contained"
                disabled={
                  absenceRequestUpdating ||
                  (reviewAction === "rejected" && !reviewNote)
                }
              >
                {absenceRequestUpdating ? (
                  <CircularProgress size={20} />
                ) : reviewAction === "approved" ? (
                  "Duyệt đơn"
                ) : (
                  "Từ chối đơn"
                )}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Teacher Evidence View Modal */}
          <Dialog
            open={openTeacherEvidenceModal}
            onClose={handleCloseTeacherEvidenceModal}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Bằng Chứng Xin Nghỉ
              <IconButton
                onClick={handleCloseTeacherEvidenceModal}
                sx={{ position: "absolute", right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  position: "relative",
                  overflow: "auto",
                  maxHeight: "80vh",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {teacherEvidenceImageUrl ? (
                  <>
                    <img
                      src={teacherEvidenceImageUrl}
                      alt="Bằng chứng"
                      style={{
                        maxWidth: "100%",
                        transform: `scale(${imageScale})`,
                        transformOrigin: "0 0",
                        transition: "transform 0.3s",
                      }}
                    />
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                      }}
                    >
                      <IconButton
                        onClick={() =>
                          setImageScale((s) => Math.max(1, s - 0.1))
                        }
                      >
                        <ZoomOut />
                      </IconButton>
                      <Typography variant="body2">
                        {Math.round(imageScale * 100)}%
                      </Typography>
                      <IconButton onClick={() => setImageScale((s) => s + 0.1)}>
                        <ZoomIn />
                      </IconButton>
                      <IconButton onClick={() => setImageScale(1)}>
                        <RestartAlt />
                      </IconButton>
                      <Tooltip title="Tải xuống">
                        <IconButton
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = teacherEvidenceImageUrl;
                            link.download = `bang_chung_${new Date().getTime()}.jpg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </>
                ) : (
                  <Alert severity="info" sx={{ width: "100%" }}>
                    Không có hình ảnh bằng chứng.
                  </Alert>
                )}
              </Box>
            </DialogContent>
          </Dialog>

          {/* Dialog chi tiết điểm danh sinh viên */}
          <StudentAttendanceDetail
            open={openAttendanceDetail}
            onClose={handleCloseAttendanceDetail}
            studentId={selectedStudentForAttendance?._id}
            classId={classId}
            studentName={selectedStudentForAttendance?.full_name}
          />
        </>
      )}
    </Box>
  );
};

export default TeacherClassDetailPage;
