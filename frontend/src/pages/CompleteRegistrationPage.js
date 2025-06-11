import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "../utils/axios";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
  Grid,
  FormHelperText,
  Card,
  CardContent,
  CardActionArea,
  Alert,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  School,
  Work,
  Person,
  Check,
  Info,
  ExpandMore,
  Face,
} from "@mui/icons-material";
import { setCredentials } from "../redux/slices/authSlice";
import FaceRegistrationComponent from "../components/FaceRegistrationComponent";

const API_URL = process.env.REACT_APP_API_URL;
const REQUIRED_IMAGES = 5; // Tăng từ 3 lên 5 để cải thiện độ tin cậy nhận diện

const CompleteRegistrationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [mainClasses, setMainClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(true);
  const [faceRegistrationExpanded, setFaceRegistrationExpanded] =
    useState(false);
  const [faceData, setFaceData] = useState(null);
  const [isFaceRegistrationComplete, setIsFaceRegistrationComplete] =
    useState(false);
  const [enableFaceRegistration, setEnableFaceRegistration] = useState(false);
  const [derivedCourseYear, setDerivedCourseYear] = useState("");
  const [derivedMajorName, setDerivedMajorName] = useState("");
  const [isCheckingStudentId, setIsCheckingStudentId] = useState(false);
  const [isCheckingTeacherCode, setIsCheckingTeacherCode] = useState(false);

  // Lấy thông tin từ URL params
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email");
  const googleId = queryParams.get("googleId");
  const name = queryParams.get("name");
  const avatar = queryParams.get("avatar");
  const needsRegistration = queryParams.get("needsRegistration") === "true";

  const [formData, setFormData] = useState({
    role: "",
    fullName: name || "",
    phone: "",
    address: "",
    department_id: "",
    student_id: "",
    teacher_code: "",
    class_id: "",
    year: "",
  });

  const [formErrors, setFormErrors] = useState({
    role: "",
    fullName: "",
    department_id: "",
    class_id: "",
    student_id: "",
    teacher_code: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    // Kiểm tra xem có đủ thông tin không
    if (!email || !googleId) {
      enqueueSnackbar("Thiếu thông tin cần thiết để hoàn tất đăng ký", {
        variant: "error",
      });
      navigate("/login", { replace: true });
    }

    // Bỏ thông báo cho người dùng mới
    // if (needsRegistration) {
    //   enqueueSnackbar("Vui lòng hoàn tất thông tin đăng ký của bạn", {
    //     variant: "info",
    //     autoHideDuration: 5000,
    //   });
    // }
  }, [email, googleId, navigate, enqueueSnackbar]);

  // Tải dữ liệu khoa và lớp khi trang được hiển thị
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Lọc danh sách lớp theo KHOA được chọn (thay vì ngành)
  useEffect(() => {
    if (formData.department_id && mainClasses.length > 0) {
      // Giả sử mainClasses đã được fetch và chứa department_id (hoặc major_id.department_id)
      // Cách lọc sẽ phụ thuộc vào cấu trúc dữ liệu của mainClasses từ API
      // Nếu mainClasses[i].major_id.department_id thì cần điều chỉnh
      const filtered = mainClasses.filter(
        (cls) =>
          cls.department_id?._id === formData.department_id ||
          cls.major_id?.department_id?._id === formData.department_id
      );
      setFilteredClasses(filtered);
      // Reset class_id nếu khoa thay đổi và lớp hiện tại không thuộc khoa mới
      const currentClassExistsInFiltered = filtered.some(
        (cls) => cls._id === formData.class_id
      );
      if (!currentClassExistsInFiltered) {
        setFormData((prev) => ({ ...prev, class_id: "" }));
      }
    } else {
      setFilteredClasses([]);
      // Nếu không chọn khoa, cũng reset class_id
      if (!formData.department_id) {
        setFormData((prev) => ({ ...prev, class_id: "" }));
      }
    }
  }, [formData.department_id, mainClasses]);

  // useEffect để cập nhật Khóa học VÀ NGÀNH HỌC dựa trên Lớp được chọn
  useEffect(() => {
    if (
      formData.role === "student" &&
      formData.class_id &&
      mainClasses.length > 0
    ) {
      const selectedClass = mainClasses.find(
        (cls) => cls._id === formData.class_id
      );
      if (selectedClass) {
        if (selectedClass.year_start) {
          setDerivedCourseYear(selectedClass.year_start.toString());
          setFormData((prev) => ({
            ...prev,
            year: selectedClass.year_start.toString(),
          }));
        } else {
          setDerivedCourseYear("");
          setFormData((prev) => ({ ...prev, year: "" }));
        }
        // Cập nhật tên ngành học
        if (selectedClass.major_id && selectedClass.major_id.name) {
          setDerivedMajorName(selectedClass.major_id.name);
        } else {
          setDerivedMajorName("");
        }
      } else {
        setDerivedCourseYear("");
        setDerivedMajorName("");
        setFormData((prev) => ({ ...prev, year: "" }));
      }
    } else {
      setDerivedCourseYear("");
      setDerivedMajorName("");
      setFormData((prev) => ({ ...prev, year: "" }));
    }
  }, [formData.class_id, formData.role, mainClasses]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await axios.get(`${API_URL}/departments/public`);
      if (response.data.success) {
        setDepartments(response.data.data);
      } else {
        setDepartments([]);
        enqueueSnackbar(response.data.message || "Không thể tải khoa", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setDepartments([]);
      enqueueSnackbar("Lỗi tải danh sách khoa", { variant: "error" });
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchMainClassesByDepartment = async (departmentId) => {
    if (!departmentId) {
      setMainClasses([]);
      setFilteredClasses([]); // cũng clear filtered classes
      return;
    }
    setLoadingClasses(true);
    try {
      // API cần hỗ trợ lọc lớp theo department_id
      // Ví dụ: /api/classes/main/public?all=true&department_id=${departmentId}
      // Hoặc nếu API trả về major_id.department_id thì query vẫn giữ nguyên và lọc ở client
      const response = await axios.get(
        `${API_URL}/classes/main/public?all=true&department_id=${departmentId}`
      );
      if (response.data.success) {
        setMainClasses(response.data.data || []); // Cập nhật mainClasses gốc
        // Việc lọc vào filteredClasses sẽ do useEffect khác đảm nhiệm
      } else {
        setMainClasses([]);
        enqueueSnackbar(response.data.message || "Không thể tải lớp", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching main classes by department:", error);
      setMainClasses([]);
      enqueueSnackbar("Lỗi tải danh sách lớp theo khoa", { variant: "error" });
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      let currentErrors = { ...formErrors };

      if (name === "department_id") {
        newFormData.class_id = ""; // Reset lớp khi chọn khoa mới
        setFilteredClasses([]);
        setMainClasses([]); // Reset main classes, sẽ fetch lại
        if (value && newFormData.role === "student") {
          // Chỉ fetch lớp nếu là sinh viên và có chọn khoa
          fetchMainClassesByDepartment(value);
        }
        currentErrors.department_id = "";
        currentErrors.class_id = "";
      }
      // Bỏ logic liên quan đến major_id
      // else if (name === "major_id") {
      //   newFormData.class_id = ""; // Reset lớp khi chọn ngành mới
      //   setFilteredClasses([]);
      //   setMainClasses([]);
      //   if (value) {
      //     fetchMainClasses(value); // Giả sử fetchMainClasses được cập nhật để lấy theo major_id
      //   }
      // }

      // Logic reset school_info fields khi đổi vai trò
      if (name === "role") {
        newFormData.student_id = value === "teacher" ? "" : prev.student_id;
        newFormData.teacher_code = value === "student" ? "" : prev.teacher_code;
        newFormData.class_id = value === "teacher" ? "" : prev.class_id;
        // newFormData.major_id = value === "teacher" ? "" : prev.major_id; // Xóa major_id
        // department_id có thể giữ lại nếu muốn dùng chung cho cả student (để lọc lớp) và teacher
        // Hoặc reset nếu logic chọn khoa cho GV khác SV:
        // newFormData.department_id = "";

        currentErrors = {
          // Reset errors tương ứng
          ...currentErrors,
          student_id: "",
          teacher_code: "",
          class_id: "",
          // major_id: "",
        };
        // Nếu đổi sang student và đã có department_id, fetch lại lớp
        if (value === "student" && newFormData.department_id) {
          fetchMainClassesByDepartment(newFormData.department_id);
        } else if (value === "teacher") {
          setMainClasses([]); // Giảng viên không chọn lớp từ danh sách này
          setFilteredClasses([]);
        }
      }
      setFormErrors(currentErrors);
      return newFormData;
    });
  };

  // Thêm debounce cho việc gọi API
  const debouncedCheck = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const checkStudentIdExists = async (studentId) => {
    if (!studentId || studentId.trim() === "") {
      setFormErrors((prev) => ({ ...prev, student_id: "" })); // Xóa lỗi nếu rỗng
      return;
    }
    setIsCheckingStudentId(true);
    try {
      const response = await axios.get(
        `${API_URL}/users/check-identifier?type=studentId&value=${studentId}`
      );
      // API nên trả về 200 OK và dùng response.data.exists
      if (response.data.exists) {
        setFormErrors((prev) => ({
          ...prev,
          student_id:
            response.data.message || "Mã số sinh viên này đã tồn tại.",
        }));
      } else {
        setFormErrors((prev) => ({ ...prev, student_id: "" }));
      }
    } catch (error) {
      console.error("Error checking student ID:", error);
      if (error.response) {
        // Server đã phản hồi với một mã lỗi
        if (error.response.data && error.response.data.exists) {
          // Server xác nhận mã tồn tại qua body của lỗi (vd: status 400/409 kèm exists:true)
          setFormErrors((prev) => ({
            ...prev,
            student_id:
              error.response.data.message || "Mã số sinh viên này đã tồn tại.",
          }));
        } else {
          // Lỗi khác từ server
          enqueueSnackbar(
            `Lỗi từ máy chủ khi kiểm tra MSSV: ${
              error.response.data?.message || error.response.status
            }`,
            { variant: "error" }
          );
        }
      } else if (error.request) {
        // Yêu cầu đã được gửi nhưng không nhận được phản hồi
        enqueueSnackbar("Không thể kết nối đến máy chủ để kiểm tra MSSV.", {
          variant: "error",
        });
      } else {
        // Lỗi khác khi thiết lập yêu cầu
        enqueueSnackbar("Có lỗi xảy ra khi kiểm tra MSSV.", {
          variant: "error",
        });
      }
    } finally {
      setIsCheckingStudentId(false);
    }
  };

  const checkTeacherCodeExists = async (teacherCode) => {
    if (!teacherCode || teacherCode.trim() === "") {
      setFormErrors((prev) => ({ ...prev, teacher_code: "" })); // Xóa lỗi nếu rỗng
      return;
    }
    setIsCheckingTeacherCode(true);
    try {
      const response = await axios.get(
        `${API_URL}/users/check-identifier?type=teacherCode&value=${teacherCode}`
      );
      // API nên trả về 200 OK và dùng response.data.exists
      if (response.data.exists) {
        setFormErrors((prev) => ({
          ...prev,
          teacher_code:
            response.data.message || "Mã giảng viên này đã tồn tại.",
        }));
      } else {
        setFormErrors((prev) => ({ ...prev, teacher_code: "" }));
      }
    } catch (error) {
      console.error("Error checking teacher code:", error);
      if (error.response) {
        // Server đã phản hồi với một mã lỗi
        if (error.response.data && error.response.data.exists) {
          // Server xác nhận mã tồn tại qua body của lỗi (vd: status 400/409 kèm exists:true)
          setFormErrors((prev) => ({
            ...prev,
            teacher_code:
              error.response.data.message || "Mã giảng viên này đã tồn tại.",
          }));
        } else {
          // Lỗi khác từ server
          enqueueSnackbar(
            `Lỗi từ máy chủ khi kiểm tra MGV: ${
              error.response.data?.message || error.response.status
            }`,
            { variant: "error" }
          );
        }
      } else if (error.request) {
        // Yêu cầu đã được gửi nhưng không nhận được phản hồi
        enqueueSnackbar("Không thể kết nối đến máy chủ để kiểm tra MGV.", {
          variant: "error",
        });
      } else {
        // Lỗi khác khi thiết lập yêu cầu
        enqueueSnackbar("Có lỗi xảy ra khi kiểm tra MGV.", {
          variant: "error",
        });
      }
    } finally {
      setIsCheckingTeacherCode(false);
    }
  };

  // Sử dụng useCallback để tránh tạo lại hàm debounced mỗi lần render
  const debouncedCheckStudentId = React.useCallback(
    debouncedCheck(checkStudentIdExists, 500),
    []
  );
  const debouncedCheckTeacherCode = React.useCallback(
    debouncedCheck(checkTeacherCodeExists, 500),
    []
  );

  const handleStudentIdBlur = (e) => {
    const studentId = e.target.value;
    if (studentId.trim()) {
      debouncedCheckStudentId(studentId);
    } else {
      setFormErrors((prev) => ({
        ...prev,
        student_id: "Mã số sinh viên là bắt buộc",
      }));
    }
  };

  const handleTeacherCodeBlur = (e) => {
    const teacherCode = e.target.value;
    if (teacherCode.trim()) {
      debouncedCheckTeacherCode(teacherCode);
    } else {
      setFormErrors((prev) => ({
        ...prev,
        teacher_code: "Mã giảng viên là bắt buộc",
      }));
    }
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
    setFormErrors({ ...formErrors, role: "" });
    // Bỏ bước trung gian, chuyển thẳng đến form đăng ký
    setShowRoleSelection(false);
  };

  const validateForm = () => {
    const errors = {
      role: "",
      fullName: "",
      department_id: "",
      class_id: "",
      student_id: "",
      teacher_code: "",
      phone: "",
      address: "",
    };
    let isValid = true;

    if (!formData.role) {
      errors.role = "Vui lòng chọn vai trò";
      isValid = false;
    }
    if (!formData.fullName.trim()) {
      errors.fullName = "Họ và tên là bắt buộc";
      isValid = false;
    }
    // Validate phone (ví dụ: không rỗng và đúng định dạng cơ bản)
    if (!formData.phone.trim()) {
      errors.phone = "Số điện thoại là bắt buộc";
      isValid = false;
    } else if (!/^0\d{9}$/.test(formData.phone)) {
      // Ví dụ: 0 gefolgt von 9 Ziffern
      errors.phone = "Số điện thoại không hợp lệ";
      isValid = false;
    }
    // Validate address (ví dụ: không rỗng)
    if (!formData.address.trim()) {
      errors.address = "Địa chỉ là bắt buộc";
      isValid = false;
    }

    if (formData.role === "student") {
      if (!formData.department_id) {
        errors.department_id = "Vui lòng chọn khoa để lọc lớp";
        isValid = false;
      }
      if (!formData.class_id) {
        errors.class_id = "Vui lòng chọn lớp";
        isValid = false;
      }
      if (!formData.student_id.trim()) {
        errors.student_id = "Mã số sinh viên là bắt buộc";
        isValid = false;
      }
    } else if (formData.role === "teacher") {
      if (!formData.department_id) {
        errors.department_id = "Vui lòng chọn khoa";
        isValid = false;
      }
      if (!formData.teacher_code.trim()) {
        errors.teacher_code = "Mã giảng viên là bắt buộc";
        isValid = false;
      }
    }

    // Kiểm tra lỗi từ API (nếu có)
    if (
      formErrors.student_id &&
      formErrors.student_id !== "Mã số sinh viên là bắt buộc"
    ) {
      errors.student_id = formErrors.student_id;
      isValid = false;
    }
    if (
      formErrors.teacher_code &&
      formErrors.teacher_code !== "Mã giảng viên là bắt buộc"
    ) {
      errors.teacher_code = formErrors.teacher_code;
      isValid = false;
    }

    if (enableFaceRegistration && !isFaceRegistrationComplete) {
      enqueueSnackbar("Vui lòng hoàn tất đăng ký khuôn mặt.", {
        variant: "warning",
      });
      isValid = false; // Nếu đã bật tùy chọn thì bắt buộc
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleFaceDataCapture = (capturedFaceData) => {
    if (capturedFaceData && capturedFaceData.length >= REQUIRED_IMAGES) {
      setFaceData(capturedFaceData);
      setIsFaceRegistrationComplete(true);
      enqueueSnackbar("Đã chụp đủ ảnh khuôn mặt!", { variant: "success" });
    } else {
      // Handle reset case if component sends null/empty
      setFaceData(null);
      setIsFaceRegistrationComplete(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Chạy validateForm trước
    if (!validateForm()) {
      enqueueSnackbar("Vui lòng kiểm tra lại thông tin đã nhập.", {
        variant: "warning",
      });
      return;
    }

    // Sau đó, kiểm tra lại các lỗi API một lần nữa trước khi submit
    // Vì validateForm có thể đã reset một số lỗi đó nếu trường rỗng
    if (formData.role === "student" && formData.student_id.trim()) {
      await checkStudentIdExists(formData.student_id); // Chờ kết quả
    }
    if (formData.role === "teacher" && formData.teacher_code.trim()) {
      await checkTeacherCodeExists(formData.teacher_code); // Chờ kết quả
    }

    // Kiểm tra lại formErrors sau khi các hàm check chạy xong
    // (Cần state formErrors cập nhật xong)
    // Sử dụng một timeout nhỏ để đảm bảo state đã cập nhật
    setTimeout(async () => {
      if (formErrors.student_id || formErrors.teacher_code) {
        enqueueSnackbar(
          "Mã sinh viên hoặc mã giảng viên đã tồn tại hoặc không hợp lệ.",
          {
            variant: "error",
          }
        );
        setIsLoading(false); // Reset isLoading nếu có lỗi
        return;
      }

      setIsLoading(true);

      const submissionData = {
        email,
        googleId,
        fullName: formData.fullName,
        role: formData.role,
        avatarUrl: avatar,
        contact: {
          phone: formData.phone,
          address: formData.address,
        },
        faceFeatures: (() => {
          if (enableFaceRegistration && faceData) {
            console.log(
              "DEBUG COMPLETE: faceData before processing:",
              faceData
            );

            const descriptors = faceData.map((item) => item.descriptor);
            console.log("DEBUG COMPLETE: Extracted descriptors:", descriptors);

            // Validate descriptors before sending
            const validDescriptors = descriptors.filter((desc) => {
              if (!desc || !Array.isArray(desc) || desc.length !== 128) {
                console.warn("Invalid descriptor detected:", desc);
                return false;
              }
              const hasValidValues = desc.every(
                (val) =>
                  val !== null &&
                  val !== undefined &&
                  typeof val === "number" &&
                  !isNaN(val)
              );
              if (!hasValidValues) {
                console.warn("Descriptor contains null/invalid values:", desc);
                return false;
              }
              return true;
            });

            if (validDescriptors.length > 0) {
              console.log(
                `DEBUG COMPLETE: Sending ${validDescriptors.length}/${descriptors.length} valid descriptors`
              );
              return { descriptors: validDescriptors };
            } else {
              console.warn(
                "No valid descriptors found in CompleteRegistration"
              );
              return undefined;
            }
          }
          return undefined;
        })(),
        school_info: {},
      };

      if (formData.role === "student") {
        submissionData.school_info.student_id = formData.student_id;
        submissionData.school_info.class_id = formData.class_id;
        if (formData.year) {
          submissionData.school_info.year = parseInt(formData.year, 10);
        }
      } else if (formData.role === "teacher") {
        submissionData.school_info.teacher_code = formData.teacher_code;
        submissionData.school_info.department_id = formData.department_id;
      }

      try {
        const response = await axios.post(
          `${API_URL}/auth/google-complete`,
          submissionData
        );

        if (response.data.success) {
          dispatch(
            setCredentials({
              token: response.data.token,
              user: response.data.user,
            })
          );
          enqueueSnackbar(response.data.message || "Đăng ký thành công!", {
            variant: "success",
          });
          navigate(`/pending-approval?role=${formData.role}`);
        } else {
          enqueueSnackbar(response.data.message || "Đăng ký thất bại", {
            variant: "error",
          });
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Đăng ký thất bại";
        enqueueSnackbar(errorMessage, { variant: "error" });
      } finally {
        setIsLoading(false);
      }
    }, 0); // Sử dụng timeout 0 để chờ state cập nhật
  };

  // Hiển thị trang chọn vai trò
  const renderRoleSelection = () => {
    return (
      <Box>
        {/* Bỏ thông báo */}
        {/* <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            <Info fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
            Bạn cần chọn vai trò của mình để tiếp tục đăng ký.
          </Typography>
        </Alert> */}

        <Typography variant="h6" gutterBottom>
          Bạn là ai trong hệ thống?
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                borderColor:
                  formData.role === "student" ? "primary.main" : "grey.300",
                boxShadow: formData.role === "student" ? 3 : 1,
              }}
            >
              <CardActionArea
                onClick={() => handleRoleSelect("student")}
                sx={{ height: "100%", p: 2 }}
              >
                <CardContent sx={{ textAlign: "center" }}>
                  <School color="primary" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    Sinh Viên
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đăng ký với tư cách sinh viên và chọn giáo viên cố vấn của
                    bạn.
                  </Typography>
                  {formData.role === "student" && (
                    <Check
                      sx={{
                        position: "absolute",
                        right: 16,
                        top: 16,
                        color: "primary.main",
                        backgroundColor: "white",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                borderColor:
                  formData.role === "teacher" ? "primary.main" : "grey.300",
                boxShadow: formData.role === "teacher" ? 3 : 1,
              }}
            >
              <CardActionArea
                onClick={() => handleRoleSelect("teacher")}
                sx={{ height: "100%", p: 2 }}
              >
                <CardContent sx={{ textAlign: "center" }}>
                  <Work color="secondary" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    Giảng Viên
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Đăng ký với tư cách giảng viên để quản lý lớp học và sinh
                    viên.
                  </Typography>
                  {formData.role === "teacher" && (
                    <Check
                      sx={{
                        position: "absolute",
                        right: 16,
                        top: 16,
                        color: "primary.main",
                        backgroundColor: "white",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        {/* Bỏ nút tiếp tục */}
        {/* <Box sx={{ mt: 3, textAlign: "right" }}>
          <Button
            variant="contained"
            onClick={() => setShowRoleSelection(false)}
            disabled={!formData.role}
            size="large"
          >
            Tiếp tục
          </Button>
        </Box> */}
      </Box>
    );
  };

  // Hiển thị form nhập thông tin
  const renderRegistrationForm = () => {
    return (
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ mb: 3 }}>
          <Divider>
            <Chip
              icon={formData.role === "student" ? <School /> : <Work />}
              label={formData.role === "student" ? "Sinh viên" : "Giảng viên"}
              color="primary"
            />
          </Divider>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="fullName"
              label="Họ và tên"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              error={!!formErrors.fullName}
              helperText={formErrors.fullName}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="phone"
              label="Số điện thoại"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!formErrors.phone}
              helperText={formErrors.phone}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              id="address"
              label="Địa chỉ"
              name="address"
              value={formData.address}
              onChange={handleChange}
              error={!!formErrors.address}
              helperText={formErrors.address}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!formErrors.department_id}>
              <InputLabel id="department-label">Khoa</InputLabel>
              <Select
                labelId="department-label"
                id="department_id"
                name="department_id"
                value={formData.department_id}
                label="Khoa"
                onChange={handleChange}
                disabled={loadingDepartments || isLoading}
              >
                {loadingDepartments ? (
                  <MenuItem value="">
                    <em>Đang tải khoa...</em>
                  </MenuItem>
                ) : (
                  departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </MenuItem>
                  ))
                )}
              </Select>
              <FormHelperText>{formErrors.department_id}</FormHelperText>
            </FormControl>
          </Grid>

          {formData.role === "student" && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  margin="normal"
                  required={formData.role === "student"}
                  error={!!formErrors.class_id}
                  disabled={
                    formData.role !== "student" ||
                    !formData.department_id || // Phải chọn khoa trước
                    loadingClasses ||
                    isLoading
                  }
                >
                  <InputLabel id="class-label">Lớp</InputLabel>
                  <Select
                    labelId="class-label"
                    name="class_id" // Đổi thành class_id
                    value={formData.class_id}
                    label="Lớp"
                    onChange={handleChange}
                  >
                    {loadingClasses ? (
                      <MenuItem value="">
                        <em>Đang tải danh sách lớp...</em>
                      </MenuItem>
                    ) : filteredClasses.length > 0 ? (
                      filteredClasses.map((cls) => (
                        <MenuItem key={cls._id} value={cls._id}>
                          {cls.name} ({cls.class_code})
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>
                        {formData.department_id
                          ? "Không có lớp cho khoa đã chọn"
                          : "Vui lòng chọn khoa"}
                      </MenuItem>
                    )}
                  </Select>
                  <FormHelperText>{formErrors.class_id}</FormHelperText>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="student_id"
                  label="Mã số sinh viên (MSSV)"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  onBlur={handleStudentIdBlur}
                  error={!!formErrors.student_id}
                  helperText={
                    formErrors.student_id ||
                    (isCheckingStudentId ? "Đang kiểm tra..." : "")
                  }
                  disabled={isLoading || isCheckingStudentId}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="derivedCourseYear"
                  label="Khóa học (từ lớp)"
                  name="year"
                  value={derivedCourseYear}
                  InputProps={{
                    readOnly: true,
                  }}
                  variant="filled"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="derivedMajorName"
                  label="Ngành học (từ lớp)"
                  value={derivedMajorName}
                  InputProps={{
                    readOnly: true,
                  }}
                  variant="filled"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enableFaceRegistration}
                      onChange={(e) =>
                        setEnableFaceRegistration(e.target.checked)
                      }
                      name="enableFaceRegistration"
                      color="primary"
                    />
                  }
                  label="Đăng ký khuôn mặt (khuyến nghị)"
                  sx={{ mt: 2, mb: 1 }}
                />
              </Grid>

              {enableFaceRegistration && (
                <Accordion
                  expanded={faceRegistrationExpanded}
                  onChange={() =>
                    setFaceRegistrationExpanded(!faceRegistrationExpanded)
                  }
                  sx={{ mt: 1 }} // Giảm margin top một chút
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Face sx={{ mr: 1 }} />
                      <Typography>Đăng ký khuôn mặt</Typography>
                      {isFaceRegistrationComplete && (
                        <Chip
                          label="Đã hoàn tất chụp ảnh"
                          color="success"
                          size="small"
                          sx={{ ml: 2 }}
                          icon={<Check fontSize="small" />}
                        />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Đăng ký khuôn mặt sẽ giúp giảng viên xác nhận danh tính và
                      sử dụng cho điểm danh tự động.
                    </Alert>
                    <FaceRegistrationComponent
                      onFaceDataCapture={handleFaceDataCapture}
                      requiredImages={REQUIRED_IMAGES}
                    />
                  </AccordionDetails>
                </Accordion>
              )}
            </>
          )}

          {formData.role === "teacher" && (
            <>
              <FormControl
                fullWidth
                margin="normal"
                required
                error={!!formErrors.department_id}
              >
                <InputLabel id="teacher-department-label">Khoa</InputLabel>
                <Select
                  labelId="teacher-department-label"
                  name="department_id"
                  value={formData.department_id}
                  label="Khoa"
                  onChange={handleChange} // Đảm bảo hàm này xử lý đúng cho GV
                  disabled={loadingDepartments || isLoading}
                >
                  {loadingDepartments ? (
                    <MenuItem value="">
                      <em>Đang tải khoa...</em>
                    </MenuItem>
                  ) : (
                    departments.map((dept) => (
                      <MenuItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>{formErrors.department_id}</FormHelperText>
              </FormControl>
              <TextField
                label="Mã giảng viên"
                name="teacher_code" // Đổi tên
                value={formData.teacher_code}
                onChange={handleChange}
                onBlur={handleTeacherCodeBlur}
                fullWidth
                margin="normal"
                required
                error={!!formErrors.teacher_code}
                helperText={
                  formErrors.teacher_code ||
                  (isCheckingTeacherCode ? "Đang kiểm tra..." : "")
                }
                disabled={isLoading || isCheckingTeacherCode}
              />
            </>
          )}
        </Grid>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
          <Button variant="outlined" onClick={() => setShowRoleSelection(true)}>
            Quay lại chọn vai trò
          </Button>

          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Hoàn tất đăng ký"
            )}
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: "100%",
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 4,
              flexDirection: "column",
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              {showRoleSelection ? "Chọn vai trò của bạn" : "Hoàn tất đăng ký"}
            </Typography>

            <Typography variant="body1" color="text.secondary" mb={2}>
              {showRoleSelection
                ? "Vui lòng chọn vai trò để tiếp tục quá trình đăng ký"
                : "Vui lòng cung cấp thêm thông tin để hoàn tất đăng ký"}
            </Typography>

            {avatar && (
              <Avatar
                src={avatar}
                alt={name || email}
                sx={{ width: 80, height: 80, mb: 2 }}
              />
            )}

            <Typography variant="subtitle1" gutterBottom>
              {email}
            </Typography>
          </Box>

          {showRoleSelection ? renderRoleSelection() : renderRegistrationForm()}
        </Paper>
      </Box>
    </Container>
  );
};

export default CompleteRegistrationPage;
