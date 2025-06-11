import * as faceapi from "face-api.js";

let isModelsLoaded = false;

/**
 * Tải các model face-api.js
 * @returns {Promise<boolean>}
 */
export const loadModels = async () => {
  if (isModelsLoaded) {
    return true;
  }

  try {
    const MODEL_URL = "/models";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    isModelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Error loading models:", error);
    throw error;
  }
};

/**
 * Kiểm tra tính hợp lệ của một bounding box
 * @param {Object} box - Box object từ face-api.js
 * @returns {boolean} - Hợp lệ hay không
 */
const isValidBox = (box) => {
  if (!box) return false;

  const { x, y, width, height } = box;
  return (
    x !== null &&
    y !== null &&
    width !== null &&
    height !== null &&
    !isNaN(x) &&
    !isNaN(y) &&
    !isNaN(width) &&
    !isNaN(height) &&
    width > 0 &&
    height > 0
  );
};

/**
 * Phát hiện khuôn mặt từ hình ảnh
 * @param {string} imageData - Base64 image data
 * @returns {Promise<Object>} - Kết quả phát hiện khuôn mặt
 */
export const detectFace = async (imageData) => {
  if (!isModelsLoaded) {
    await loadModels();
  }

  try {
    const img = await createImage(imageData);

    const detectionOptions = new faceapi.TinyFaceDetectorOptions({
      minConfidence: 0.5,
    });

    const detections = await faceapi
      .detectSingleFace(img, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    // Kiểm tra kết quả phát hiện
    if (!detections || !detections.detection) {
      console.warn("Không phát hiện được khuôn mặt");
      return null;
    }

    // Kiểm tra tính hợp lệ của box với validation mạnh hơn
    const box = detections.detection.box;
    if (!box || !isValidBox(box)) {
      console.warn("Phát hiện khuôn mặt với box không hợp lệ:", box);
      return null;
    }

    // Kiểm tra tính hợp lệ của landmarks
    if (!detections.landmarks || !detections.landmarks.positions) {
      console.warn("Không có landmarks hợp lệ");
      return null;
    }

    // Kiểm tra tính hợp lệ của descriptor
    if (
      !detections.descriptor ||
      !(detections.descriptor instanceof Float32Array) ||
      detections.descriptor.length === 0
    ) {
      console.warn("Không có descriptor hợp lệ");
      return null;
    }

    // Validate descriptor values are not all zeros or NaN
    const hasValidValues = Array.from(detections.descriptor).some(
      (val) => !isNaN(val) && val !== 0
    );

    if (!hasValidValues) {
      console.warn("Descriptor chứa toàn giá trị không hợp lệ");
      return null;
    }

    return detections;
  } catch (error) {
    console.error("Error detecting face:", error);

    // Enhanced error handling - don't throw, return null gracefully
    if (error.message && error.message.includes("Box.constructor")) {
      console.warn(
        "Bounding box constructor error - returning null gracefully"
      );
      return null;
    }

    // For other errors, still return null but log more details
    console.warn("Face detection failed with error:", error.message);
    return null;
  }
};

/**
 * Tạo đối tượng Image từ base64 data
 * @param {string} imageData - Base64 image data
 * @returns {Promise<HTMLImageElement>} - Đối tượng Image
 */
const createImage = async (imageData) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = imageData;
  });
};

/**
 * Tính toán khoảng cách Euclid giữa các đặc trưng khuôn mặt
 * @param {Float32Array} descriptor1 - Đặc trưng khuôn mặt 1
 * @param {Float32Array} descriptor2 - Đặc trưng khuôn mặt 2
 * @returns {number} - Khoảng cách (0-1, càng nhỏ càng giống nhau)
 */
export const getFaceDistance = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return 1.0; // Khoảng cách lớn nhất nếu không có dữ liệu

  try {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
  } catch (error) {
    console.error("Lỗi khi tính khoảng cách:", error);
    return 1.0;
  }
};

/**
 * Kiểm tra xem khuôn mặt có phải là cùng một người không
 * @param {Float32Array} descriptor1 - Đặc trưng khuôn mặt 1
 * @param {Float32Array} descriptor2 - Đặc trưng khuôn mặt 2
 * @param {number} threshold - Ngưỡng để xác định là cùng một người (tăng từ 0.6 lên 0.65)
 * @returns {boolean} - Có phải cùng một người không
 */
export const isSameFace = (descriptor1, descriptor2, threshold = 0.65) => {
  if (!descriptor1 || !descriptor2) return false;

  try {
    const distance = getFaceDistance(descriptor1, descriptor2);
    return distance < threshold;
  } catch (error) {
    console.error("Lỗi khi so sánh khuôn mặt:", error);
    return false;
  }
};

/**
 * Tính toán độ tương tự cosine giữa hai vectors
 * @param {Float32Array} vector1 - Vector thứ nhất
 * @param {Float32Array} vector2 - Vector thứ hai
 * @returns {number} - Độ tương tự cosine (0-1, càng gần 1 càng giống)
 */
export const getCosineSimilarity = (vector1, vector2) => {
  if (!vector1 || !vector2 || vector1.length !== vector2.length) {
    return 0;
  }

  try {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  } catch (error) {
    console.error("Lỗi khi tính cosine similarity:", error);
    return 0;
  }
};

/**
 * Tính confidence nâng cao sử dụng cả Euclidean distance và Cosine similarity
 * @param {Float32Array} descriptor1 - Đặc trưng khuôn mặt 1
 * @param {Float32Array} descriptor2 - Đặc trưng khuôn mặt 2
 * @returns {number} - Confidence score (0-1)
 */
export const getAdvancedConfidence = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return 0;

  try {
    // Tính Euclidean distance (0-1, càng nhỏ càng giống)
    const euclideanDistance = getFaceDistance(descriptor1, descriptor2);
    const euclideanConfidence = Math.max(0, 1 - euclideanDistance);

    // Tính Cosine similarity (0-1, càng lớn càng giống)
    const cosineSimilarity = getCosineSimilarity(descriptor1, descriptor2);

    // Weighted average: 60% cosine, 40% euclidean
    const advancedConfidence =
      cosineSimilarity * 0.6 + euclideanConfidence * 0.4;

    return Math.min(1, Math.max(0, advancedConfidence));
  } catch (error) {
    console.error("Lỗi khi tính advanced confidence:", error);
    return 0;
  }
};
