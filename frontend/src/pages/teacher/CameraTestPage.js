import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Grid,
  CircularProgress,
} from "@mui/material";

const CameraTestPage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState("chưa kiểm tra");
  const [cameraStream, setCameraStream] = useState(null);
  const [mediaDevices, setMediaDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // Kiểm tra hỗ trợ
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("MediaDevices API không được hỗ trợ");
      setIsSupported(false);
      setError("Trình duyệt không hỗ trợ API camera");
    }

    // Liệt kê các thiết bị media
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter(
            (device) => device.kind === "videoinput"
          );
          setMediaDevices(videoDevices);
        })
        .catch((err) => {
          console.error("Lỗi khi liệt kê thiết bị:", err);
        });
    }

    return () => {
      // Cleanup
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // Kiểm tra quyền camera
  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: "camera" });
      setPermissionState(result.state);

      // Lắng nghe sự thay đổi trạng thái
      result.onchange = () => {
        setPermissionState(result.state);
      };
    } catch (err) {
      console.log("Không thể truy vấn quyền camera:", err);
    }
  };

  // Khởi tạo camera
  const startCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setCameraStream(stream);

      if (videoRef.current) {
        // Thử cách 1: Set srcObject
        videoRef.current.srcObject = stream;

        // Thêm event listeners cho video element
        videoRef.current.onloadedmetadata = () => {};

        videoRef.current.onloadeddata = () => {};

        videoRef.current.onplay = () => {};

        videoRef.current.onerror = (e) => {
          console.error("Lỗi video element:", e);
        };

        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error("Lỗi khi phát video:", playErr);
        }

        setIsCameraReady(true);
        await checkCameraPermission();
      } else {
        console.error("videoRef.current không tồn tại");
      }
    } catch (err) {
      console.error("Lỗi khi truy cập camera:", err);
      setError(`Lỗi: ${err.name} - ${err.message}`);
      setIsCameraReady(false);
      await checkCameraPermission();
    } finally {
      setIsLoading(false);
    }
  };

  // Chụp ảnh từ camera
  const captureImage = () => {
    if (videoRef.current && isCameraReady) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      // Vẽ video frame hiện tại vào canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Chuyển đổi canvas thành data URL
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);
    }
  };

  // Dừng camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
      });

      setCameraStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraReady(false);
    setCapturedImage(null);
  };

  // Kiểm tra hỗ trợ
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    const browserInfo = {
      userAgent,
      isChrome: userAgent.indexOf("Chrome") > -1,
      isFirefox: userAgent.indexOf("Firefox") > -1,
      isSafari:
        userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1,
      isEdge: userAgent.indexOf("Edg") > -1,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ),
    };

    return browserInfo;
  };

  const browserInfo = getBrowserInfo();

  // Thử cách khác để bật camera
  const tryAlternativeCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Tạo một video element mới
      const testVideo = document.createElement("video");
      testVideo.autoplay = true;
      testVideo.muted = true;
      testVideo.playsInline = true;

      // Yêu cầu stream với các thiết lập tối thiểu
      const minimalStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setCameraStream(minimalStream);

      // Gắn stream vào video element
      testVideo.srcObject = minimalStream;

      // Chờ video element sẵn sàng
      await new Promise((resolve) => {
        testVideo.onloadedmetadata = () => {
          testVideo
            .play()
            .then(resolve)
            .catch((e) => {
              console.error("Lỗi khi phát video tối thiểu:", e);
              resolve();
            });
        };
      });

      // Gắn stream vào video element trong DOM
      if (videoRef.current) {
        videoRef.current.srcObject = minimalStream;
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error("Lỗi khi thử cách thay thế:", err);
      setError(`Lỗi cách thay thế: ${err.name} - ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Kiểm Tra Camera
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Thông tin trình duyệt:
        </Typography>
        <pre style={{ overflowX: "auto", backgroundColor: "#f5f5f5", p: 2 }}>
          {JSON.stringify(browserInfo, null, 2)}
        </pre>
        <Typography>
          Trạng thái quyền camera: <strong>{permissionState}</strong>
        </Typography>

        {mediaDevices.length > 0 && (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Thiết bị camera phát hiện ({mediaDevices.length}):
            </Typography>
            <ul>
              {mediaDevices.map((device, index) => (
                <li key={device.deviceId}>
                  {device.label || `Camera ${index + 1}`} (ID:{" "}
                  {device.deviceId.substring(0, 8)}...)
                </li>
              ))}
            </ul>
          </Box>
        )}
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={startCamera}
          disabled={!isSupported || isCameraReady || isLoading}
          sx={{ mr: 2 }}
        >
          {isLoading ? <CircularProgress size={24} /> : "Bật Camera"}
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={tryAlternativeCamera}
          disabled={!isSupported || isCameraReady || isLoading}
          sx={{ mr: 2 }}
        >
          Thử Cách Khác
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={stopCamera}
          disabled={!isCameraReady || isLoading}
        >
          Tắt Camera
        </Button>

        {isCameraReady && (
          <Button
            variant="outlined"
            color="info"
            onClick={captureImage}
            sx={{ ml: 2 }}
          >
            Chụp ảnh
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={capturedImage ? 6 : 12}>
          <Paper
            elevation={3}
            sx={{
              width: "100%",
              height: "400px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#f0f0f0",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {isCameraReady ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    display: "none",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                />
                {isLoading && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                  >
                    <CircularProgress />
                  </Box>
                )}
              </>
            ) : (
              <Typography variant="body1" align="center">
                {isLoading ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography>Đang khởi tạo camera...</Typography>
                  </Box>
                ) : isSupported ? (
                  "Nhấn 'Bật Camera' để bắt đầu"
                ) : (
                  "Trình duyệt không hỗ trợ camera"
                )}
              </Typography>
            )}
          </Paper>
        </Grid>

        {capturedImage && (
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                width: "100%",
                height: "400px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#f0f0f0",
                overflow: "hidden",
              }}
            >
              <img
                src={capturedImage}
                alt="Ảnh chụp từ camera"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            </Paper>
          </Grid>
        )}
      </Grid>

      <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
        * Nếu camera không hoạt động, hãy kiểm tra cài đặt quyền trong trình
        duyệt và đảm bảo không có ứng dụng nào khác đang sử dụng camera.
      </Typography>

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Lỗi thường gặp và cách khắc phục:
        </Typography>
        <ul>
          <li>
            <strong>NotAllowedError:</strong> Bạn cần cấp quyền truy cập camera
            trong trình duyệt
          </li>
          <li>
            <strong>NotReadableError/TrackStartError:</strong> Camera đang được
            sử dụng bởi ứng dụng khác
          </li>
          <li>
            <strong>OverconstrainedError:</strong> Không có camera nào đáp ứng
            yêu cầu (thử với cài đặt đơn giản hơn)
          </li>
          <li>
            <strong>Không thấy feed video:</strong> Thử làm mới trang, tắt các
            phần mở rộng của trình duyệt, hoặc sử dụng trình duyệt khác
          </li>
        </ul>
      </Paper>
    </Box>
  );
};

export default CameraTestPage;
