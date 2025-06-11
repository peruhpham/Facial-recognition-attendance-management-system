import React, {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import * as faceapi from "face-api.js";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  AlertTitle,
  Tooltip,
} from "@mui/material";
import {
  CameraAlt,
  Check,
  Close,
  Refresh,
  Save,
  ArrowBack,
  Info,
  VideocamOff,
  PlayCircleOutline,
  StopCircleOutlined,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  PersonAdd,
  Clear as ClearIcon,
} from "@mui/icons-material";
import {
  setModelLoaded as setFaceRecModelLoaded, // Rename to avoid conflict
  setCameraReady as setFaceRecCameraReady, // Rename to avoid conflict
  setDetectedFaces,
  setRecognizedStudents,
  clearRecognitionState,
  getClassFaceFeatures, // Correct thunk action name
  verifyAttendance,
  manualAttendance,
} from "../../redux/slices/faceRecognitionSlice"; // Fixed relative import path
import { loadModels, detectFace, getFaceDistance } from "../../utils/faceUtils";
import {
  fetchAllAbsenceRequestsForReview,
  reviewerUpdateRequestStatus,
} from "../../redux/slices/absenceRequestSlice"; // Thêm import

// Lazy load Webcam
const Webcam = lazy(() => import("react-webcam"));

const API_URL = process.env.REACT_APP_API_URL;

// Configuration Constants
const RECOGNITION_THRESHOLD = 0.55; // Giảm từ 0.6 xuống 0.55 để nhận diện dễ hơn
const DETECTION_THRESHOLD = 0.6;
const CONFIDENCE_THRESHOLD = 0.75; // Giảm từ 0.8 xuống 0.75 để chấp nhận confidence thấp hơn
const AUTO_DETECT_INTERVAL = 1500;
const FACE_DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  scoreThreshold: DETECTION_THRESHOLD,
  inputSize: 320,
});
const MODEL_URL = "/models"; // Ensure models are in the public folder

// --- Helper Functions ---

// Function to load face recognition models
const loadFaceRecognitionModels = async (
  dispatch,
  enqueueSnackbar,
  closeSnackbar
) => {
  let loadingSnackbarKey = null; // Để lưu key của snackbar
  try {
    // Check if models are already loaded (using face-api internal state)
    if (
      faceapi.nets.tinyFaceDetector.isLoaded &&
      faceapi.nets.faceLandmark68Net.isLoaded &&
      faceapi.nets.faceRecognitionNet.isLoaded
      // Removed ssdMobilenetv1 check as TinyFaceDetector is preferred
    ) {
      dispatch(setFaceRecModelLoaded(true));
      return true;
    }

    loadingSnackbarKey = enqueueSnackbar("Đang tải mô hình nhận diện...", {
      variant: "info",
      autoHideDuration: null, // Giữ nguyên để nó không tự ẩn ban đầu
    });
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    if (loadingSnackbarKey) closeSnackbar(loadingSnackbarKey); // Đóng snackbar "Đang tải..."
    dispatch(setFaceRecModelLoaded(true));
    enqueueSnackbar("Tải mô hình nhận diện thành công", { variant: "success" });
    return true;
  } catch (error) {
    // console.error("Lỗi khi tải mô hình:", error); // Giữ lại lỗi này nếu cần thiết cho production debugging
    if (loadingSnackbarKey) closeSnackbar(loadingSnackbarKey); // Đóng snackbar "Đang tải..." khi có lỗi
    enqueueSnackbar("Không thể tải mô hình nhận diện", { variant: "error" });
    dispatch(setFaceRecModelLoaded(false)); // Ensure state reflects failure
    return false;
  }
};

// Function to extract face descriptors from student data
const extractStudentDescriptors = (student) => {
  if (
    !student ||
    (!student.faceFeatures?.descriptors && !student.faceDescriptors)
  ) {
    return [];
  }

  const descriptors = [];
  const rawDescriptors =
    student.faceFeatures?.descriptors || student.faceDescriptors || [];

  const findDescriptors = (data) => {
    if (!data) return;
    if (Array.isArray(data)) {
      if (data.length === 128 && data.every((n) => typeof n === "number")) {
        descriptors.push(new Float32Array(data)); // Convert to Float32Array
      } else {
        data.forEach(findDescriptors); // Recursively search nested arrays
      }
    } else if (typeof data === "object" && data !== null) {
      // Handle potential object structures if necessary (though less common for raw descriptors)
      Object.values(data).forEach(findDescriptors);
    }
  };

  findDescriptors(rawDescriptors);
  return descriptors.filter((d) => d.length === 128); // Final validation
};

// Thêm hàm kiểm tra box hợp lệ
const isValidBox = (box) => {
  if (!box) return false;

  const { x, y, width, height } = box;

  // Kiểm tra từng thuộc tính
  if (x === null || y === null || width === null || height === null)
    return false;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  )
    return false;
  if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) return false;
  if (width <= 0 || height <= 0) return false;

  return true;
};

// Component đã được xóa vì chức năng trùng lặp

// --- React Component ---

const AttendancePage = () => {
  const { classId, sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  // Refs
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const autoModeIntervalRef = useRef(null);
  const landmarkIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Thêm useRef để lưu timeout ID
  const refreshTimeoutRef = useRef(null);
  const lastRefreshTimeRef = useRef(0);
  const REFRESH_COOLDOWN = 3000; // 3 giây cooldown giữa các lần refresh

  // Component State
  const [isLoading, setIsLoading] = useState(true);
  const [classInfo, setClassInfo] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualAttendanceData, setManualAttendanceData] = useState({
    status: "present",
    note: "",
  });
  const [componentError, setComponentError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localAbsenceRequests, setLocalAbsenceRequests] = useState([]);

  // State cho dialog xem chi tiết đơn xin nghỉ
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // State cho dialog xác nhận xóa log
  const [deleteLogDialogOpen, setDeleteLogDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);

  // Redux State
  const { token } = useSelector((state) => state.auth);
  const {
    isModelLoaded,
    isCameraReady,
    detectedFaces,
    recognizedStudents,
    classStudents,
    error: faceRecError,
  } = useSelector((state) => state.faceRecognition);
  const {
    items: absenceRequests,
    loading: absenceRequestsLoading,
    error: absenceRequestsError,
  } = useSelector((state) => state.absenceRequest.reviewRequests);

  // Hàm chuyển đổi trạng thái đơn xin nghỉ phép sang tiếng Việt
  const getStatusText = useCallback((status) => {
    switch (status) {
      case "pending":
        return "Đang chờ duyệt";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  }, []);

  // Hàm mở dialog điểm danh thủ công
  const openManualAttendanceDialog = useCallback((student) => {
    setSelectedStudent(student);
    setManualAttendanceData({
      status: "present",
      note: "",
    });
    setManualDialogOpen(true);
  }, []);

  // Hàm đóng dialog điểm danh thủ công
  const handleManualDialogClose = useCallback(() => {
    setManualDialogOpen(false);
    setSelectedStudent(null);
    setManualAttendanceData({
      status: "present",
      note: "",
    });
  }, []);

  // Hàm xử lý thay đổi form điểm danh thủ công
  const handleManualAttendanceChange = useCallback((e) => {
    setManualAttendanceData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }, []);

  // Hàm xử lý điểm danh thủ công
  const handleManualAttendanceSubmit = useCallback(async () => {
    try {
      setIsProcessing(true);

      const response = await dispatch(
        manualAttendance({
          sessionId,
          studentId: selectedStudent._id,
          status: manualAttendanceData.status,
          note: manualAttendanceData.note,
        })
      ).unwrap();

      if (response.success) {
        enqueueSnackbar("Điểm danh thủ công thành công", {
          variant: "success",
        });
        handleManualDialogClose();
        refreshAttendanceLogs();
      }
    } catch (error) {
      // console.error("Lỗi khi điểm danh thủ công:", error); // Có thể giữ lại nếu cần thiết
      enqueueSnackbar(error.message || "Lỗi khi điểm danh thủ công", {
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    dispatch,
    sessionId,
    selectedStudent,
    manualAttendanceData,
    enqueueSnackbar,
    handleManualDialogClose,
  ]);

  // Các hàm khác
  const handleQuickReview = async (request, newStatus) => {
    try {
      setIsProcessing(true);
      await dispatch(
        reviewerUpdateRequestStatus({
          requestId: request._id,
          statusData: {
            status: newStatus,
            reviewer_notes:
              newStatus === "approved"
                ? "Đơn được chấp nhận (duyệt nhanh)"
                : "Đơn bị từ chối (từ chối nhanh)",
          },
        })
      ).unwrap();

      // Cập nhật điểm danh nếu duyệt đơn
      if (newStatus === "approved") {
        // console.log(
        //   "[DEBUG AttendancePage] Absence Request Object (request):",
        //   JSON.stringify(request, null, 2)
        // );
        // console.log(
        //   "[DEBUG AttendancePage] request.student_id:",
        //   request.student_id
        // );
        // console.log(
        //   "[DEBUG AttendancePage] request.student_id._id:",
        //   request.student_id?._id
        // );

        await dispatch(
          manualAttendance({
            sessionId: sessionId,
            studentId: request.student_id?._id, // Sử dụng optional chaining cho an toàn
            status: "present", // <<<< ĐỔI THÀNH "present" KHI ĐƠN ĐƯỢC DUYỆT
            note: "Vắng có phép - Đơn được duyệt", // Cập nhật note cho rõ ràng
            absence_request_id: request._id, // Liên kết với ID của đơn xin nghỉ đã duyệt
          })
        ).unwrap();
      }
      // Nếu từ chối, không cần tự động cập nhật AttendanceLog ở đây,
      // vì sinh viên đó có thể vẫn được điểm danh là "present" nếu họ thực sự đi học,
      // hoặc sẽ là "absent" nếu không đi học (và AttendanceLog sẽ không có absence_request_id hoặc có nhưng request bị rejected).

      enqueueSnackbar(
        `Đã ${newStatus === "approved" ? "duyệt" : "từ chối"} đơn xin nghỉ`,
        { variant: "success" }
      );

      // Refresh dữ liệu
      fetchAbsenceRequests(); // Tải lại danh sách đơn của session này
      refreshAttendanceLogs(); // Tải lại logs điểm danh
    } catch (error) {
      // console.error("Lỗi khi xử lý đơn:", error); // Có thể giữ lại nếu cần thiết
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi xử lý đơn xin nghỉ",
        { variant: "error" }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Effects ---

  // Load initial data: class, session, logs, models, features
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setComponentError(null); // Clear previous errors
      try {
        // Fetch class, session, and log data in parallel
        const [classRes, sessionRes, logsRes] = await Promise.all([
          axios.get(`${API_URL}/classes/teaching/${classId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/attendance/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/attendance/logs/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const loadedSessionInfo = sessionRes.data.data;
        setClassInfo(classRes.data.data);
        setSessionInfo(loadedSessionInfo);
        setAttendanceLogs(logsRes.data.data);

        // Nếu phiên đã hoàn thành, không cần tải mô hình nhận dạng
        const isSessionCompleted = loadedSessionInfo?.status === "completed";

        if (isSessionCompleted) {
          // Không cần tải mô hình và đặc trưng khuôn mặt nếu phiên đã hoàn thành
          setIsLoading(false);
          return;
        }

        // Load models if not already loaded
        if (!isModelLoaded) {
          // Capture the return value indicating success/failure
          const modelsLoadedSuccessfully = await loadFaceRecognitionModels(
            dispatch,
            enqueueSnackbar,
            closeSnackbar
          );
          // Check if model loading failed using the return value
          if (!modelsLoadedSuccessfully) {
            // Use the return value here
            throw new Error("Failed to load face recognition models.");
          }
          // No need to check isModelLoaded from state again here
        }

        // Fetch face features only if session is not completed and models are loaded
        if (!isSessionCompleted && isModelLoaded) {
          await dispatch(getClassFaceFeatures(classId)).unwrap();
        }
      } catch (error) {
        // console.error("Lỗi khi tải dữ liệu:", error); // Có thể giữ lại nếu cần thiết
        const errMsg =
          error.response?.data?.message ||
          error.message ||
          "Lỗi khi tải dữ liệu";
        enqueueSnackbar(errMsg, { variant: "error" });
        setComponentError(errMsg); // Set component-level error for UI display
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // Thêm fetchAbsenceRequests vào đây
    fetchAbsenceRequests();

    // Cleanup function
    return () => {
      try {
        mounted = false;
        // Dừng animation frame nếu đang chạy
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        // Dừng vẽ landmarks
        setShowLandmarks(false);
        // Xóa canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
          }
        }
        // Dừng camera stream
        if (webcamRef.current) {
          const stream = webcamRef.current.video.srcObject;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        }
        // Clear các state và interval
        dispatch(clearRecognitionState());
        clearInterval(autoModeIntervalRef.current);
        clearInterval(landmarkIntervalRef.current);
        setDetectedFaces([]);
        setSelectedStudent(null);
        setManualAttendanceData({ status: "present", note: "" });
        setManualDialogOpen(false);
      } catch (error) {
        // Bỏ qua lỗi khi cleanup
        // console.log("Đã bỏ qua lỗi cleanup");
      }
    };
    // Ensure isModelLoaded is a dependency to refetch features if model loads later
  }, [
    classId,
    sessionId,
    token,
    dispatch,
    enqueueSnackbar,
    closeSnackbar,
    isModelLoaded,
  ]);

  // Effect to start/stop landmark detection interval
  useEffect(() => {
    if (isCameraReady && showLandmarks && !isAutoMode) {
      // Only draw landmarks in manual mode when enabled
      startLandmarkDetection();
    } else {
      stopLandmarkDetection();
      // Clear canvas when landmarks are off or in auto mode
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    // Cleanup interval on change
    return () => stopLandmarkDetection();
  }, [isCameraReady, showLandmarks, isAutoMode]); // Dependencies

  // Thêm useEffect để fetch absence requests
  useEffect(() => {
    if (classId) {
      dispatch(
        fetchAllAbsenceRequestsForReview({ teaching_class_id: classId })
      );
    }
  }, [dispatch, classId]);

  // Thêm useEffect để fetch đơn xin nghỉ phép khi component mount
  useEffect(() => {
    if (sessionId) {
      fetchAbsenceRequests();
    }
  }, [sessionId]);

  // --- Camera Handling ---

  const handleUserMedia = useCallback(
    (stream) => {
      dispatch(setFaceRecCameraReady(true));
      setComponentError(null); // Clear camera errors
    },
    [dispatch]
  );

  const handleUserMediaError = useCallback(
    (error) => {
      // console.error("Lỗi khi truy cập camera:", error); // Có thể giữ lại nếu cần thiết
      const errMsg = `Không thể truy cập camera: ${
        error.name === "NotAllowedError"
          ? "Bạn chưa cấp quyền truy cập camera"
          : error.name === "NotFoundError"
          ? "Không tìm thấy thiết bị camera"
          : error.message || "Lỗi không xác định"
      }`;
      enqueueSnackbar(errMsg, { variant: "error" });
      dispatch(setFaceRecCameraReady(false));
      setComponentError(errMsg);
    },
    [dispatch, enqueueSnackbar]
  );

  // --- Face Detection & Recognition Logic ---

  const drawLandmarks = useCallback(
    (detections, recognizedData = []) => {
      if (!canvasRef.current || !webcamRef.current?.video) return;

      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      resizedDetections.forEach((detection, i) => {
        // Validate detection and box before drawing
        if (!detection || !detection.detection || !detection.detection.box) {
          // console.warn(
          //   "Skipping drawing for invalid detection object:",
          //   detection
          // );
          return; // Skip this detection
        }

        const box = detection.detection.box;

        // Further validate box properties
        if (
          box.x == null ||
          box.y == null ||
          box.width == null ||
          box.height == null ||
          box.width <= 0 ||
          box.height <= 0
        ) {
          // console.warn("Skipping drawing for invalid box properties:", box);
          return; // Skip this detection
        }

        const landmarks = detection.landmarks;
        const recognized = recognizedData.find(
          (rec) => rec.detectionIndex === i
        ); // Match recognition result

        // Draw box
        const boxColor = recognized
          ? recognized.confidence > CONFIDENCE_THRESHOLD
            ? "#4CAF50"
            : "#FFC107"
          : "#2196F3"; // Green if high confidence, Yellow if medium, Blue if just detected
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw label background
        const label = recognized
          ? `${recognized.name} (${(recognized.confidence * 100).toFixed(1)}%)`
          : "Đang nhận diện...";
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(box.x, box.y - 20, textWidth + 10, 20);

        // Draw label text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "14px Arial";
        ctx.fillText(label, box.x + 5, box.y - 5);

        // Thêm thông tin match count nếu có
        if (recognized && recognized.matchCount) {
          const subLabel = `Matches: ${recognized.matchCount}`;
          const subTextWidth = ctx.measureText(subLabel).width;
          ctx.fillStyle = "rgba(0, 100, 0, 0.7)";
          ctx.fillRect(box.x, box.y + box.height, subTextWidth + 10, 15);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "11px Arial";
          ctx.fillText(subLabel, box.x + 5, box.y + box.height + 12);
        }

        // Draw landmarks if enabled
        if (showLandmarks && landmarks) {
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections); // Use face-api's drawing utility
        }
      });
    },
    [showLandmarks]
  ); // Dependency on showLandmarks

  const detectAndRecognizeFaces = useCallback(
    async (recognize = true) => {
      if (
        !isCameraReady ||
        !webcamRef.current?.video ||
        webcamRef.current.video.readyState !== 4 ||
        !isModelLoaded
      ) {
        return null; // Return null if detection can't proceed
      }

      const video = webcamRef.current.video;

      try {
        let faceData;
        if (recognize) {
          // Detect faces, landmarks, and descriptors for recognition
          faceData = await faceapi
            .detectAllFaces(video, FACE_DETECTION_OPTIONS)
            .withFaceLandmarks()
            .withFaceDescriptors();
        } else {
          // Only detect faces and landmarks (for drawing)
          faceData = await faceapi
            .detectAllFaces(video, FACE_DETECTION_OPTIONS)
            .withFaceLandmarks();
        }

        dispatch(setDetectedFaces(faceData)); // Update detected faces in Redux

        if (!faceData || faceData.length === 0) {
          // Clear canvas if no faces detected
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
          }
          dispatch(setRecognizedStudents([])); // Clear recognized students
          return null;
        }

        // --- Recognition Logic (if recognize === true) ---
        let recognizedData = [];
        if (recognize && classStudents && classStudents.length > 0) {
          const labeledDescriptors = classStudents
            .map((student) => {
              const descriptors = extractStudentDescriptors(student);
              if (descriptors.length > 0) {
                return new faceapi.LabeledFaceDescriptors(
                  student._id,
                  descriptors
                ); // Use student ID as label
              }
              return null;
            })
            .filter((ld) => ld !== null); // Filter out students with no descriptors

          if (labeledDescriptors.length > 0) {
            const faceMatcher = new faceapi.FaceMatcher(
              labeledDescriptors,
              RECOGNITION_THRESHOLD
            );

            recognizedData = faceData
              .map((fd, index) => {
                const bestMatch = faceMatcher.findBestMatch(fd.descriptor);
                const student = classStudents.find(
                  (s) => s._id === bestMatch.label
                ); // Find student by ID label

                if (!student || bestMatch.label === "unknown") {
                  return null;
                }

                // Cải thiện tính confidence: Sử dụng thuật toán tối ưu
                const studentDescriptors = extractStudentDescriptors(student);
                let bestConfidence = 1 - bestMatch.distance; // Confidence từ best match
                let validMatches = 0;

                // Tính confidence từ tất cả descriptors để có kết quả chính xác hơn
                if (studentDescriptors.length > 0) {
                  let totalConfidence = 0;
                  let matchedCount = 0;

                  studentDescriptors.forEach((descriptor) => {
                    const distance = faceapi.euclideanDistance(
                      fd.descriptor,
                      descriptor
                    );

                    // Chỉ tính những match có distance < 0.65 (looser threshold)
                    if (distance < 0.65) {
                      const confidence = Math.max(0, 1 - distance);
                      totalConfidence += confidence;
                      matchedCount++;
                      validMatches++;
                    }
                  });

                  if (matchedCount > 0) {
                    const avgConfidence = totalConfidence / matchedCount;

                    // Sử dụng combination của best match và average, ưu tiên best match
                    // Boost confidence nếu có nhiều matches
                    const boostFactor = Math.min(
                      1.2,
                      1 + (matchedCount - 1) * 0.05
                    ); // Tối đa boost 20%
                    bestConfidence = Math.min(
                      1,
                      Math.max(bestConfidence, avgConfidence) * boostFactor
                    );
                  }
                }

                return {
                  detectionIndex: index, // Link recognition to detection
                  studentId: student?._id,
                  name: student?.full_name || "Không rõ",
                  confidence: Math.min(1, bestConfidence), // Sử dụng bestConfidence đã tính toán
                  isUnknown: false,
                  matchCount: validMatches, // Số lượng descriptors match
                };
              })
              .filter((r) => r !== null); // Filter out null results

            dispatch(setRecognizedStudents(recognizedData)); // Update recognized students in Redux
          } else {
            dispatch(setRecognizedStudents([])); // Clear if no labeled descriptors
          }
        }

        // Draw landmarks and boxes with recognition info
        drawLandmarks(faceData, recognizedData);

        return { detections: faceData, recognized: recognizedData }; // Return both detection and recognition results
      } catch (error) {
        // console.error("Lỗi khi phát hiện/nhận diện khuôn mặt:", error); // Có thể giữ lại
        enqueueSnackbar("Lỗi trong quá trình xử lý khuôn mặt", {
          variant: "error",
        });
        // Clear canvas on error
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
        }
        dispatch(setDetectedFaces([]));
        dispatch(setRecognizedStudents([]));
        return null;
      }
    },
    [
      isCameraReady,
      isModelLoaded,
      classStudents,
      drawLandmarks,
      dispatch,
      enqueueSnackbar,
    ]
  );

  // --- Manual Actions ---

  const handleManualCapture = async () => {
    try {
      setIsProcessing(true); // Bắt đầu xử lý
      if (!webcamRef.current || !canvasRef.current || !isModelLoaded) {
        enqueueSnackbar("Camera hoặc mô hình chưa sẵn sàng", {
          variant: "error",
        });
        setIsProcessing(false); // Kết thúc xử lý nếu lỗi
        return;
      }

      const video = webcamRef.current.video;

      // Chụp ảnh từ webcam
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext("2d");
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const imageBase64 = tempCanvas.toDataURL("image/jpeg");

      const detectionResult = await faceapi
        .detectSingleFace(video, FACE_DETECTION_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detectionResult) {
        enqueueSnackbar("Không phát hiện được khuôn mặt nào.", {
          variant: "warning",
        });
        setIsProcessing(false);
        return;
      }

      if (!detectionResult.descriptor) {
        enqueueSnackbar("Không thể trích xuất đặc trưng khuôn mặt.", {
          variant: "warning",
        });
        setIsProcessing(false);
        return;
      }

      if (!isValidBox(detectionResult.detection.box)) {
        enqueueSnackbar("Khuôn mặt phát hiện không hợp lệ (box).", {
          variant: "warning",
        });
        setIsProcessing(false);
        return;
      }

      const match = findMatchingStudent(detectionResult.descriptor);

      if (match && match.student) {
        const { student: matchingStudent, confidence } = match;

        const response = await dispatch(
          verifyAttendance({
            sessionId,
            studentId: matchingStudent._id,
            faceDescriptor: detectionResult.descriptor,
            confidence,
            imageBase64,
          })
        ).unwrap();

        if (response.success) {
          enqueueSnackbar(
            `Đã điểm danh thành công cho ${
              matchingStudent.full_name
            } (Độ tin cậy: ${(confidence * 100).toFixed(1)}%)`,
            { variant: "success" }
          );
          refreshAttendanceLogs();
        } else {
          enqueueSnackbar(
            response.message ||
              `Lỗi khi điểm danh cho ${matchingStudent.full_name}`,
            { variant: "error" }
          );
        }
      } else {
        enqueueSnackbar("Không tìm thấy sinh viên khớp trong danh sách lớp.", {
          variant: "warning",
        });
      }
    } catch (error) {
      // console.error("Lỗi khi chụp ảnh và nhận diện thủ công:", error); // Có thể giữ lại
      enqueueSnackbar(
        error.message || "Có lỗi xảy ra khi chụp ảnh và nhận diện thủ công.",
        { variant: "error" }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const findMatchingStudent = (descriptor) => {
    if (!descriptor || !Array.isArray(classStudents)) return null;

    let bestMatchStudent = null;
    let minDistance = Infinity;
    let matchCount = 0;
    let totalConfidence = 0;

    classStudents.forEach((student) => {
      const studentDescriptors = extractStudentDescriptors(student);
      if (!studentDescriptors.length) return;

      let studentBestDistance = Infinity;
      let studentMatchCount = 0;

      studentDescriptors.forEach((studentDescriptor) => {
        const distance = getFaceDistance(descriptor, studentDescriptor);

        // Tính với threshold looser để có nhiều matches hơn
        if (distance < 0.65) {
          studentMatchCount++;
          const confidence = Math.max(0, 1 - distance);
          totalConfidence += confidence;
        }

        if (
          distance < studentBestDistance &&
          distance < RECOGNITION_THRESHOLD
        ) {
          studentBestDistance = distance;
          if (distance < minDistance) {
            minDistance = distance;
            bestMatchStudent = student;
            matchCount = studentMatchCount;
          }
        }
      });
    });

    if (bestMatchStudent && minDistance < RECOGNITION_THRESHOLD) {
      // Tính confidence cải thiện với boost factor
      let confidence = 1 - minDistance;

      if (matchCount > 1) {
        // Boost confidence nếu có nhiều descriptors match
        const boostFactor = Math.min(1.15, 1 + (matchCount - 1) * 0.03);
        confidence = Math.min(1, confidence * boostFactor);
      }

      return {
        student: bestMatchStudent,
        confidence: Math.max(0, Math.min(1, confidence)),
        matchCount: matchCount,
      };
    }

    return null;
  };

  // --- Auto Mode ---

  const refreshAttendanceLogs = async () => {
    if (isProcessing) return;

    // Kiểm tra thời gian từ lần refresh cuối
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < REFRESH_COOLDOWN) {
      // Nếu chưa đủ thời gian cooldown, hủy timeout cũ và đặt timeout mới
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        refreshAttendanceLogs();
      }, REFRESH_COOLDOWN);
      return;
    }

    try {
      setIsProcessing(true);
      const [logsRes, sessionRes] = await Promise.all([
        axios.get(`${API_URL}/attendance/logs/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/attendance/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setAttendanceLogs(logsRes.data.data);
      setSessionInfo(sessionRes.data.data);
      lastRefreshTimeRef.current = now;

      // Chỉ hiển thị thông báo khi refresh được kích hoạt bởi người dùng
      if (now - lastRefreshTimeRef.current >= REFRESH_COOLDOWN) {
        enqueueSnackbar("Đã cập nhật dữ liệu mới nhất", {
          variant: "success",
          autoHideDuration: 2000,
        });
      }
    } catch (error) {
      // console.error("Lỗi khi làm mới dữ liệu:", error); // Có thể giữ lại
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi làm mới dữ liệu",
        {
          variant: "error",
        }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const startAutoAttendance = useCallback(() => {
    if (
      !isCameraReady ||
      !isModelLoaded ||
      !classStudents ||
      classStudents.length === 0
    ) {
      enqueueSnackbar(
        "Camera, mô hình, hoặc danh sách sinh viên chưa sẵn sàng cho chế độ tự động.",
        { variant: "warning" }
      );
      return;
    }
    stopAutoAttendance(); // Clear any existing interval first
    setIsAutoMode(true);
    enqueueSnackbar("Bật chế độ tự động điểm danh", { variant: "info" });

    // Thêm Set để theo dõi sinh viên đã điểm danh trong khoảng thời gian gần đây
    const recentlyChecked = new Set();
    const processingQueue = new Set(); // Thêm queue để track các request đang xử lý
    const COOLDOWN_TIME = 15000; // Tăng từ 10s lên 15s để an toàn hơn

    autoModeIntervalRef.current = setInterval(async () => {
      const result = await detectAndRecognizeFaces(true); // Detect and recognize

      if (result && result.recognized.length > 0) {
        // Process recognized students
        for (const rec of result.recognized) {
          // Check if confidence meets or exceeds the threshold
          if (rec.confidence >= CONFIDENCE_THRESHOLD && rec.studentId) {
            // Kiểm tra xem sinh viên có đang được xử lý không
            if (processingQueue.has(rec.studentId)) {
              continue;
            }

            // Kiểm tra xem sinh viên đã được điểm danh gần đây chưa
            if (recentlyChecked.has(rec.studentId)) {
              continue;
            }

            // Kiểm tra database real-time thay vì chỉ dựa vào state
            try {
              // Thêm vào processing queue ngay lập tức
              processingQueue.add(rec.studentId);

              // Kiểm tra database thực tế
              const checkResponse = await axios.get(
                `${API_URL}/attendance/logs/${sessionId}/student/${rec.studentId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              // Nếu sinh viên đã có log present, bỏ qua
              if (checkResponse.data.success && checkResponse.data.data) {
                const existingLog = checkResponse.data.data;
                if (existingLog.status === "present") {
                  // Thêm vào recentlyChecked để tránh check lại
                  recentlyChecked.add(rec.studentId);
                  setTimeout(() => {
                    recentlyChecked.delete(rec.studentId);
                  }, COOLDOWN_TIME);

                  processingQueue.delete(rec.studentId);
                  continue;
                }
              }

              // Find the corresponding descriptor and detection
              const detection = result.detections[rec.detectionIndex];
              if (detection && detection.descriptor) {
                // Lấy ảnh khuôn mặt từ video
                const canvas = document.createElement("canvas");
                const video = webcamRef.current.video;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0);
                const imageBase64 = canvas.toDataURL("image/jpeg");

                // Gọi API verifyAttendance
                const response = await dispatch(
                  verifyAttendance({
                    sessionId,
                    studentId: rec.studentId,
                    faceDescriptor: Array.from(detection.descriptor),
                    confidence: rec.confidence,
                    imageBase64,
                  })
                ).unwrap();

                // Thêm sinh viên vào danh sách đã điểm danh gần đây
                recentlyChecked.add(rec.studentId);
                setTimeout(() => {
                  recentlyChecked.delete(rec.studentId);
                }, COOLDOWN_TIME);

                // Hiển thị thông báo thành công
                const student = classStudents.find(
                  (s) => s._id === rec.studentId
                );
                if (student) {
                  enqueueSnackbar(
                    `Đã điểm danh cho ${student.full_name} (${(
                      rec.confidence * 100
                    ).toFixed(1)}%)`,
                    {
                      variant: "success",
                      autoHideDuration: 3000,
                    }
                  );
                }

                // Refresh danh sách điểm danh và đợi hoàn thành
                await refreshAttendanceLogs();
              }
            } catch (error) {
              // Xử lý lỗi và thông báo
              if (error.response?.status === 409) {
                // 409 = conflict (đã điểm danh) - thêm vào recentlyChecked để tránh check lại
                recentlyChecked.add(rec.studentId);
                setTimeout(() => {
                  recentlyChecked.delete(rec.studentId);
                }, COOLDOWN_TIME);
              } else {
                enqueueSnackbar(
                  `Lỗi khi điểm danh: ${error.message || "Không xác định"}`,
                  { variant: "error" }
                );
              }
            } finally {
              // Luôn xóa khỏi processing queue
              processingQueue.delete(rec.studentId);
            }
          }
        }
      }
    }, AUTO_DETECT_INTERVAL);
  }, [
    isCameraReady,
    isModelLoaded,
    classStudents,
    detectAndRecognizeFaces,
    dispatch,
    sessionId,
    enqueueSnackbar,
    refreshAttendanceLogs,
    token, // Thêm token vào dependencies
  ]);

  const stopAutoAttendance = useCallback(() => {
    clearInterval(autoModeIntervalRef.current);
    autoModeIntervalRef.current = null;
    setIsAutoMode(false);
    dispatch(setRecognizedStudents([])); // Clear recognized students when stopping auto mode
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    enqueueSnackbar("Tắt chế độ tự động điểm danh", { variant: "info" });
  }, [dispatch, enqueueSnackbar]);

  // --- Landmark Detection Interval ---
  const startLandmarkDetection = useCallback(() => {
    stopLandmarkDetection(); // Clear existing interval
    landmarkIntervalRef.current = setInterval(async () => {
      // Only detect, don't recognize fully to save resources
      await detectAndRecognizeFaces(false);
    }, 100); // Detect landmarks frequently for smooth drawing
  }, [detectAndRecognizeFaces]); // Dependency

  const stopLandmarkDetection = useCallback(() => {
    clearInterval(landmarkIntervalRef.current);
    landmarkIntervalRef.current = null;
  }, []);

  // --- Other Actions ---

  const completeSession = async () => {
    try {
      // Dừng animation và xóa landmarks trước khi kết thúc
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setShowLandmarks(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      const response = await axios.put(
        `${API_URL}/attendance/sessions/${sessionId}/status`,
        { status: "completed" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      enqueueSnackbar("Đã kết thúc phiên điểm danh", { variant: "success" });
      navigate(`/teacher/classes/${classId}`);
    } catch (error) {
      // console.error("Lỗi khi kết thúc phiên:", error); // Có thể giữ lại
      enqueueSnackbar("Lỗi khi kết thúc phiên điểm danh", { variant: "error" });
    }
  };

  // Cleanup function trong useEffect
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Cập nhật hàm toggleLandmarks
  const toggleLandmarks = () => {
    if (showLandmarks) {
      // Nếu đang hiển thị landmarks, dừng animation và xóa canvas
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setShowLandmarks((prev) => !prev);
  };

  // Sửa lại hàm fetchAbsenceRequests
  const fetchAbsenceRequests = useCallback(async () => {
    try {
      // console.log("Fetching absence requests for session:", sessionId);
      const response = await axios.get(
        `${API_URL}/absence-requests/session/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // console.log("Absence requests response:", response.data);

      if (response.data.success) {
        setLocalAbsenceRequests(response.data.data || []);
      } else {
        // console.error(
        //   "Failed to fetch absence requests:",
        //   response.data.message
        // );
        enqueueSnackbar("Không thể tải danh sách đơn xin nghỉ phép", {
          variant: "error",
        });
      }
    } catch (error) {
      // console.error("Error fetching absence requests:", error); // Có thể giữ lại
      enqueueSnackbar("Lỗi khi tải danh sách đơn xin nghỉ phép", {
        variant: "error",
      });
    }
  }, [sessionId, token, enqueueSnackbar]);

  // --- Derived State ---
  const presentStudents = attendanceLogs.filter(
    (log) => log.status === "present"
  );
  const absentStudents =
    classInfo?.students?.filter(
      (student) =>
        !attendanceLogs.some(
          (log) =>
            log.student_id?._id === student._id &&
            (log.status === "present" || log.status === "late")
        ) // Consider late as not absent
    ) || [];
  const totalStudents = classInfo?.students?.length || 0;
  const sessionCompleted = sessionInfo?.status === "completed";

  // --- Hàm xử lý xóa log ---
  const handleDeleteLog = (log) => {
    setLogToDelete(log);
    setDeleteLogDialogOpen(true);
  };

  const handleCloseDeleteLogDialog = () => {
    setLogToDelete(null);
    setDeleteLogDialogOpen(false);
  };

  const confirmDeleteLog = async () => {
    if (!logToDelete) return;
    setIsProcessing(true);
    try {
      await axios.delete(`${API_URL}/attendance/logs/${logToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Xóa lượt điểm danh thành công!", { variant: "success" });
      refreshAttendanceLogs(); // Tải lại danh sách
    } catch (error) {
      // console.error("Lỗi khi xóa log điểm danh:", error); // Có thể giữ lại
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi xóa lượt điểm danh",
        { variant: "error" }
      );
    } finally {
      setIsProcessing(false);
      handleCloseDeleteLogDialog();
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Đang tải dữ liệu điểm danh...</Typography>
      </Box>
    );
  }

  if (componentError && !isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </Button>
          }
        >
          <AlertTitle>Đã xảy ra lỗi</AlertTitle>
          {componentError}
        </Alert>
      </Box>
    );
  }

  // Hàm đã được xóa vì chức năng trùng lặp

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2.5}
        pb={2}
        borderBottom="1px solid #eaeaea"
      >
        <Box>
          <Typography variant="h5" fontWeight={500}>
            Điểm Danh - {classInfo?.class_name}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Buổi {sessionInfo?.session_number} -{" "}
            {sessionInfo?.date
              ? new Date(sessionInfo.date).toLocaleDateString("vi-VN")
              : "N/A"}
            <Chip
              label={sessionInfo?.status || "N/A"}
              color={sessionCompleted ? "default" : "success"}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/teacher/classes/${classId}`)}
        >
          Quay lại lớp
        </Button>
      </Box>

      {sessionCompleted && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Phiên điểm danh này đã kết thúc. Bạn chỉ có thể xem lại kết quả.
        </Alert>
      )}

      {faceRecError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Lỗi từ hệ thống nhận diện: {faceRecError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Camera and Controls */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: "10px", boxShadow: 3, overflow: "hidden" }}>
            <CardContent
              sx={{
                bgcolor: "#f8f9fa",
                borderBottom: "1px solid #eaeaea",
                p: 2,
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="h6"
                  fontWeight={500}
                  display="flex"
                  alignItems="center"
                >
                  <CameraAlt sx={{ mr: 1, color: "primary.main" }} /> Camera
                </Typography>
                {!sessionCompleted &&
                  isModelLoaded && ( // Show controls only if session active and model loaded
                    <Box>
                      <Tooltip
                        title={
                          isAutoMode
                            ? "Dừng chế độ tự động"
                            : "Bắt đầu chế độ tự động"
                        }
                      >
                        <IconButton
                          onClick={
                            isAutoMode
                              ? stopAutoAttendance
                              : startAutoAttendance
                          }
                          color={isAutoMode ? "error" : "primary"}
                          disabled={!isCameraReady}
                        >
                          {isAutoMode ? (
                            <StopCircleOutlined />
                          ) : (
                            <PlayCircleOutline />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={showLandmarks ? "Ẩn Landmark" : "Hiện Landmark"}
                      >
                        <IconButton
                          onClick={toggleLandmarks}
                          color="secondary"
                          disabled={!isCameraReady || isAutoMode}
                        >
                          {showLandmarks ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
              </Box>
            </CardContent>

            {/* Camera Display Area */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "640 / 480",
                backgroundColor: "#000",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {sessionCompleted ? (
                <Box textAlign="center" color="white" p={4}>
                  <Info sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h6">
                    Phiên điểm danh đã kết thúc
                  </Typography>
                  <Typography variant="body2" mt={1}>
                    Bạn có thể xem kết quả điểm danh ở danh sách bên phải
                  </Typography>
                </Box>
              ) : !isModelLoaded ? (
                <Box textAlign="center" color="white">
                  <CircularProgress color="inherit" />
                  <Typography>Đang tải mô hình nhận diện...</Typography>
                </Box>
              ) : (
                <Suspense
                  fallback={
                    <Box textAlign="center" color="white">
                      <CircularProgress color="inherit" />
                      <Typography>Đang khởi tạo camera...</Typography>
                    </Box>
                  }
                >
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    height="100%"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: "user",
                    }}
                    style={{
                      display: "block",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onUserMedia={handleUserMedia}
                    onUserMediaError={handleUserMediaError}
                  />
                </Suspense>
              )}

              {/* Canvas for Overlays - chỉ hiển thị nếu phiên chưa kết thúc */}
              {!sessionCompleted && (
                <canvas
                  ref={canvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 10,
                  }}
                />
              )}

              {/* Camera Error/Loading Overlay */}
              {(!isCameraReady || componentError?.includes("camera")) &&
                !sessionCompleted && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(0,0,0,0.7)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "white",
                      zIndex: 20,
                    }}
                  >
                    <VideocamOff sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">Camera không khả dụng</Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, px: 2, textAlign: "center" }}
                    >
                      {componentError ||
                        "Không thể kết nối camera. Vui lòng kiểm tra quyền truy cập và thiết bị."}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="inherit"
                      sx={{ mt: 2 }}
                      onClick={() => window.location.reload()}
                    >
                      Thử lại
                    </Button>
                  </Box>
                )}
              {/* Auto Mode Indicator */}
              {isAutoMode && isCameraReady && (
                <Chip
                  label="Đang tự động điểm danh"
                  color="success"
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    zIndex: 15,
                  }}
                />
              )}
            </Box>

            {/* Action Buttons */}
            {!sessionCompleted && isCameraReady && isModelLoaded && (
              <Box
                display="flex"
                justifyContent="space-between"
                p={2}
                bgcolor="#f8f9fa"
                borderTop="1px solid #eaeaea"
              >
                <Button
                  variant="contained"
                  onClick={handleManualCapture}
                  startIcon={
                    isProcessing ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CameraAlt />
                    )
                  }
                  disabled={isProcessing || isAutoMode}
                >
                  Chụp & Nhận diện
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={completeSession}
                  startIcon={<Save />}
                  disabled={isProcessing}
                >
                  Kết thúc phiên
                </Button>
              </Box>
            )}
          </Card>

          {/* Recognized Students Preview (Optional) */}
          {recognizedStudents.length > 0 && !isAutoMode && (
            <Card sx={{ mt: 2, borderRadius: "10px", boxShadow: 1 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="500" mb={1}>
                  Đã nhận diện gần đây
                </Typography>
                <Grid container spacing={1}>
                  {recognizedStudents.slice(0, 4).map(
                    (
                      rec,
                      index // Show max 4
                    ) => (
                      <Grid
                        item
                        xs={6}
                        sm={3}
                        key={`${rec.studentId}-${index}`}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1,
                            textAlign: "center",
                            border: "1px solid #eee",
                          }}
                        >
                          <Typography variant="caption" display="block" noWrap>
                            {rec.name}
                          </Typography>
                          <Chip
                            label={`${(rec.confidence * 100).toFixed(0)}%`}
                            size="small"
                            color={
                              rec.confidence > CONFIDENCE_THRESHOLD
                                ? "success"
                                : "warning"
                            }
                            sx={{ mt: 0.5 }}
                          />
                        </Paper>
                      </Grid>
                    )
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Column: Student Lists */}
        <Grid item xs={12} md={4}>
          {/* Present Students */}
          <Card sx={{ mb: 3, borderRadius: "10px", boxShadow: 3 }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography variant="h6" display="flex" alignItems="center">
                  <Check sx={{ mr: 1, color: "success.main" }} /> Có mặt (
                  {presentStudents.length}/{totalStudents})
                </Typography>
                <Tooltip title="Làm mới danh sách">
                  <IconButton
                    size="small"
                    onClick={refreshAttendanceLogs}
                    disabled={isProcessing}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ maxHeight: "300px", overflow: "auto", pr: 1 }}>
                {presentStudents.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    align="center"
                    sx={{ py: 2 }}
                  >
                    Chưa có sinh viên nào được điểm danh có mặt.
                  </Typography>
                ) : (
                  <List dense>
                    {presentStudents
                      .sort(
                        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                      ) // Sort by time desc
                      .map((log) => (
                        <ListItem
                          key={log._id}
                          secondaryAction={
                            !sessionCompleted && ( // Chỉ hiển thị nút xóa nếu phiên chưa hoàn thành
                              <Tooltip title="Xóa lượt điểm danh này">
                                <IconButton
                                  edge="end"
                                  aria-label="delete"
                                  onClick={() => handleDeleteLog(log)}
                                  disabled={isProcessing}
                                  size="small"
                                >
                                  <ClearIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )
                          }
                        >
                          <ListItemText
                            primary={
                              log.student_id?.full_name ||
                              `Log ID: ${log._id} (Tên bị thiếu)`
                            }
                            secondary={`Thời gian: ${new Date(
                              log.timestamp
                            ).toLocaleTimeString("vi-VN")}${
                              log.note ? ` - Ghi chú: ${log.note}` : ""
                            }`}
                          />
                        </ListItem>
                      ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Absent Students */}
          <Card sx={{ mt: 2, borderRadius: "10px", boxShadow: 3 }}>
            <CardContent>
              <Typography
                variant="h6"
                display="flex"
                alignItems="center"
                mb={1}
              >
                <Close sx={{ mr: 1, color: "error.main" }} /> Vắng mặt (
                {absentStudents.length}/{totalStudents})
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ maxHeight: "300px", overflow: "auto", pr: 1 }}>
                {absentStudents.length === 0 ? (
                  <Typography
                    variant="body1"
                    color="textSecondary"
                    align="center"
                    sx={{ py: 2 }}
                  >
                    Tất cả sinh viên đã có mặt.
                  </Typography>
                ) : (
                  <List dense>
                    {absentStudents.map((student) => {
                      const absenceRequest = localAbsenceRequests.find(
                        (request) => request.student_id._id === student._id
                      );

                      return (
                        <ListItem
                          key={student._id}
                          disablePadding
                          sx={{ mb: 0.5 }}
                        >
                          <ListItemText
                            primary={student.full_name}
                            secondary={
                              absenceRequest
                                ? `Đơn xin nghỉ phép: ${getStatusText(
                                    absenceRequest.status
                                  )}`
                                : "Chưa có đơn xin nghỉ phép"
                            }
                          />
                          {!sessionCompleted && (
                            <Box sx={{ display: "flex", gap: 1 }}>
                              {absenceRequest && (
                                <>
                                  <Tooltip title="Xem chi tiết đơn">
                                    <IconButton
                                      edge="end"
                                      size="small"
                                      onClick={() => {
                                        setSelectedRequest(absenceRequest);
                                        setDetailDialogOpen(true);
                                      }}
                                      color="info"
                                    >
                                      <Info />
                                    </IconButton>
                                  </Tooltip>
                                  {absenceRequest.status === "pending" && (
                                    <>
                                      <Tooltip title="Duyệt đơn và điểm danh có phép">
                                        <IconButton
                                          edge="end"
                                          size="small"
                                          onClick={() =>
                                            handleQuickReview(
                                              absenceRequest,
                                              "approved"
                                            )
                                          }
                                          disabled={isProcessing}
                                          color="success"
                                        >
                                          <CheckCircle />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Từ chối đơn">
                                        <IconButton
                                          edge="end"
                                          size="small"
                                          onClick={() =>
                                            handleQuickReview(
                                              absenceRequest,
                                              "rejected"
                                            )
                                          }
                                          disabled={isProcessing}
                                          color="error"
                                        >
                                          <Cancel />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </>
                              )}
                              <Tooltip title="Điểm danh thủ công">
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() =>
                                    openManualAttendanceDialog(student)
                                  }
                                  disabled={isProcessing}
                                  color="primary"
                                >
                                  <PersonAdd />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manual Attendance Dialog */}
      <Dialog
        open={manualDialogOpen}
        onClose={handleManualDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Điểm danh thủ công</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Sinh viên: {selectedStudent?.full_name}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              name="note"
              label="Ghi chú"
              value={manualAttendanceData.note}
              onChange={handleManualAttendanceChange}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleManualDialogClose}>Hủy</Button>
          <Button
            onClick={handleManualAttendanceSubmit}
            variant="contained"
            disabled={isProcessing}
          >
            {isProcessing ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Thêm Dialog xem chi tiết đơn xin nghỉ */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedRequest(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chi tiết đơn xin nghỉ phép</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Sinh viên:</strong>{" "}
                {selectedRequest.student_id?.full_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>MSSV:</strong>{" "}
                {selectedRequest.student_id?.school_info?.student_id}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Lớp:</strong>{" "}
                {selectedRequest.student_id?.school_info?.class_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Thời gian gửi:</strong>{" "}
                {new Date(selectedRequest.created_at).toLocaleString("vi-VN")}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Trạng thái:</strong>{" "}
                {getStatusText(selectedRequest.status)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Lý do:</strong>
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  backgroundColor: "grey.50",
                  maxHeight: "100px",
                  overflow: "auto",
                }}
              >
                <Typography variant="body2">
                  {selectedRequest.reason}
                </Typography>
              </Paper>
              {selectedRequest.evidence_url && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Minh chứng đính kèm:</strong>
                  </Typography>
                  <Box
                    component="img"
                    src={selectedRequest.evidence_url}
                    alt="Minh chứng"
                    sx={{
                      width: "100%",
                      maxHeight: "200px",
                      objectFit: "contain",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "block";
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="error"
                    sx={{ display: "none", textAlign: "center", mt: 1 }}
                  >
                    Không thể tải ảnh minh chứng
                  </Typography>
                </Box>
              )}
              {selectedRequest.status === "pending" && (
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    gap: 1,
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() =>
                      handleQuickReview(selectedRequest, "approved")
                    }
                    disabled={isProcessing}
                    startIcon={<CheckCircle />}
                  >
                    Duyệt đơn
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() =>
                      handleQuickReview(selectedRequest, "rejected")
                    }
                    disabled={isProcessing}
                    startIcon={<Cancel />}
                  >
                    Từ chối
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDetailDialogOpen(false);
              setSelectedRequest(null);
            }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Log Confirmation Dialog */}
      <Dialog
        open={deleteLogDialogOpen}
        onClose={handleCloseDeleteLogDialog}
        aria-labelledby="delete-log-dialog-title"
      >
        <DialogTitle id="delete-log-dialog-title">
          Xác nhận xóa lượt điểm danh
        </DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa lượt điểm danh này của sinh viên{" "}
            <strong>{logToDelete?.student_id?.full_name || "N/A"}</strong>?
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Hành động này sẽ xóa log khỏi hệ thống và cập nhật lại danh sách có
            mặt/vắng mặt của buổi học.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteLogDialog}
            color="primary"
            disabled={isProcessing}
          >
            Hủy
          </Button>
          <Button
            onClick={confirmDeleteLog}
            color="error"
            variant="contained"
            disabled={isProcessing}
          >
            {isProcessing ? "Đang xóa..." : "Xác nhận xóa"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;
