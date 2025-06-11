import * as faceapi from "face-api.js";

// Biến để kiểm tra mô hình đã tải chưa
let modelsLoaded = false;

/**
 * Tải các mô hình face-api.js
 * @param {string} modelsUrl - Đường dẫn đến thư mục chứa mô hình
 * @returns {Promise<boolean>} - True nếu tải thành công
 */
export const loadFaceDetectionModels = async (modelsUrl = "/models") => {
  if (modelsLoaded) return true;

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelsUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelsUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelsUrl),
    ]);

    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Lỗi khi tải mô hình face-api.js:", error);
    return false;
  }
};

/**
 * Kiểm tra video đã sẵn sàng để phát hiện khuôn mặt chưa
 * @param {React.RefObject} videoRef - Tham chiếu đến element video
 * @returns {boolean} - True nếu video đã sẵn sàng
 */
export const isVideoReady = (videoRef) => {
  if (!videoRef?.current) return false;

  const { videoWidth, videoHeight, readyState } = videoRef.current;

  // readyState >= 2 nghĩa là video đã có đủ dữ liệu để phát
  return videoWidth && videoHeight && readyState >= 2;
};

/**
 * Phát hiện một khuôn mặt trong video một cách an toàn
 * @param {React.RefObject} videoRef - Tham chiếu đến element video
 * @param {Object} options - Tùy chọn cho việc phát hiện
 * @returns {Promise<FaceDetection|null>} - Kết quả phát hiện hoặc null nếu không phát hiện được
 */
export const detectSingleFace = async (videoRef, options = {}) => {
  // Kiểm tra mô hình đã tải chưa
  if (!modelsLoaded) {
    console.warn("Mô hình face-api.js chưa được tải");
    return null;
  }

  // Kiểm tra video đã sẵn sàng chưa
  if (!isVideoReady(videoRef)) {
    console.warn("Video chưa sẵn sàng cho face detection");
    return null;
  }

  try {
    // Sử dụng minConfidence cao hơn để tránh phát hiện nhầm
    const detectionOptions = new faceapi.TinyFaceDetectorOptions({
      minConfidence: options.minConfidence || 0.5,
    });

    const detection = await faceapi
      .detectSingleFace(videoRef.current, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    // Kiểm tra kết quả có hợp lệ không
    if (!detection || !detection.detection || !detection.detection.box) {
      return null;
    }

    // Kiểm tra box có giá trị null không
    const { x, y, width, height } = detection.detection.box;
    if (x === null || y === null || width === null || height === null) {
      console.warn("Phát hiện khuôn mặt có box không hợp lệ");
      return null;
    }

    return detection;
  } catch (error) {
    console.error("Lỗi khi phát hiện khuôn mặt:", error);
    return null;
  }
};

/**
 * Phát hiện nhiều khuôn mặt trong video một cách an toàn
 * @param {React.RefObject} videoRef - Tham chiếu đến element video
 * @param {Object} options - Tùy chọn cho việc phát hiện
 * @returns {Promise<FaceDetection[]|null>} - Kết quả phát hiện hoặc mảng rỗng
 */
export const detectAllFaces = async (videoRef, options = {}) => {
  // Kiểm tra mô hình đã tải chưa
  if (!modelsLoaded) {
    console.warn("Mô hình face-api.js chưa được tải");
    return [];
  }

  // Kiểm tra video đã sẵn sàng chưa
  if (!isVideoReady(videoRef)) {
    console.warn("Video chưa sẵn sàng cho face detection");
    return [];
  }

  try {
    const detectionOptions = new faceapi.TinyFaceDetectorOptions({
      minConfidence: options.minConfidence || 0.5,
    });

    const detections = await faceapi
      .detectAllFaces(videoRef.current, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    // Lọc kết quả không hợp lệ
    return detections.filter((detection) => {
      if (!detection || !detection.detection || !detection.detection.box) {
        return false;
      }

      const { x, y, width, height } = detection.detection.box;
      return x !== null && y !== null && width !== null && height !== null;
    });
  } catch (error) {
    console.error("Lỗi khi phát hiện khuôn mặt:", error);
    return [];
  }
};

/**
 * So sánh mô tả khuôn mặt với danh sách người dùng đã biết
 * @param {Float32Array} descriptor - Mô tả khuôn mặt
 * @param {Array} knownUsers - Danh sách người dùng với mô tả khuôn mặt
 * @param {number} threshold - Ngưỡng so sánh (tăng từ 0.6 lên 0.65 để giảm false positive)
 * @returns {Object|null} - Người dùng được nhận diện hoặc null
 */
export const findBestMatch = (descriptor, knownUsers, threshold = 0.65) => {
  if (!descriptor || !knownUsers || knownUsers.length === 0) {
    return null;
  }

  try {
    let bestMatch = null;
    let bestDistance = threshold;

    for (const user of knownUsers) {
      if (
        !user.faceFeatures?.descriptors ||
        user.faceFeatures.descriptors.length === 0
      ) {
        continue;
      }

      // So sánh với tất cả các mô tả của người dùng
      for (const knownDescriptor of user.faceFeatures.descriptors) {
        // Chuyển đổi mảng thành Float32Array nếu cần
        const typedKnownDescriptor = new Float32Array(knownDescriptor);
        const distance = faceapi.euclideanDistance(
          descriptor,
          typedKnownDescriptor
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = user;
        }
      }
    }

    return bestMatch;
  } catch (error) {
    console.error("Lỗi khi so sánh khuôn mặt:", error);
    return null;
  }
};
