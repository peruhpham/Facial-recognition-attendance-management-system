import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// Thunks
export const saveFaceFeatures = createAsyncThunk(
  "faceRecognition/saveFaceFeatures",
  async ({ userId, faceDescriptors }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.post(
        `${API_URL}/face-recognition/save-features`,
        { userId, faceDescriptors },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể lưu đặc trưng khuôn mặt"
      );
    }
  }
);

export const getClassFaceFeatures = createAsyncThunk(
  "faceRecognition/getClassFaceFeatures",
  async (classId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      const response = await axios.get(
        `${API_URL}/face-recognition/class-features/${classId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("[DEBUG] API error in redux slice:", error);
      return rejectWithValue(
        error.response?.data?.message ||
          "Không thể lấy dữ liệu khuôn mặt của lớp"
      );
    }
  }
);

export const verifyAttendance = createAsyncThunk(
  "faceRecognition/verifyAttendance",
  async (
    { sessionId, studentId, faceDescriptor, confidence, imageBase64 },
    { getState, rejectWithValue }
  ) => {
    try {
      const { token } = getState().auth;

      const response = await axios.post(
        `${API_URL}/face-recognition/verify-attendance`,
        {
          sessionId,
          studentId,
          faceDescriptor,
          confidence: confidence || 0,
          imageBase64,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể xác nhận điểm danh"
      );
    }
  }
);

export const manualAttendance = createAsyncThunk(
  "faceRecognition/manualAttendance",
  async (
    {
      sessionId,
      studentId,
      status,
      note,
      recognized,
      imageBase64,
      confidence,
      absence_request_id,
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const { token } = getState().auth;

      const payload = {
        student_id: studentId,
        status,
        note,
        absence_request_id,
      };

      if (recognized !== undefined) payload.recognized = recognized;
      if (imageBase64) payload.imageBase64 = imageBase64;
      if (confidence !== undefined) payload.confidence = confidence;

      const response = await axios.post(
        `${API_URL}/attendance/logs/${sessionId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể điểm danh thủ công"
      );
    }
  }
);

// Initial state
const initialState = {
  isModelLoaded: false,
  isCameraReady: false,
  detectedFaces: [],
  recognizedStudents: [],
  classStudents: [],
  isProcessing: false,
  error: null,
  lastAttendanceResult: null,
};

// Slice
const faceRecognitionSlice = createSlice({
  name: "faceRecognition",
  initialState,
  reducers: {
    setModelLoaded: (state, action) => {
      state.isModelLoaded = action.payload;
    },
    setCameraReady: (state, action) => {
      state.isCameraReady = action.payload;
    },
    setDetectedFaces: (state, action) => {
      state.detectedFaces = action.payload;
    },
    setRecognizedStudents: (state, action) => {
      state.recognizedStudents = action.payload;
    },
    clearRecognitionState: (state) => {
      state.detectedFaces = [];
      state.recognizedStudents = [];
      state.lastAttendanceResult = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Save Face Features
      .addCase(saveFaceFeatures.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(saveFaceFeatures.fulfilled, (state) => {
        state.isProcessing = false;
      })
      .addCase(saveFaceFeatures.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload;
      })

      // Get Class Face Features
      .addCase(getClassFaceFeatures.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(getClassFaceFeatures.fulfilled, (state, action) => {
        state.isProcessing = false;
        if (Array.isArray(action.payload)) {
          state.classStudents = action.payload;
        } else if (
          action.payload &&
          action.payload.data &&
          Array.isArray(action.payload.data)
        ) {
          state.classStudents = action.payload.data;
        } else if (
          action.payload &&
          action.payload.students &&
          Array.isArray(action.payload.students)
        ) {
          state.classStudents = action.payload.students;
        } else {
          console.error(
            "[DEBUG] Cấu trúc dữ liệu API không phù hợp:",
            action.payload
          );
          state.classStudents = [];
        }
      })
      .addCase(getClassFaceFeatures.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload;
      })

      // Verify Attendance
      .addCase(verifyAttendance.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(verifyAttendance.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.lastAttendanceResult = action.payload.data;
      })
      .addCase(verifyAttendance.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload;
      })

      // Manual Attendance
      .addCase(manualAttendance.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(manualAttendance.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.lastAttendanceResult = action.payload.data;
      })
      .addCase(manualAttendance.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload;
      });
  },
});

export const {
  setModelLoaded,
  setCameraReady,
  setDetectedFaces,
  setRecognizedStudents,
  clearRecognitionState,
  clearError,
} = faceRecognitionSlice.actions;

export default faceRecognitionSlice.reducer;
