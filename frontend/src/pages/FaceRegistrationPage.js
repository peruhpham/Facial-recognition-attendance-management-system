import React, { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Avatar,
  Container,
} from "@mui/material";
import {
  Check,
  Info,
  SaveAlt,
  ErrorOutline,
  CheckCircleOutline,
  HelpOutline,
  CameraAlt,
  Person,
  Replay,
  FaceRetouchingNatural,
} from "@mui/icons-material";
import { getCurrentUser } from "../redux/slices/authSlice";
import { loadModels, detectFace } from "../utils/faceUtils";
import FaceRegistrationComponent from "../components/FaceRegistrationComponent";

const API_URL = process.env.REACT_APP_API_URL;
const REQUIRED_IMAGES = 5;

const FaceRegistrationPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const {
    user,
    token,
    isLoading: authLoading,
  } = useSelector((state) => state.auth);

  // --- State ---
  const [capturedFaceData, setCapturedFaceData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(false);
  const [checkingFaceStatus, setCheckingFaceStatus] = useState(true);
  const [hasFaceRegistered, setHasFaceRegistered] = useState(false);

  // --- Effects ---

  // 1. Check initial face registration status
  useEffect(() => {
    if (!authLoading && user) {
      const registered =
        !!user.faceFeatures &&
        !!user.faceFeatures.descriptors &&
        user.faceFeatures.descriptors.length > 0 &&
        user.faceFeatures.descriptors[0].length > 0;

      setHasFaceRegistered(registered);
      if (!registered) {
        setAllowRegistration(true);
      }
      setCheckingFaceStatus(false);
    }
  }, [user, authLoading]);

  // 2. Load face models when registration is allowed and needed (Step 1)
  useEffect(() => {
    const initModels = async () => {
      // Only load if registration is allowed, we are on the capture step (index 1), and models aren't loaded yet
      if (
        allowRegistration &&
        activeStep === 1 &&
        !capturedFaceData &&
        !registrationError
      ) {
        setIsSubmitting(true);
        setRegistrationError(null);
        try {
          await loadModels();
        } catch (error) {
          setRegistrationError(
            "Không thể tải mô hình nhận diện. Vui lòng tải lại trang hoặc thử lại."
          );
          enqueueSnackbar("Lỗi tải mô hình nhận diện", { variant: "error" });
        } finally {
          setIsSubmitting(false);
        }
      }
    };
    initModels();
  }, [
    allowRegistration,
    activeStep,
    capturedFaceData,
    registrationError,
    enqueueSnackbar,
  ]);

  const handleUserMediaError = (error) => {
    console.error("Camera error:", error);
    enqueueSnackbar(
      "Không thể truy cập camera. Vui lòng cấp quyền và thử lại.",
      { variant: "error" }
    );
    // Maybe move to a specific error step or show alert directly
    if (activeStep === 1) {
      // If error happens during capture step
      setRegistrationError("Lỗi camera. Kiểm tra quyền truy cập.");
    }
  };

  // --- Actions ---

  const handleAllowReRegistration = () => {
    setAllowRegistration(true);
    setHasFaceRegistered(false);
    handleReset();
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setRegistrationError("");
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    setCapturedFaceData(null);
    setActiveStep(0);
    setRegistrationError("");
    setRegistrationSuccess(false);
    setIsSubmitting(false);
  };

  const handleFaceDataCaptured = (faceData) => {
    if (faceData && faceData.length >= REQUIRED_IMAGES) {
      setCapturedFaceData(faceData);
      if (activeStep === 1) {
        handleNext();
      }
    } else {
      setCapturedFaceData(null);
    }
  };

  const submitRegistration = async () => {
    // console.log('\"Đăng ký khuôn mặt\" button clicked. Starting submission...');
    if (
      !capturedFaceData ||
      capturedFaceData.length < REQUIRED_IMAGES ||
      isSubmitting ||
      !user
    ) {
      if (!user) {
        enqueueSnackbar(
          "Không tìm thấy thông tin người dùng. Vui lòng thử tải lại trang.",
          { variant: "error" }
        );
      } else {
        enqueueSnackbar(`Cần đủ ${REQUIRED_IMAGES} ảnh để đăng ký.`, {
          variant: "warning",
        });
      }
      return;
    }

    setIsSubmitting(true);
    setRegistrationError("");
    setRegistrationSuccess(false);

    try {
      // Enhanced validation and processing for face descriptors
      console.log(
        "DEBUG FACE_REG_PAGE: capturedFaceData before processing:",
        capturedFaceData
      );

      const descriptors = capturedFaceData.map((data) => data.descriptor);
      console.log("DEBUG FACE_REG_PAGE: Extracted descriptors:", descriptors);

      // Validate descriptors before sending
      const validDescriptors = descriptors.filter((desc) => {
        if (!desc || !Array.isArray(desc) || desc.length !== 128) {
          console.warn("FACE_REG_PAGE: Invalid descriptor detected:", desc);
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
          console.warn(
            "FACE_REG_PAGE: Descriptor contains null/invalid values:",
            desc
          );
          return false;
        }
        return true;
      });

      if (validDescriptors.length === 0) {
        throw new Error(
          "Không có dữ liệu khuôn mặt hợp lệ. Vui lòng chụp lại."
        );
      }

      if (validDescriptors.length < capturedFaceData.length) {
        console.warn(
          `FACE_REG_PAGE: Only ${validDescriptors.length}/${capturedFaceData.length} descriptors are valid`
        );
        enqueueSnackbar(
          `Chỉ có ${validDescriptors.length}/${capturedFaceData.length} ảnh hợp lệ. Tiếp tục với ảnh hợp lệ.`,
          { variant: "warning" }
        );
      }

      console.log(
        `DEBUG FACE_REG_PAGE: Sending ${validDescriptors.length} valid descriptors`
      );

      const payload = {
        userId: user._id,
        faceDescriptors: validDescriptors,
      };

      const response = await axios.post(
        `${API_URL}/face-recognition/save-features`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        enqueueSnackbar(
          response.data.message || "Lưu đặc trưng khuôn mặt thành công!",
          { variant: "success" }
        );
        setRegistrationSuccess(true);
        dispatch(getCurrentUser());
        handleNext();
      } else {
        throw new Error(
          response.data.message || "Lưu đặc trưng khuôn mặt thất bại."
        );
      }
    } catch (error) {
      console.error("Lỗi khi lưu đặc trưng khuôn mặt:", error);
      const errMsg =
        error.response?.data?.message ||
        error.message ||
        "Lỗi không xác định khi lưu đặc trưng.";

      setRegistrationError(`Lưu thất bại: ${errMsg}`);
      enqueueSnackbar(`Lưu thất bại: ${errMsg}`, { variant: "error" });
      setRegistrationSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToProfile = () => {
    navigate("/profile");
  };

  const steps = [
    {
      label: "Giới thiệu",
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Chào mừng đến với đăng ký khuôn mặt
          </Typography>
          <Typography paragraph>
            Quá trình này giúp hệ thống nhận diện bạn để điểm danh. Vui lòng làm
            theo các bước sau và đảm bảo bạn đang ở nơi có đủ ánh sáng, khuôn
            mặt không bị che khuất.
          </Typography>
          <Alert
            severity="info"
            icon={<Info fontSize="inherit" />}
            sx={{ mt: 2 }}
          >
            Bạn sẽ cần chụp <strong>{REQUIRED_IMAGES} ảnh</strong> khuôn mặt.
            Giữ khuôn mặt thẳng, nhìn trực diện vào camera.
          </Alert>
          {registrationError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {registrationError}
            </Alert>
          )}
        </Box>
      ),
    },
    // Step 1: Capture using Component
    {
      label: "Chụp ảnh",
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            Chụp {REQUIRED_IMAGES} ảnh
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Giữ yên và nhìn thẳng vào camera. Nhấn nút "Chụp ảnh" khi sẵn sàng.
            Sử dụng nút "Hiện Landmark" để xem các điểm nhận diện (nếu cần).
          </Typography>
          <FaceRegistrationComponent
            onFaceDataCapture={handleFaceDataCaptured}
            requiredImages={REQUIRED_IMAGES}
          />
        </Box>
      ),
    },
    // Step 2: Confirmation
    {
      label: "Xác nhận",
      content: (
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" gutterBottom>
            Xem lại và Xác nhận
          </Typography>
          <Typography paragraph>
            Bạn đã chụp đủ {REQUIRED_IMAGES} ảnh. Xem lại các ảnh dưới đây. Nếu
            hài lòng, nhấn "Đăng ký".
          </Typography>
          {capturedFaceData && capturedFaceData.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              flexWrap="wrap"
              mb={3}
            >
              {capturedFaceData.map((imgData, index) => (
                <Avatar
                  key={index}
                  src={imgData.img}
                  sx={{ width: 80, height: 80 }}
                />
              ))}
            </Stack>
          )}

          {registrationError && (
            <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
              {registrationError}
            </Alert>
          )}

          <Button
            variant="contained"
            color="success"
            startIcon={<SaveAlt />}
            onClick={submitRegistration}
            disabled={
              isSubmitting ||
              !capturedFaceData ||
              capturedFaceData.length < REQUIRED_IMAGES
            }
            sx={{ mt: 1, mb: 1 }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Đăng ký khuôn mặt"
            )}
          </Button>
        </Box>
      ),
    },
    // Step 3: Completion - Modified Content Rendering
    {
      label: "Hoàn thành",
      content: (
        <Box sx={{ textAlign: "center", p: 2 }}>
          {/* Show content only after submission attempt is resolved */}
          {isSubmitting ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Đang xử lý...
              </Typography>
            </Box>
          ) : registrationSuccess ? (
            // Success UI
            <>
              <CheckCircleOutline
                color="success"
                sx={{ fontSize: 60, mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                Đăng ký thành công!
              </Typography>
              <Typography paragraph>
                Dữ liệu khuôn mặt của bạn đã được lưu.
              </Typography>
              <Button variant="contained" onClick={navigateToProfile}>
                Về trang cá nhân
              </Button>
            </>
          ) : registrationError ? (
            // Failure UI (only shows if registrationError has content)
            <>
              <ErrorOutline color="error" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Đăng ký thất bại
              </Typography>
              <Typography paragraph color="error">
                {registrationError /* Display the specific error */}
              </Typography>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<Replay />}
              >
                Thử lại từ đầu
              </Button>
            </>
          ) : (
            // Default state before submission completes (or if step somehow reached prematurely)
            // Render nothing or a placeholder. Avoid showing failure by default.
            <Typography variant="body2" color="text.secondary">
              Hoàn tất quá trình đăng ký tại bước trước.
            </Typography>
          )}
        </Box>
      ),
    },
  ];

  // --- Render Logic ---

  if (checkingFaceStatus || authLoading) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Đang kiểm tra trạng thái đăng ký...
        </Typography>
      </Container>
    );
  }

  if (hasFaceRegistered && !allowRegistration) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
          <FaceRetouchingNatural color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Đã có dữ liệu khuôn mặt
          </Typography>
          <Typography paragraph color="text.secondary">
            Hệ thống đã ghi nhận dữ liệu khuôn mặt của bạn.
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 3 }}
          >
            <Button
              variant="contained"
              onClick={navigateToProfile}
              startIcon={<Person />}
            >
              Xem hồ sơ
            </Button>
            <Button
              variant="outlined"
              onClick={handleAllowReRegistration}
              startIcon={<Replay />}
            >
              Đăng ký lại
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h4" component="h1">
            Đăng ký khuôn mặt
          </Typography>
          <Button
            startIcon={<HelpOutline />}
            onClick={() => setShowHelpDialog(true)}
            size="small"
          >
            Trợ giúp
          </Button>
        </Stack>
        <Divider sx={{ mb: 3 }} />

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label} expanded={true}>
              <StepLabel
                icon={
                  index === activeStep ? (
                    <CircularProgress size={24} />
                  ) : index < activeStep ? (
                    <Check />
                  ) : (
                    index + 1
                  )
                }
              >
                <Typography variant={activeStep === index ? "h6" : "body1"}>
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent TransitionProps={{ unmountOnExit: false }}>
                <Box sx={{ mb: 2, mt: 1, pl: { xs: 0, sm: 1 } }}>
                  {step.content}
                  {activeStep < steps.length - 1 && (
                    <Box sx={{ mt: 3, mb: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        disabled={
                          (index === 1 &&
                            (!capturedFaceData ||
                              capturedFaceData.length < REQUIRED_IMAGES)) ||
                          isSubmitting
                        }
                        sx={{ mr: 1 }}
                      >
                        Tiếp tục
                      </Button>
                      <Button
                        disabled={index === 0 || isSubmitting}
                        onClick={handleBack}
                      >
                        Quay lại
                      </Button>
                      {index > 0 && (
                        <Button
                          onClick={handleReset}
                          sx={{ ml: 2 }}
                          color="warning"
                          disabled={isSubmitting}
                        >
                          Bắt đầu lại
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Dialog open={showHelpDialog} onClose={() => setShowHelpDialog(false)}>
        <DialogTitle>Hướng dẫn Đăng ký Khuôn mặt</DialogTitle>
        <DialogContent>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <Info />
              </ListItemIcon>
              <ListItemText primary="Mục đích: Đăng ký dữ liệu khuôn mặt để hệ thống có thể nhận diện bạn." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <HelpOutline />
              </ListItemIcon>
              <ListItemText
                primary={`Chuẩn bị: Ngồi ở nơi đủ sáng, không đeo kính râm hoặc khẩu trang. Giữ khuôn mặt thẳng, nhìn vào camera.`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CameraAlt />
              </ListItemIcon>
              <ListItemText
                primary={`Chụp ảnh: Nhấn nút 'Chụp ảnh' ${REQUIRED_IMAGES} lần. Có thể bật landmark để căn chỉnh.`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Check />
              </ListItemIcon>
              <ListItemText
                primary={`Xác nhận & Hoàn thành: Xem lại ${REQUIRED_IMAGES} ảnh đã chụp, sau đó nhấn 'Đăng ký'.`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ErrorOutline />
              </ListItemIcon>
              <ListItemText primary="Lỗi: Nếu không nhận diện được khuôn mặt, hãy thử lại ở góc độ hoặc ánh sáng khác. Nếu lỗi tiếp diễn, liên hệ hỗ trợ." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Replay />
              </ListItemIcon>
              <ListItemText primary="Đăng ký lại: Nếu muốn cập nhật ảnh khuôn mặt, bạn có thể chọn 'Đăng ký lại' từ màn hình thông báo." />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelpDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Wrapper for lazy loading Webcam
const FaceRegistrationPageWithSuspense = () => (
  <Suspense
    fallback={
      <Container maxWidth="sm" sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Đang tải thành phần...</Typography>
      </Container>
    }
  >
    <FaceRegistrationPage />
  </Suspense>
);

export default FaceRegistrationPageWithSuspense;
