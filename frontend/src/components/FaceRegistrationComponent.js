import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSnackbar } from "notistack";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  Paper,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  CameraAlt,
  CheckCircleOutline,
  Person,
  Replay,
} from "@mui/icons-material";
import { loadModels, detectFace } from "../utils/faceUtils";
import * as faceapi from "face-api.js";

// Lazy load Webcam
const Webcam = lazy(() => import("react-webcam"));

// Consistent video constraints
const videoConstraints = {
  width: { ideal: 480 },
  height: { ideal: 360 },
  facingMode: "user",
};

const FaceRegistrationComponent = ({
  onFaceDataCapture,
  requiredImages = 5,
}) => {
  // Refs
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const isMountedRef = useRef(false);

  // State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadingError, setModelLoadingError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [showLandmarks, setShowLandmarks] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  // 1. Load face recognition models on mount
  useEffect(() => {
    // Add global error handler for unhandled face-api errors
    const handleGlobalError = (event) => {
      if (event.error && event.error.message) {
        const errorMessage = event.error.message;

        if (
          errorMessage.includes("Box.constructor") ||
          errorMessage.includes("IBoundingBox") ||
          errorMessage.includes("IRect")
        ) {
          console.warn(
            "Global face-api bounding box error intercepted:",
            errorMessage
          );
          event.preventDefault(); // Prevent error from bubbling up

          // Clear canvas if possible to reset visual state
          if (canvasRef.current) {
            try {
              const ctx = canvasRef.current.getContext("2d");
              if (ctx) {
                ctx.clearRect(
                  0,
                  0,
                  canvasRef.current.width,
                  canvasRef.current.height
                );
              }
            } catch (canvasError) {
              console.warn("Could not clear canvas after bounding box error");
            }
          }

          // Only show notification once per session to avoid spam
          if (!window.faceApiErrorShown) {
            enqueueSnackbar(
              "Đang điều chỉnh hệ thống nhận diện. Vui lòng thử chụp lại nếu cần.",
              { variant: "info" }
            );
            window.faceApiErrorShown = true;
          }
        }
      }
    };

    window.addEventListener("error", handleGlobalError);

    const initModels = async () => {
      setModelLoadingError(null); // Reset error
      try {
        await loadModels();
        setModelsLoaded(true);
      } catch (err) {
        console.error("[FaceComponent] Error loading models:", err);
        setModelLoadingError(
          "Không thể tải mô hình nhận diện. Vui lòng thử tải lại trang."
        );
        enqueueSnackbar("Lỗi tải mô hình nhận diện", { variant: "error" });
      }
    };
    initModels();

    // Cleanup
    return () => {
      window.removeEventListener("error", handleGlobalError);
    };
  }, [enqueueSnackbar]); // Run only once on mount

  // 2. Handle camera state changes
  const handleUserMedia = () => {
    setCameraReady(true);
    setCameraError(null); // Clear previous camera error
  };

  const handleUserMediaError = (error) => {
    console.error("[FaceComponent] Camera error:", error);
    setCameraReady(false);
    const errorMsg =
      "Không thể truy cập camera. Vui lòng cấp quyền và thử lại.";
    setCameraError(errorMsg);
    enqueueSnackbar(errorMsg, { variant: "error" });
  };

  // 3. Real-time landmark drawing effect
  useEffect(() => {
    isMountedRef.current = true;
    let animationFrameId;

    const runFaceDetection = async () => {
      if (!isMountedRef.current) return;

      if (
        webcamRef.current &&
        webcamRef.current.video &&
        canvasRef.current &&
        modelsLoaded &&
        cameraReady &&
        showLandmarks &&
        !isProcessing
      ) {
        if (!isMountedRef.current) return;
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;

        if (video.readyState < 3) {
          return;
        }

        try {
          if (!isMountedRef.current) return;
          const displaySize = {
            width: video.videoWidth,
            height: video.videoHeight,
          };

          if (displaySize.width === 0 || displaySize.height === 0) {
            return;
          }

          if (!isMountedRef.current || !canvasRef.current) return;

          if (
            canvas.width !== displaySize.width ||
            canvas.height !== displaySize.height
          ) {
            faceapi.matchDimensions(canvas, displaySize);
          }

          if (!isMountedRef.current) return;

          // Use more conservative detection options to avoid invalid bounding boxes
          const detectionOptions = new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5, // Higher threshold to filter out weak detections
          });

          const detections = await faceapi
            .detectSingleFace(video, detectionOptions)
            .withFaceLandmarks();

          if (!isMountedRef.current || !canvasRef.current) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Enhanced bounding box validation to prevent null/undefined errors
          const isValidDetection = (detection) => {
            if (
              !detection ||
              !detection.detection ||
              !detection.detection.box
            ) {
              return false;
            }

            const box = detection.detection.box;

            // Enhanced validation - check for all possible invalid values
            const isValidNumber = (val) => {
              return (
                val !== null &&
                val !== undefined &&
                !isNaN(val) &&
                isFinite(val)
              );
            };

            if (
              !isValidNumber(box.x) ||
              !isValidNumber(box.y) ||
              !isValidNumber(box.width) ||
              !isValidNumber(box.height)
            ) {
              return false;
            }

            // Check for positive dimensions
            if (box.width <= 0 || box.height <= 0) {
              return false;
            }

            // Check for reasonable bounds (prevent extremely large or small values)
            if (
              box.x < -1000 ||
              box.x > 10000 ||
              box.y < -1000 ||
              box.y > 10000 ||
              box.width > 10000 ||
              box.height > 10000
            ) {
              return false;
            }

            return true;
          };

          if (detections && isValidDetection(detections)) {
            try {
              // Enhanced protection for resizeResults - this is where Box.constructor error often occurs
              let resizedDetections;
              try {
                resizedDetections = faceapi.resizeResults(
                  detections,
                  displaySize
                );
              } catch (resizeError) {
                // Specifically handle Box.constructor errors from resizeResults
                if (
                  resizeError.message &&
                  resizeError.message.includes("Box.constructor")
                ) {
                  console.warn(
                    "Box.constructor error in resizeResults - skipping this frame"
                  );
                  return; // Skip this frame entirely
                }
                throw resizeError; // Re-throw if it's a different error
              }

              if (!isMountedRef.current || !canvasRef.current) return;

              // Double-check the resized detection is still valid
              if (resizedDetections && isValidDetection(resizedDetections)) {
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
              }
            } catch (landmarkError) {
              // Silently handle landmark drawing errors to prevent UI crash
              if (
                landmarkError.message &&
                landmarkError.message.includes("Box.constructor")
              ) {
                console.warn(
                  "Box.constructor error in landmark drawing - clearing canvas"
                );
              } else {
                console.warn(
                  "Landmark drawing error (handled gracefully):",
                  landmarkError.message
                );
              }
              // Clear canvas on error
              if (isMountedRef.current && canvasRef.current) {
                const currentCtx = canvasRef.current.getContext("2d");
                if (currentCtx) {
                  currentCtx.clearRect(
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                  );
                }
              }
            }
          } else {
            // Clear canvas when no valid detection
            if (isMountedRef.current && canvasRef.current) {
              const currentCtx = canvasRef.current.getContext("2d");
              if (currentCtx) {
                currentCtx.clearRect(
                  0,
                  0,
                  canvasRef.current.width,
                  canvasRef.current.height
                );
              }
            }
          }
        } catch (error) {
          // Enhanced error handling for face detection loop
          if (error.message && error.message.includes("Box.constructor")) {
            console.warn(
              "Bounding box error in detection loop - handled gracefully"
            );
            // Clear canvas on box errors
            if (isMountedRef.current && canvasRef.current) {
              const currentCtx = canvasRef.current.getContext("2d");
              if (currentCtx) {
                currentCtx.clearRect(
                  0,
                  0,
                  canvasRef.current.width,
                  canvasRef.current.height
                );
              }
            }
          } else {
            // For other errors, log minimal info for debugging
            console.warn(
              "Detection loop error (handled):",
              error.message || "Unknown error"
            );
          }
        }
      }
    };

    const detectionLoop = () => {
      if (!isMountedRef.current) return;
      runFaceDetection().finally(() => {
        if (isMountedRef.current) {
          animationFrameId = requestAnimationFrame(detectionLoop);
        }
      });
    };

    // Start loop only when everything is ready and landmarks are enabled
    if (
      modelsLoaded &&
      cameraReady &&
      showLandmarks &&
      !modelLoadingError &&
      !cameraError
    ) {
      animationFrameId = requestAnimationFrame(detectionLoop);
    } else {
      // Clear canvas if conditions are not met
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false; // Component unmount hoặc effect sắp re-run
      try {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }

        // Chỉ xóa canvas, không dừng video stream ở đây nữa.
        // Webcam component sẽ tự quản lý stream của nó.
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          // Kiểm tra canvas và context trước khi thao tác để tránh lỗi
          if (canvas && typeof canvas.getContext === "function") {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
        }
      } catch (error) {
        // Silently handle cleanup errors
        // console.error("[FaceComponent] Error during landmark cleanup:", error);
      }
    };
  }, [
    modelsLoaded,
    cameraReady,
    showLandmarks,
    isProcessing,
    modelLoadingError,
    cameraError,
  ]);

  // 4. Capture and detect face với quality validation
  const captureImage = async () => {
    // Basic checks
    if (!webcamRef.current || !cameraReady || isProcessing || !modelsLoaded) {
      let reason = "Chưa sẵn sàng";
      if (!cameraReady) reason = "Camera chưa sẵn sàng";
      else if (isProcessing) reason = "Đang xử lý";
      else if (!modelsLoaded) reason = "Mô hình chưa tải xong";
      enqueueSnackbar(`Không thể chụp ảnh: ${reason}`, { variant: "warning" });
      return;
    }
    if (capturedImages.length >= requiredImages) {
      enqueueSnackbar(`Đã chụp đủ ${requiredImages} ảnh.`, { variant: "info" });
      return;
    }

    setIsProcessing(true);
    setCaptureError(""); // Clear previous capture error

    try {
      const imageSrc = webcamRef.current.getScreenshot({
        width: videoConstraints.width.ideal,
        height: videoConstraints.height.ideal,
      });
      if (!imageSrc) {
        throw new Error("Không thể chụp ảnh từ webcam.");
      }

      // Perform face detection với quality validation and error handling
      let detections;
      try {
        detections = await detectFace(imageSrc);
      } catch (faceDetectionError) {
        console.warn(
          "[FaceComponent] Face detection error:",
          faceDetectionError.message
        );
        enqueueSnackbar("Lỗi khi phân tích khuôn mặt. Vui lòng thử lại.", {
          variant: "warning",
        });
        setIsProcessing(false);
        return;
      }

      if (!detections || !detections.descriptor || !detections.detection) {
        console.warn(
          "[FaceComponent] Face detection failed or incomplete data."
        );
        enqueueSnackbar(
          "Không phát hiện được khuôn mặt rõ ràng. Hãy thử lại.",
          { variant: "warning" }
        );
        setIsProcessing(false); // Allow retry
        return;
      }

      // Additional bounding box validation for captured image
      const box = detections.detection.box;
      if (
        !box ||
        box.x === null ||
        box.y === null ||
        box.width === null ||
        box.height === null
      ) {
        console.warn("[FaceComponent] Invalid bounding box in detection:", box);
        enqueueSnackbar("Dữ liệu khuôn mặt không hợp lệ. Vui lòng thử lại.", {
          variant: "warning",
        });
        setIsProcessing(false);
        return;
      }

      // Quality validation: Kiểm tra độ tin cậy detection
      const detectionScore = detections.detection.score;
      if (detectionScore < 0.8) {
        enqueueSnackbar(
          `Chất lượng khuôn mặt không đủ tốt (${(detectionScore * 100).toFixed(
            1
          )}%). Hãy di chuyển đến vị trí có ánh sáng tốt hơn.`,
          { variant: "warning" }
        );
        setIsProcessing(false);
        return;
      }

      // Diversity validation: Kiểm tra xem ảnh mới có đa dạng không
      const newDescriptor = detections.descriptor;
      let tooSimilar = false;

      for (const existingImage of capturedImages) {
        const existingDescriptor = new Float32Array(existingImage.descriptor);
        const distance = faceapi.euclideanDistance(
          newDescriptor,
          existingDescriptor
        );

        // Nếu quá giống ảnh cũ (distance < 0.3), từ chối
        if (distance < 0.3) {
          tooSimilar = true;
          break;
        }
      }

      if (tooSimilar) {
        enqueueSnackbar(
          "Ảnh này quá giống ảnh đã chụp. Hãy thay đổi góc độ hoặc biểu cảm.",
          { variant: "warning" }
        );
        setIsProcessing(false);
        return;
      }

      // Store image and descriptor với metadata
      const newImageData = {
        img: imageSrc,
        descriptor: Array.from(detections.descriptor), // Ensure serializable
        quality: detectionScore, // Lưu chất lượng detection
        timestamp: Date.now(), // Timestamp để tracking
      };
      const updatedImages = [...capturedImages, newImageData];
      setCapturedImages(updatedImages);

      enqueueSnackbar(
        `Đã chụp ảnh ${updatedImages.length}/${requiredImages} (Chất lượng: ${(
          detectionScore * 100
        ).toFixed(1)}%)`,
        {
          variant: "success",
          autoHideDuration: 2000,
        }
      );

      // If enough images captured, notify parent immediately
      if (updatedImages.length >= requiredImages) {
        onFaceDataCapture(updatedImages); // Pass all captured data
        enqueueSnackbar(`Đã chụp đủ ${requiredImages} ảnh chất lượng cao!`, {
          variant: "success",
        });
      }
    } catch (err) {
      console.error("[FaceComponent] Error capturing image:", err);
      const errorMsg = "Lỗi khi chụp ảnh. Vui lòng thử lại.";
      setCaptureError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Reset capture
  const resetCapture = () => {
    setCapturedImages([]);
    setCaptureError("");
    // Notify parent that data is cleared (optional, depends on parent needs)
    // onFaceDataCapture(null); or onFaceDataCapture([]);
    enqueueSnackbar("Đã xóa ảnh đã chụp, bạn có thể chụp lại.", {
      variant: "info",
    });
  };

  // --- Render Logic ---

  const renderCameraView = () => (
    <Paper
      elevation={2}
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: `${videoConstraints.width.ideal}px`,
        aspectRatio: `${videoConstraints.width.ideal} / ${videoConstraints.height.ideal}`,
        margin: "16px auto",
        overflow: "hidden",
        bgcolor: "grey.200",
        border: cameraError ? "2px solid red" : "1px solid",
        borderColor: "divider",
      }}
    >
      <Suspense
        fallback={
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: showLandmarks ? "block" : "none",
          }}
        />
      </Suspense>

      {/* Loading/Error Overlay */}
      {(!modelsLoaded || !cameraReady || cameraError || modelLoadingError) && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            textAlign: "center",
            p: 2,
          }}
        >
          <CircularProgress color="inherit" sx={{ mb: 2 }} />
          {modelLoadingError && (
            <Typography variant="body2" color="error">
              {modelLoadingError}
            </Typography>
          )}
          {cameraError && (
            <Typography variant="body2" color="error">
              {cameraError}
            </Typography>
          )}
          {!modelLoadingError && !cameraError && !modelsLoaded && (
            <Typography>Đang tải mô hình...</Typography>
          )}
          {!modelLoadingError &&
            !cameraError &&
            modelsLoaded &&
            !cameraReady && <Typography>Đang khởi động camera...</Typography>}
        </Box>
      )}
    </Paper>
  );

  const renderCaptureControls = () => (
    <Box sx={{ textAlign: "center", mt: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={showLandmarks}
            onChange={(e) => setShowLandmarks(e.target.checked)}
            size="small"
          />
        }
        label="Hiện Landmark"
        sx={{ mb: 1, display: "block" }}
      />
      <Button
        variant="contained"
        color="primary"
        startIcon={<CameraAlt />}
        onClick={captureImage}
        disabled={
          !cameraReady ||
          !modelsLoaded ||
          isProcessing ||
          capturedImages.length >= requiredImages ||
          !!cameraError ||
          !!modelLoadingError
        }
        sx={{ mb: 1, mr: 1 }}
      >
        {isProcessing ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          `Chụp ảnh (${capturedImages.length}/${requiredImages})`
        )}
      </Button>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<Replay />}
        onClick={resetCapture}
        disabled={capturedImages.length === 0 || isProcessing}
        sx={{ mb: 1 }}
      >
        Chụp lại
      </Button>
      {captureError && (
        <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
          {captureError}
        </Alert>
      )}
    </Box>
  );

  const renderImagePreviews = () =>
    capturedImages.length > 0 && (
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography variant="caption" display="block" gutterBottom>
          Ảnh đã chụp:
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
        >
          {capturedImages.map((imgData, index) => (
            <Avatar
              key={index}
              src={imgData.img}
              sx={{ width: 56, height: 56 }}
            />
          ))}
          {/* Placeholders for remaining slots */}
          {[...Array(Math.max(0, requiredImages - capturedImages.length))].map(
            (_, i) => (
              <Avatar
                key={`placeholder-${i}`}
                sx={{ width: 56, height: 56, bgcolor: "grey.300" }}
              >
                <Person />
              </Avatar>
            )
          )}
        </Stack>
      </Box>
    );

  // --- Main Component Render with Error Boundary ---
  try {
    return (
      <Box>
        {/* Show general loading/error before camera */}
        {!modelsLoaded && !modelLoadingError && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 2,
            }}
          >
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography>Đang tải mô hình nhận diện...</Typography>
          </Box>
        )}
        {modelLoadingError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {modelLoadingError}
          </Alert>
        )}

        {/* Render Camera and Controls once models attempt to load */}
        {modelsLoaded && !modelLoadingError && (
          <>
            {renderCameraView()}
            {renderCaptureControls()}
            {renderImagePreviews()}
          </>
        )}
        {/* Optional: Add a success message when all images are captured */}
        {capturedImages.length >= requiredImages && (
          <Alert
            severity="success"
            icon={<CheckCircleOutline fontSize="inherit" />}
            sx={{ mt: 2 }}
          >
            Đã chụp đủ {requiredImages} ảnh. Bạn có thể tiếp tục.
          </Alert>
        )}
      </Box>
    );
  } catch (renderError) {
    console.error("Face Registration Component render error:", renderError);
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Lỗi hệ thống đăng ký khuôn mặt
          </Typography>
          <Typography variant="body2">
            Đã xảy ra lỗi không mong muốn. Vui lòng tải lại trang hoặc thử lại
            sau.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{ mt: 1 }}
          >
            Tải lại trang
          </Button>
        </Alert>
      </Box>
    );
  }
};

export default FaceRegistrationComponent;
