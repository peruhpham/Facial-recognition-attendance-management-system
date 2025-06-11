import React, { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormHelperText,
  Container,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CardHeader,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  DialogContentText,
} from "@mui/material";
import {
  Search,
  School,
  CalendarToday,
  Class,
  Add,
  BarChart,
  Room as RoomIcon,
  Home as HomeIcon,
  Business as BuildingIcon,
  Event,
  Person,
  Room,
  GridView,
  ViewList,
  DeleteForever,
  Warning,
  Info as InfoIcon,
} from "@mui/icons-material";
import {
  getTeacherClasses,
  getAllSemesters,
  getAllSubjects,
  getAllMainClasses,
  createTeachingClass,
  checkScheduleConflicts,
} from "../../services/api";

const API_URL = process.env.REACT_APP_API_URL;

// --- Định nghĩa thời gian tiết học ---
const periodTimings = {
  1: { start: "07:00", end: "07:45" },
  2: { start: "07:50", end: "08:35" },
  3: { start: "08:40", end: "09:25" },
  4: { start: "09:35", end: "10:20" },
  5: { start: "10:25", end: "11:10" },
  6: { start: "11:15", end: "12:00" },
  // Giả sử có nghỉ trưa
  7: { start: "13:00", end: "13:45" },
  8: { start: "13:50", end: "14:35" },
  9: { start: "14:40", end: "15:25" },
  10: { start: "15:35", end: "16:20" },
  11: { start: "16:25", end: "17:10" },
  12: { start: "17:15", end: "18:00" },
  // Giả sử có tiết tối
  13: { start: "18:05", end: "18:50" },
  14: { start: "18:55", end: "19:40" },
  15: { start: "19:45", end: "20:30" },
  // Thêm các tiết khác nếu cần
};
// --- Kết thúc định nghĩa ---

const TeacherClassesPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user, token } = useSelector((state) => state.auth);

  // State cho dữ liệu
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalClasses, setTotalClasses] = useState(0);

  // State cho tìm kiếm và phân trang
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // State cho dialog thêm lớp học
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClass, setNewClass] = useState({
    class_name: "",
    class_code: "",
    subject_id: "",
    teacher_id: user?._id || "",
    main_class_id: "",
    semester_id: "",
    total_sessions: 15,
    course_start_date: "",
    course_end_date: "",
    auto_generate_sessions: true,
    schedule: [],
  });

  // State cho danh sách dữ liệu tham chiếu
  const [subjects, setSubjects] = useState([]);
  const [mainClasses, setMainClasses] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [scheduleDays, setScheduleDays] = useState([
    {
      day_of_week: 1,
      start_period: 1,
      end_period: 2,
      start_time: periodTimings[1]?.start || "",
      end_time: periodTimings[2]?.end || "",
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

  // State for conflict warnings
  const [conflictWarnings, setConflictWarnings] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Thêm state cho chế độ xem
  const [viewMode, setViewMode] = useState("list");

  // State for delete confirmation dialog
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({
    open: false,
    classToDelete: null,
  });

  // useEffect để kiểm tra ngày kết thúc khóa học với học kỳ
  useEffect(() => {
    if (newClass.course_end_date && newClass.semester_id) {
      const selectedSemester = semesters.find(
        (s) => s._id === newClass.semester_id
      );
      if (selectedSemester) {
        const courseEndDate = new Date(newClass.course_end_date);
        const semesterEndDate = new Date(selectedSemester.end_date);

        courseEndDate.setHours(0, 0, 0, 0);
        semesterEndDate.setHours(23, 59, 59, 999);

        if (courseEndDate > semesterEndDate) {
          enqueueSnackbar(
            `Cảnh báo: Ngày kết thúc khóa học dự kiến (${courseEndDate.toLocaleDateString(
              "vi-VN"
            )}) 
             vượt quá ngày kết thúc của học kỳ (${semesterEndDate.toLocaleDateString(
               "vi-VN"
             )}).`,
            { variant: "warning", autoHideDuration: 8000 }
          );
        }
      }
    }
  }, [
    newClass.course_end_date,
    newClass.semester_id,
    semesters,
    enqueueSnackbar,
  ]);

  // Tải danh sách lớp học
  const fetchClasses = useCallback(async () => {
    if (!user?._id) return; // Không fetch nếu không có user ID

    try {
      setIsLoading(true);
      let url = `${API_URL}/classes/teaching/teacher/${user._id}?page=${
        page + 1
      }&limit=${rowsPerPage}`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (semester) {
        url += `&semester_id=${semester}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setClasses(response.data.data || []);
      setTotalClasses(response.data.count || 0);
    } catch (error) {
      console.error("Lỗi khi tải danh sách lớp học:", error);
      enqueueSnackbar("Lỗi khi tải danh sách lớp học", {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?._id, token, page, rowsPerPage, search, semester, enqueueSnackbar]);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        // Load các học kỳ
        const semestersResponse = await axios.get(`${API_URL}/semesters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSemesters(semestersResponse.data.data || []);
        // Không cần gọi fetchClasses ở đây nữa vì useEffect dưới sẽ xử lý
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu ban đầu:", error); // Sửa lỗi chính tả
        enqueueSnackbar("Lỗi khi tải dữ liệu ban đầu", { variant: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      // Chỉ fetch khi có token
      fetchInitialData();
    }
  }, [token, enqueueSnackbar]);

  // KHÔI PHỤC LẠI useEffect NÀY
  // useEffect chịu trách nhiệm gọi fetchClasses khi các dependencies thay đổi
  useEffect(() => {
    if (user?._id && token) {
      // Đảm bảo user và token tồn tại
      fetchClasses();
    }
  }, [user?._id, token, fetchClasses]); // fetchClasses đã bao gồm các dependencies của nó (page, rowsPerPage, search, semester)

  // Xử lý thay đổi trang
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Xử lý thay đổi số dòng mỗi trang
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Xử lý khi nhấn Enter trong ô tìm kiếm
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      setPage(0); // Reset về trang đầu khi thực hiện tìm kiếm mới
    }
  };

  // Tải dữ liệu tham chiếu cho dialog thêm lớp
  const fetchReferenceData = async () => {
    try {
      const [subjectsRes, mainClassesRes, campusesRes] = await Promise.all([
        axios.get(`${API_URL}/subjects`, {
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
      setMainClasses(mainClassesRes.data.data || []);
      setCampuses(campusesRes.data.data || []);
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

  // Tải danh sách phòng học khi chọn tòa nhà
  const fetchRooms = async (buildingId) => {
    if (!buildingId) {
      setRooms([]);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/facilities/rooms/building/${buildingId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRooms(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng học:", error);
      enqueueSnackbar("Lỗi khi tải danh sách phòng học", { variant: "error" });
    }
  };

  // Mở trang chi tiết lớp học
  const handleViewClass = (classId) => {
    // Kiểm tra classId có tồn tại không
    if (!classId) {
      enqueueSnackbar("ID lớp học không hợp lệ", { variant: "error" });
      return;
    }

    // Không kiểm tra định dạng ObjectId nữa, chấp nhận mọi định dạng ID từ BE
    navigate(`/teacher/classes/${classId}`);
  };

  // Mở dialog thêm lớp học
  const handleOpenAddClassDialog = () => {
    fetchReferenceData();
    setOpenAddClassDialog(true);
  };

  // Đóng dialog thêm lớp học
  const handleCloseAddClassDialog = () => {
    setOpenAddClassDialog(false);
    resetNewClassForm();
  };

  // Reset form thêm lớp
  const resetNewClassForm = () => {
    setNewClass({
      class_name: "",
      class_code: "",
      subject_id: "",
      teacher_id: user?._id || "",
      main_class_id: "",
      semester_id: "",
      total_sessions: 15,
      course_start_date: "",
      course_end_date: "",
      auto_generate_sessions: true,
      schedule: [],
    });
    setScheduleDays([
      {
        day_of_week: 1,
        start_period: 1,
        end_period: 2,
        start_time: periodTimings[1]?.start || "",
        end_time: periodTimings[2]?.end || "",
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
  };

  // Xử lý thay đổi các trường thông tin lớp học
  const handleNewClassChange = (e) => {
    const { name, value } = e.target;

    if (name === "subject_id") {
      const subjectIdValue = value;
      if (subjectIdValue) {
        // Một môn học được chọn
        const selectedSubject = subjects.find(
          (sub) => sub._id === subjectIdValue
        );
        if (selectedSubject && typeof selectedSubject.credits === "number") {
          const newTotalSessions = selectedSubject.credits * 4;
          setNewClass((prev) => ({
            ...prev,
            subject_id: subjectIdValue,
            total_sessions: newTotalSessions,
            course_end_date: calculateEndDate(
              prev.course_start_date,
              scheduleDays,
              newTotalSessions
            ),
          }));
        } else {
          // Môn học được chọn nhưng không tìm thấy hoặc không có thông tin tín chỉ
          setNewClass((prev) => ({
            ...prev,
            subject_id: subjectIdValue,
            // Giữ nguyên total_sessions hiện tại hoặc reset nếu cần
            // Hiện tại: không thay đổi total_sessions nếu không có thông tin tín chỉ rõ ràng
          }));
        }
      } else {
        // Môn học được bỏ chọn
        const defaultTotalSessions = 15; // Giá trị mặc định từ resetNewClassForm
        setNewClass((prev) => ({
          ...prev,
          subject_id: "",
          total_sessions: defaultTotalSessions,
          course_end_date: calculateEndDate(
            prev.course_start_date,
            scheduleDays,
            defaultTotalSessions
          ),
        }));
      }
    } else if (name === "semester_id") {
      setNewClass((prev) => ({
        ...prev,
        [name]: value,
      }));
      // Nếu đang thay đổi học kỳ, hiển thị thông tin về thời gian học kỳ
      if (value) {
        const selectedSemester = semesters.find((sem) => sem._id === value);
        if (selectedSemester) {
          const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString("vi-VN");
          };
          enqueueSnackbar(
            `Lưu ý: Thời gian khóa học phải nằm trong khoảng thời gian của học kỳ ${
              selectedSemester.name
            }: từ ${formatDate(selectedSemester.start_date)} đến ${formatDate(
              selectedSemester.end_date
            )}`,
            { variant: "info", autoHideDuration: 10000 }
          );
        }
      }
    } else {
      // Áp dụng cho các trường khác không có logic xử lý đặc biệt (ví dụ: class_name, class_code)
      setNewClass((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Xử lý thay đổi thông tin lịch học
  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...scheduleDays];
    let currentDay = { ...updatedSchedule[index] };
    let processedValue = value;

    // Xử lý giá trị đặc biệt
    if (field === "day_of_week") {
      processedValue = parseInt(value);
    }

    // Cập nhật giá trị
    currentDay[field] = processedValue;

    // Cập nhật start_time và end_time nếu thay đổi tiết học
    if (field === "start_period" || field === "end_period") {
      if (field === "start_period") {
        const startPeriod = parseInt(value);
        const endPeriod = parseInt(currentDay.end_period || startPeriod + 1);

        if (startPeriod > endPeriod) {
          currentDay.end_period = startPeriod + 1;
        }

        currentDay.start_time = periodTimings[startPeriod]?.start || "";
        if (currentDay.end_period) {
          currentDay.end_time = periodTimings[currentDay.end_period]?.end || "";
        }
      } else if (field === "end_period") {
        const endPeriod = parseInt(value);
        currentDay.end_time = periodTimings[endPeriod]?.end || "";
      }
    }

    // Xử lý khi thay đổi Campus hoặc Building cho ngày cụ thể
    if (field === "campusId") {
      // Reset building, room và danh sách khi campus thay đổi (cập nhật đồng bộ)
      currentDay.buildingId = "";
      currentDay.room_id = "";
      currentDay.availableBuildings = [];
      currentDay.availableRooms = [];
      // Gọi fetch buildings sau khi state đã được chuẩn bị để cập nhật
      fetchBuildingsForDay(index, processedValue);
    } else if (field === "buildingId") {
      // Reset room và danh sách khi building thay đổi (cập nhật đồng bộ)
      currentDay.room_id = "";
      currentDay.availableRooms = [];
      // Gọi fetch rooms sau khi state đã được chuẩn bị để cập nhật
      fetchRoomsForDay(index, processedValue);
    }

    // Tính lại ngày kết thúc nếu ngày trong tuần thay đổi
    if (field === "day_of_week") {
      setNewClass((prev) => ({
        ...prev,
        course_end_date: calculateEndDate(
          prev.course_start_date,
          updatedSchedule,
          prev.total_sessions
        ),
      }));
    }

    updatedSchedule[index] = currentDay;
    setScheduleDays(updatedSchedule);

    // Luôn tính lại ngày kết thúc khi lịch trình thay đổi
    if (!(field === "day_of_week" && index === 0)) {
      setNewClass((prev) => ({
        ...prev,
        course_end_date: calculateEndDate(
          prev.course_start_date,
          updatedSchedule,
          prev.total_sessions
        ),
      }));
    }

    // Kiểm tra xung đột nếu thay đổi phòng học hoặc thời gian
    if (
      field === "room_id" ||
      field === "day_of_week" ||
      field === "start_period" ||
      field === "end_period" ||
      field === "start_time" ||
      field === "end_time"
    ) {
      // Đặt timeout để tránh gọi API quá nhiều khi người dùng thay đổi nhiều lần
      setTimeout(() => {
        if (currentDay.room_id && currentDay.day_of_week !== undefined) {
          checkConflicts();
        }
      }, 500);
    }
  };

  // Thêm hàm lấy thứ trong tuần từ ngày
  const getDayOfWeekFromDate = (dateString) => {
    if (!dateString) return 1; // Mặc định là thứ 2 nếu không có ngày

    const date = new Date(dateString);
    // getDay() trả về 0 cho Chủ Nhật, 1-6 cho Thứ 2 đến Thứ 7
    const day = date.getDay();

    // Chuyển đổi để 0 = Chủ Nhật, 1 = Thứ Hai, ...
    return day;
  };

  // Thêm hàm để lấy tên của thứ
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

  // Thêm hàm để lấy tên của thứ
  const addScheduleDay = () => {
    // Lấy ngày bắt đầu
    const startDate = newClass.course_start_date;
    if (!startDate) {
      enqueueSnackbar("Vui lòng chọn ngày bắt đầu trước", {
        variant: "warning",
      });
      return;
    }

    // Lấy thứ từ ngày bắt đầu
    const baseDayOfWeek = getDayOfWeekFromDate(startDate);

    // Tìm thứ tiếp theo chưa có trong lịch
    const existingDays = scheduleDays.map((day) => day.day_of_week);
    let nextDay = (baseDayOfWeek + 1) % 7; // Thứ tiếp theo

    // Tìm một thứ chưa có trong lịch hiện tại
    for (let i = 0; i < 7; i++) {
      if (!existingDays.includes(nextDay)) {
        // break; // Bỏ logic tìm ngày chưa có
      }
      nextDay = (nextDay + 1) % 7;
    }

    // Mặc định ngày mới thêm là Thứ 2 hoặc ngày cuối cùng trong lịch
    const defaultNewDay =
      scheduleDays.length > 0
        ? scheduleDays[scheduleDays.length - 1].day_of_week
        : 1; // Mặc định Thứ 2

    const lastDay = scheduleDays[scheduleDays.length - 1] || {}; // Lấy thông tin từ ngày cuối cùng

    const newDayData = {
      day_of_week: defaultNewDay, // Cho phép người dùng chọn sau
      start_period: 1,
      end_period: 2,
      start_time: periodTimings[1]?.start || "",
      end_time: periodTimings[2]?.end || "",
      room_id: "", // Bắt đầu rỗng
      is_recurring: true,
      specific_dates: [],
      excluded_dates: [],
      campusId: lastDay.campusId || "",
      buildingId: lastDay.buildingId || "",
      availableBuildings: lastDay.availableBuildings || [],
      availableRooms: lastDay.availableRooms || [],
    };
    const updatedSchedule = [...scheduleDays, newDayData];
    setScheduleDays(updatedSchedule);

    // Tính lại ngày kết thúc sau khi thêm buổi học
    setNewClass((prev) => ({
      ...prev,
      course_end_date: calculateEndDate(
        prev.course_start_date,
        updatedSchedule,
        prev.total_sessions
      ),
    }));
  };

  // Thêm một hàm để tính ngày kết thúc dựa trên ngày bắt đầu và lịch học
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

  // Cập nhật hàm xử lý thay đổi ngày bắt đầu
  const handleStartDateChange = (e) => {
    const startDateString = e.target.value;
    const newStartDayOfWeek = getDayOfWeekFromDate(startDateString);

    // Tạo một lịch trình mới dựa trên scheduleDays hiện tại,
    // nhưng cập nhật day_of_week của buổi học đầu tiên.
    let modifiedScheduleDays;
    if (scheduleDays.length > 0) {
      modifiedScheduleDays = scheduleDays.map((day, index) => {
        if (index === 0) {
          // Giữ lại các thông tin khác của buổi học đầu tiên, chỉ thay đổi thứ
          return { ...day, day_of_week: newStartDayOfWeek };
        }
        return day;
      });
    } else {
      // Nếu scheduleDays trống, tạo một buổi học mặc định
      modifiedScheduleDays = [
        {
          day_of_week: newStartDayOfWeek,
          start_period: 1,
          end_period: 2,
          start_time: periodTimings[1]?.start || "",
          end_time: periodTimings[2]?.end || "",
          room_id: "",
          is_recurring: true,
          specific_dates: [],
          excluded_dates: [],
          campusId: "",
          buildingId: "",
          availableBuildings: [],
          availableRooms: [],
        },
      ];
    }

    setScheduleDays(modifiedScheduleDays); // Cập nhật UI lịch học

    // Kiểm tra ngày bắt đầu với học kỳ đã chọn (nếu có)
    if (newClass.semester_id) {
      const selectedSemester = semesters.find(
        (s) => s._id === newClass.semester_id
      );
      if (selectedSemester) {
        const courseStartDate = new Date(startDateString);
        const semesterStartDate = new Date(selectedSemester.start_date);
        const semesterEndDate = new Date(selectedSemester.end_date);

        courseStartDate.setHours(0, 0, 0, 0);
        semesterStartDate.setHours(0, 0, 0, 0);
        semesterEndDate.setHours(23, 59, 59, 999);

        if (
          courseStartDate < semesterStartDate ||
          courseStartDate > semesterEndDate
        ) {
          enqueueSnackbar(
            `Ngày bắt đầu khóa học (${courseStartDate.toLocaleDateString(
              "vi-VN"
            )}) 
             phải nằm trong khoảng thời gian của học kỳ đã chọn 
             (${semesterStartDate.toLocaleDateString(
               "vi-VN"
             )} - ${semesterEndDate.toLocaleDateString("vi-VN")}).`,
            { variant: "warning", autoHideDuration: 8000 }
          );
        }
      }
    }

    setNewClass((prev) => ({
      ...prev,
      course_start_date: startDateString,
      course_end_date: calculateEndDate(
        startDateString,
        modifiedScheduleDays, // Sử dụng lịch học đã điều chỉnh
        prev.total_sessions
      ),
    }));
  };

  // Thêm function để kiểm tra xung đột lịch
  const checkConflicts = async () => {
    // Xóa cảnh báo xung đột cũ
    setConflictWarnings([]);

    try {
      setCheckingConflicts(true);

      // Kiểm tra xem có thông tin đủ để check không
      if (
        !user?.id ||
        !scheduleDays ||
        scheduleDays.length === 0 ||
        scheduleDays.some((day) => !day.room_id)
      ) {
        return;
      }

      const response = await checkScheduleConflicts({
        teacher_id: user.id,
        schedule: scheduleDays,
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

  // Tạo lớp học mới
  const handleCreateClass = async () => {
    // Kiểm tra dữ liệu nhập
    if (
      !newClass.class_name ||
      !newClass.class_code ||
      !newClass.subject_id ||
      !newClass.semester_id ||
      !newClass.total_sessions ||
      !newClass.course_start_date ||
      !newClass.course_end_date // Đảm bảo course_end_date cũng được tính toán và tồn tại
    ) {
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

    // Kiểm tra ngày bắt đầu và kết thúc của khóa học so với học kỳ
    const selectedSemester = semesters.find(
      (s) => s._id === newClass.semester_id
    );
    if (selectedSemester) {
      const courseStartDate = new Date(newClass.course_start_date);
      const courseEndDate = new Date(newClass.course_end_date);
      const semesterStartDate = new Date(selectedSemester.start_date);
      const semesterEndDate = new Date(selectedSemester.end_date);

      // Đặt giờ về 0 để so sánh ngày cho chính xác
      courseStartDate.setHours(0, 0, 0, 0);
      courseEndDate.setHours(0, 0, 0, 0);
      semesterStartDate.setHours(0, 0, 0, 0);
      semesterEndDate.setHours(23, 59, 59, 999); // Để ngày kết thúc học kỳ bao gồm cả ngày đó

      if (courseStartDate < semesterStartDate) {
        enqueueSnackbar(
          `Ngày bắt đầu khóa học (${courseStartDate.toLocaleDateString(
            "vi-VN"
          )}) 
           không được trước ngày bắt đầu học kỳ (${semesterStartDate.toLocaleDateString(
             "vi-VN"
           )}).`,
          { variant: "error", autoHideDuration: 8000 }
        );
        return;
      }
      if (courseEndDate > semesterEndDate) {
        enqueueSnackbar(
          `Ngày kết thúc khóa học (${courseEndDate.toLocaleDateString(
            "vi-VN"
          )}) 
           không được sau ngày kết thúc học kỳ (${semesterEndDate.toLocaleDateString(
             "vi-VN"
           )}).`,
          { variant: "error", autoHideDuration: 8000 }
        );
        return;
      }
    }

    // Kiểm tra xung đột lịch cuối cùng trước khi tạo lớp
    try {
      setCheckingConflicts(true);
      const response = await checkScheduleConflicts({
        teacher_id: user.id,
        schedule: scheduleDays,
      });

      if (response.data.has_conflicts) {
        setConflictWarnings(response.data.conflicts);

        // Hiển thị thông báo xác nhận nếu có xung đột
        if (
          window.confirm(
            "Phát hiện xung đột lịch học. Bạn vẫn muốn tạo lớp học này không?\n\n" +
              response.data.conflicts.map((c) => c.message).join("\n")
          )
        ) {
          // Tiếp tục tạo lớp nếu người dùng xác nhận
          await createNewClass();
        }
      } else {
        // Không có xung đột, tạo lớp mới
        await createNewClass();
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra xung đột lịch học:", error);
      // Tạo lớp mới ngay cả khi không thể kiểm tra xung đột
      await createNewClass();
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Tách logic tạo lớp mới thành hàm riêng
  const createNewClass = async () => {
    try {
      setIsSubmitting(true);

      const classData = {
        ...newClass,
        teacher_id: user._id,
        schedule: scheduleDays.map((day) => ({
          day_of_week: day.day_of_week,
          start_period: day.start_period,
          end_period: day.end_period,
          start_time: day.start_time,
          end_time: day.end_time,
          room_id: day.room_id,
          is_recurring: true,
        })),
      };

      console.log("Dữ liệu gửi đi:", classData); // Log để kiểm tra

      await createTeachingClass(classData);
      enqueueSnackbar("Tạo lớp học mới thành công", { variant: "success" });
      handleCloseAddClassDialog();
      fetchClasses(); // Tải lại danh sách lớp
    } catch (error) {
      console.error("Lỗi khi tạo lớp học:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi tạo lớp học mới",
        { variant: "error" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thêm lại hàm removeScheduleDay
  const removeScheduleDay = (index) => {
    if (scheduleDays.length > 1) {
      const updatedSchedule = scheduleDays.filter((_, i) => i !== index);
      setScheduleDays(updatedSchedule);

      // Tính lại ngày kết thúc sau khi xóa buổi học
      setNewClass((prev) => ({
        ...prev,
        course_end_date: calculateEndDate(
          prev.course_start_date,
          updatedSchedule,
          prev.total_sessions
        ),
      }));
    }
  };

  // --- Hàm fetch dữ liệu riêng cho từng ngày trong lịch ---
  const fetchBuildingsForDay = async (index, campusId) => {
    if (!campusId) {
      // Không cần làm gì ở đây vì state đã được reset ở handleScheduleChange
      return;
    }
    try {
      const response = await axios.get(
        `${API_URL}/facilities/buildings/campuses/${campusId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const buildings = response.data.data || [];
      // Chỉ cập nhật lại danh sách availableBuildings cho ngày tương ứng
      setScheduleDays((prevSchedule) => {
        const newSchedule = [...prevSchedule];
        // Đảm bảo index hợp lệ và campusId vẫn khớp (phòng trường hợp người dùng thay đổi nhanh)
        if (newSchedule[index] && newSchedule[index].campusId === campusId) {
          newSchedule[index] = {
            ...newSchedule[index],
            availableBuildings: buildings,
          };
        }
        return newSchedule;
      });
    } catch (error) {
      console.error("Error fetching buildings for schedule day:", error);
      enqueueSnackbar("Lỗi khi tải danh sách tòa nhà", { variant: "error" });
    }
  };

  const fetchRoomsForDay = async (index, buildingId) => {
    if (!buildingId) {
      // Không cần làm gì ở đây vì state đã được reset ở handleScheduleChange
      return;
    }
    try {
      const response = await axios.get(
        `${API_URL}/facilities/rooms/building/${buildingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rooms = response.data.data || [];
      // Chỉ cập nhật lại danh sách availableRooms cho ngày tương ứng
      setScheduleDays((prevSchedule) => {
        const newSchedule = [...prevSchedule];
        // Đảm bảo index hợp lệ và buildingId vẫn khớp
        if (
          newSchedule[index] &&
          newSchedule[index].buildingId === buildingId
        ) {
          newSchedule[index] = {
            ...newSchedule[index],
            availableRooms: rooms,
          };
        }
        return newSchedule;
      });
    } catch (error) {
      console.error("Error fetching rooms for schedule day:", error);
      enqueueSnackbar("Lỗi khi tải danh sách phòng học", { variant: "error" });
    }
  };
  // --- Kết thúc hàm fetch riêng ---

  // --- Hàm tiện ích tính ngày XUẤT HIỆN đầu tiên của một THỨ cụ thể ---
  const getFirstOccurrenceDate = (startDateString, targetDayOfWeek) => {
    if (
      !startDateString ||
      targetDayOfWeek === undefined ||
      targetDayOfWeek === null
    ) {
      return null;
    }
    try {
      const startDate = new Date(startDateString + "T00:00:00Z");
      if (isNaN(startDate.getTime())) return null;
      let currentDate = new Date(startDate);
      while (currentDate.getUTCDay() !== targetDayOfWeek) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
      const day = String(currentDate.getUTCDate()).padStart(2, "0");
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
      const year = currentDate.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Lỗi khi tính ngày xuất hiện đầu tiên:", error);
      return null;
    }
  };
  // --- Kết thúc hàm tiện ích ---

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

  // Thêm hàm xử lý chuyển đổi chế độ xem
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleOpenConfirmDeleteDialog = (classItem) => {
    setConfirmDeleteDialog({ open: true, classToDelete: classItem });
  };

  const handleCloseConfirmDeleteDialog = () => {
    setConfirmDeleteDialog({ open: false, classToDelete: null });
  };

  const handleDeleteTeachingClass = async () => {
    if (!confirmDeleteDialog.classToDelete) return;

    const classId = confirmDeleteDialog.classToDelete._id;

    try {
      setIsLoading(true); // Indicate loading for the table/list
      await axios.delete(`${API_URL}/classes/teaching/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Xóa lớp học và dữ liệu liên quan thành công!", {
        variant: "success",
      });
      fetchClasses(); // Refresh the list of classes
      handleCloseConfirmDeleteDialog();
    } catch (error) {
      console.error("Lỗi khi xóa lớp học:", error);
      enqueueSnackbar(error.response?.data?.message || "Lỗi khi xóa lớp học", {
        variant: "error",
      });
      setIsLoading(false); // Ensure loading is turned off on error
      handleCloseConfirmDeleteDialog();
    }
    // setIsLoading(false) will be called in fetchClasses finally block
  };

  return (
    <Box sx={{ p: 3, bgcolor: "grey.50", minHeight: "100vh" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          <Class sx={{ mr: 1, verticalAlign: "middle" }} />
          Quản lý lớp học
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleOpenAddClassDialog}
        >
          Thêm lớp học
        </Button>
      </Box>

      {/* Bộ lọc và tìm kiếm */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Tìm kiếm lớp học"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Học kỳ</InputLabel>
              <Select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setPage(0); // Reset về trang đầu khi thay đổi học kỳ
                }}
                label="Học kỳ"
              >
                <MenuItem value="">Tất cả học kỳ</MenuItem>
                {semesters.map((sem) => (
                  <MenuItem key={sem._id} value={sem._id}>
                    {sem.name} (
                    {sem.academic_year || `${sem.year}-${sem.year + 1}`})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Danh sách lớp học với chế độ xem lưới/danh sách */}
      <Paper sx={{ borderRadius: 2, boxShadow: 3, overflow: "hidden" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                p: 2,
                display: "flex",
                justifyContent: "flex-end",
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <ToggleButtonGroup
                size="small"
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                aria-label="chế độ xem"
              >
                <ToggleButton value="grid" aria-label="xem lưới">
                  <GridView />
                </ToggleButton>
                <ToggleButton value="list" aria-label="xem danh sách">
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {viewMode === "grid" ? (
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {classes.length > 0 ? (
                    classes.map((classItem) => (
                      <Grid item xs={12} sm={6} md={4} key={classItem._id}>
                        <Card
                          sx={{
                            height: "100%",
                            cursor: "pointer",
                            transition: "0.3s",
                            "&:hover": {
                              transform: "translateY(-5px)",
                              boxShadow: 6,
                            },
                          }}
                          onClick={() => handleViewClass(classItem._id)}
                        >
                          <CardHeader
                            title={
                              <Typography
                                variant="h6"
                                noWrap
                                title={classItem.class_name}
                              >
                                {classItem.class_name}
                              </Typography>
                            }
                            subheader={classItem.class_code}
                          />
                          <CardContent>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <School
                                sx={{
                                  mr: 1,
                                  fontSize: 20,
                                  color: "primary.main",
                                }}
                              />
                              <Typography variant="body2" noWrap>
                                {classItem.subject_id?.name || "Không xác định"}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 1,
                              }}
                            >
                              <Event
                                sx={{
                                  mr: 1,
                                  fontSize: 20,
                                  color: "primary.main",
                                }}
                              />
                              <Typography variant="body2">
                                {classItem.semester_id?.name ||
                                  "Không xác định"}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mt: 2,
                              }}
                            >
                              <Chip
                                icon={<Person />}
                                label={`${classItem.students?.length || 0} SV`}
                                size="small"
                                variant="outlined"
                              />
                              <Box>
                                <Tooltip title="Xem chi tiết lớp học">
                                  <IconButton
                                    color="primary"
                                    onClick={() =>
                                      handleViewClass(classItem._id)
                                    }
                                  >
                                    <InfoIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa lớp học này">
                                  <IconButton
                                    color="error"
                                    onClick={(event) => {
                                      event.stopPropagation(); // Ngăn sự kiện lan truyền
                                      handleOpenConfirmDeleteDialog(classItem);
                                    }}
                                  >
                                    <DeleteForever />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Alert severity="info">Không có lớp học nào.</Alert>
                    </Grid>
                  )}
                </Grid>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: "grey.200",
                        "& th": { fontWeight: "bold" },
                      }}
                    >
                      <TableCell>Tên lớp</TableCell>
                      <TableCell>Môn học</TableCell>
                      <TableCell>Kỳ học</TableCell>
                      <TableCell>Lớp chính</TableCell>
                      <TableCell align="center">Số lượng SV</TableCell>
                      <TableCell>Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classes.length > 0 ? (
                      classes.map((classItem) => (
                        <TableRow
                          key={classItem._id}
                          sx={{
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                            cursor: "pointer",
                          }}
                          onClick={() => handleViewClass(classItem._id)}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {classItem.class_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {classItem.class_code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {classItem.subject_id ? (
                              <Box>
                                <Typography variant="body2">
                                  {classItem.subject_id.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="textSecondary"
                                >
                                  {classItem.subject_id.code}
                                </Typography>
                              </Box>
                            ) : (
                              <Chip
                                label="N/A"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {classItem.semester_id ? (
                              <Chip
                                label={classItem.semester_id.name}
                                size="small"
                                color="info"
                                variant="filled"
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
                            {classItem.main_class_id ? (
                              <Chip
                                label={classItem.main_class_id.name}
                                size="small"
                                variant="filled"
                                sx={{ bgcolor: "#e3f2fd", color: "#0d47a1" }}
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
                                classItem.students?.length > 0
                                  ? "success"
                                  : "default"
                              }
                              size="small"
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Tooltip title="Xem chi tiết lớp học">
                                <IconButton
                                  color="primary"
                                  onClick={() => handleViewClass(classItem._id)}
                                >
                                  <InfoIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa lớp học này">
                                <IconButton
                                  color="error"
                                  onClick={(event) => {
                                    event.stopPropagation(); // Ngăn sự kiện lan truyền
                                    handleOpenConfirmDeleteDialog(classItem);
                                  }}
                                >
                                  <DeleteForever />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Không có lớp học nào.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalClasses}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Dòng mỗi trang:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} trong số ${count !== -1 ? count : `hơn ${to}`}`
              }
            />
          </>
        )}
      </Paper>

      {/* Dialog thêm lớp học */}
      <Dialog
        open={openAddClassDialog}
        onClose={handleCloseAddClassDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            fontWeight: "bold",
            py: 1.5,
          }}
        >
          <Add sx={{ verticalAlign: "middle", mr: 1 }} />
          Thêm lớp học mới
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ bgcolor: "grey.50", p: { xs: 1.5, sm: 2, md: 3 } }}
        >
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "medium", mb: 1.5 }}
              >
                Thông tin chung
              </Typography>
              <Paper
                elevation={1}
                sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2 }}
              >
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Tên lớp"
                      name="class_name"
                      value={newClass.class_name}
                      onChange={handleNewClassChange}
                      required
                      variant="outlined"
                      placeholder="VD: Lập trình web - Nhóm 1"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Mã lớp"
                      name="class_code"
                      value={newClass.class_code}
                      onChange={handleNewClassChange}
                      required
                      variant="outlined"
                      placeholder="VD: WEB101-G1"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Môn học</InputLabel>
                      <Select
                        label="Môn học"
                        name="subject_id"
                        value={newClass.subject_id}
                        onChange={handleNewClassChange}
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
                    <FormControl fullWidth required>
                      <InputLabel>Học kỳ</InputLabel>
                      <Select
                        label="Học kỳ"
                        name="semester_id"
                        value={newClass.semester_id}
                        onChange={handleNewClassChange}
                      >
                        {semesters
                          .filter(
                            (sem) =>
                              sem.calculated_status === "Chưa bắt đầu" ||
                              sem.calculated_status === "Đang diễn ra"
                          )
                          .map((sem) => (
                            <MenuItem key={sem._id} value={sem._id}>
                              {sem.name} ({sem.academic_year})
                              {sem.is_current && (
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
                      {newClass.semester_id &&
                        (() => {
                          const selectedSemester = semesters.find(
                            (sem) => sem._id === newClass.semester_id
                          );
                          if (selectedSemester) {
                            const formatDate = (dateString) => {
                              const date = new Date(dateString);
                              return date.toLocaleDateString("vi-VN");
                            };
                            return (
                              <FormHelperText>
                                Lưu ý: Thời gian học kỳ:{" "}
                                {formatDate(selectedSemester.start_date)} -{" "}
                                {formatDate(selectedSemester.end_date)}
                              </FormHelperText>
                            );
                          }
                          return null;
                        })()}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Lớp chính</InputLabel>
                      <Select
                        label="Lớp chính"
                        name="main_class_id"
                        value={newClass.main_class_id}
                        onChange={handleNewClassChange}
                      >
                        <MenuItem value="">Không chọn lớp chính</MenuItem>
                        {mainClasses.map((mainClass) => (
                          <MenuItem key={mainClass._id} value={mainClass._id}>
                            {mainClass.name} ({mainClass.class_code})
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>
                        Có thể để trống nếu lớp dành cho nhiều lớp chính
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Tổng số buổi học (tự động)"
                      name="total_sessions"
                      value={newClass.total_sessions}
                      disabled
                      required
                      variant="outlined"
                      InputProps={{ inputProps: { min: 1 } }}
                      helperText="Tự động tính từ số tín chỉ của môn học (1 tín chỉ = 4 buổi)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Ngày bắt đầu khóa học"
                      name="course_start_date"
                      value={newClass.course_start_date}
                      onChange={handleStartDateChange}
                      required
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Ngày kết thúc khóa học (tự động tính)"
                      name="course_end_date"
                      value={newClass.course_end_date}
                      disabled
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      helperText="Được tính tự động từ ngày bắt đầu và lịch học"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Tự động tạo buổi học</InputLabel>
                      <Select
                        label="Tự động tạo buổi học"
                        name="auto_generate_sessions"
                        value={newClass.auto_generate_sessions}
                        onChange={handleNewClassChange}
                      >
                        <MenuItem value={true}>Có</MenuItem>
                        <MenuItem value={false}>Không</MenuItem>
                      </Select>
                      <FormHelperText>
                        Khi bật, hệ thống sẽ tự động tạo các buổi học dựa trên
                        lịch
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Lịch học */}
            <Grid item xs={12}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "bold", mt: 2, color: "primary.main" }}
              >
                <Event sx={{ verticalAlign: "middle", mr: 1 }} />
                Thiết lập Lịch học
              </Typography>
              <Divider sx={{ mb: 2.5 }} />
            </Grid>

            {scheduleDays.map((day, index) => (
              <Grid item xs={12} key={index} sx={{ mb: 2.5 }}>
                <Paper
                  elevation={2}
                  sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: 2,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {scheduleDays.length > 1 && (
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => removeScheduleDay(index)}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        p: 0.5,
                        "&:hover": { bgcolor: "error.lighter" },
                      }}
                      title="Xóa buổi học này"
                    >
                      <Chip
                        label="Xóa buổi này"
                        onDelete={() => removeScheduleDay(index)}
                        color="error"
                        size="small"
                        variant="outlined"
                        sx={{ mr: -1 }}
                      />
                    </IconButton>
                  )}
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: "medium", mb: 2 }}
                  >
                    Buổi học {index + 1}:{" "}
                    <Chip
                      label={getDayOfWeekName(day.day_of_week)}
                      color="secondary"
                      size="medium"
                      sx={{ fontWeight: "medium" }}
                    />
                  </Typography>

                  <Grid container spacing={2.5} alignItems="flex-start">
                    {/* Chọn thứ */}
                    <Grid item xs={12} sm={12} md={4}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 1,
                          fontWeight: "medium",
                          color: "text.secondary",
                        }}
                      >
                        Thời gian & Loại lịch
                      </Typography>

                      <FormControl fullWidth size="small">
                        <InputLabel>Thứ</InputLabel>
                        <Select
                          label="Thứ"
                          value={day.day_of_week}
                          onChange={(e) => {
                            if (index !== 0) {
                              handleScheduleChange(
                                index,
                                "day_of_week",
                                e.target.value
                              );
                            }
                          }}
                          disabled={index === 0}
                          sx={{ bgcolor: index === 0 ? "grey.200" : "inherit" }}
                        >
                          {Array.from({ length: 7 }, (_, i) => (
                            <MenuItem key={i} value={i}>
                              {getDayOfWeekName(i)}
                            </MenuItem>
                          ))}
                        </Select>
                        {/* Hiển thị ngày bắt đầu của buổi học này */}
                        {newClass.course_start_date &&
                          getFirstOccurrenceDate(
                            newClass.course_start_date,
                            day.day_of_week
                          ) && (
                            <FormHelperText
                              sx={{ mt: 0.5, color: "text.secondary" }}
                            >
                              (Bắt đầu từ:{" "}
                              {getFirstOccurrenceDate(
                                newClass.course_start_date,
                                day.day_of_week
                              )}
                              )
                            </FormHelperText>
                          )}
                      </FormControl>
                    </Grid>

                    {/* Thời gian & Loại lịch */}
                    <Grid item xs={12} sm={6} md={4}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            label="Tiết BĐ"
                            type="number"
                            value={day.start_period}
                            onChange={(e) =>
                              handleScheduleChange(
                                index,
                                "start_period",
                                e.target.value
                              )
                            }
                            InputProps={{ inputProps: { min: 1, max: 15 } }}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Tiết KT"
                            type="number"
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
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Giờ BĐ"
                            type="time"
                            value={day.start_time}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ readOnly: true }}
                            variant="filled"
                            helperText="Tự động"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Giờ KT"
                            type="time"
                            value={day.end_time}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ readOnly: true }}
                            variant="filled"
                            helperText="Tự động"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sx={{ pt: "12px !important" }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Loại lịch</InputLabel>
                            <Select
                              label="Loại lịch"
                              value={day.is_recurring}
                              onChange={(e) => {
                                const booleanValue =
                                  e.target.value === true ||
                                  e.target.value === "true";
                                handleScheduleChange(
                                  index,
                                  "is_recurring",
                                  booleanValue
                                );
                              }}
                            >
                              <MenuItem value={true}>
                                Định kỳ hàng tuần
                              </MenuItem>
                              <MenuItem value={false}>Ngày cụ thể</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Địa điểm */}
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 1,
                          fontWeight: "medium",
                          color: "text.secondary",
                        }}
                      >
                        Địa điểm
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
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
                        <Grid item xs={12}>
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
                              {day.availableBuildings.map((building) => (
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
                        <Grid item xs={12}>
                          <FormControl
                            fullWidth
                            required
                            error={!day.room_id && isSubmitting}
                            size="small"
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
                              disabled={!day.buildingId}
                            >
                              <MenuItem value="">
                                <em>Vui lòng chọn phòng</em>
                              </MenuItem>
                              {day.availableRooms.map((room) => (
                                <MenuItem key={room._id} value={room._id}>
                                  {room.room_number} ({room.capacity})
                                </MenuItem>
                              ))}
                            </Select>
                            {!day.room_id && isSubmitting && (
                              <FormHelperText error>Bắt buộc</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Add />}
                onClick={addScheduleDay}
                sx={{ mt: 0, textTransform: "none" }}
              >
                Thêm buổi học trong tuần
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{ px: { xs: 2, sm: 3, md: 3 }, py: 2, bgcolor: "grey.50" }}
        >
          {renderConflictWarnings()}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Button
              onClick={handleCloseAddClassDialog}
              disabled={isSubmitting}
              color="inherit"
              variant="outlined"
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateClass}
              disabled={isSubmitting || checkingConflicts}
              startIcon={
                checkingConflicts ? <CircularProgress size={20} /> : null
              }
            >
              {checkingConflicts
                ? "Đang kiểm tra..."
                : isSubmitting
                ? "Đang tạo..."
                : "Tạo lớp học"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteDialog.open}
        onClose={handleCloseConfirmDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: "error.dark", color: "white" }}>
          <Warning sx={{ verticalAlign: "middle", mr: 1 }} /> Xác nhận xóa lớp
          học
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <DialogContentText component="div">
            <Typography variant="body1" gutterBottom>
              Bạn có chắc chắn muốn xóa lớp học:
            </Typography>
            <Typography
              variant="h6"
              gutterBottom
              color="text.primary"
              sx={{ fontWeight: "bold" }}
            >
              {confirmDeleteDialog.classToDelete?.class_name} (
              {confirmDeleteDialog.classToDelete?.class_code})
            </Typography>
            <Typography
              variant="body2"
              color="error.main"
              sx={{ mt: 1, fontWeight: "bold" }}
            >
              <Warning
                sx={{ verticalAlign: "middle", fontSize: "1.1rem", mr: 0.5 }}
              />
              LƯU Ý: Hành động này không thể hoàn tác.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tất cả dữ liệu liên quan đến lớp học này (bao gồm lịch học, danh
              sách sinh viên, dữ liệu điểm danh, điểm số) sẽ bị xóa vĩnh viễn.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseConfirmDeleteDialog}
            color="inherit"
            variant="outlined"
          >
            Hủy
          </Button>
          <Button
            onClick={handleDeleteTeachingClass}
            color="error"
            variant="contained"
            autoFocus
            startIcon={<DeleteForever />}
          >
            Xóa vĩnh viễn
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherClassesPage;
