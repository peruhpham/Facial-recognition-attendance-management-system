import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createAbsenceRequestByStudent,
  getMyAbsenceRequests,
  updateMyAbsenceRequest,
  cancelMyAbsenceRequest,
  getAllAbsenceRequestsForReview,
  updateAbsenceRequestStatusByReviewer,
} from "../../services/absenceRequestService";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// Hàm lấy token từ localStorage
const getToken = () => localStorage.getItem("token");

// Async Thunks cho Sinh viên
export const fetchMyAbsenceRequests = createAsyncThunk(
  "absenceRequests/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMyAbsenceRequests();
      return response.data; // Giả sử API trả về { success: true, count, data: [...] }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Could not fetch your absence requests"
      );
    }
  }
);

export const studentCreateAbsenceRequest = createAsyncThunk(
  "absenceRequests/createByStudent",
  async (requestData, { dispatch, rejectWithValue }) => {
    try {
      const response = await createAbsenceRequestByStudent(requestData);
      dispatch(fetchMyAbsenceRequests()); // Tải lại danh sách sau khi tạo thành công
      // Hoặc có thể thêm vào state trực tiếp nếu API trả về đơn đã tạo
      // dispatch(addAbsenceRequest(response.data.data));
      return response.data; // { success: true, data: newRequest, message }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create absence request"
      );
    }
  }
);

export const studentUpdateAbsenceRequest = createAsyncThunk(
  "absenceRequests/updateByStudent",
  async ({ requestId, updateData }, { dispatch, rejectWithValue }) => {
    try {
      console.log("Thunk: Starting update request with:", {
        requestId,
        updateData,
      });
      const response = await updateMyAbsenceRequest(requestId, updateData);
      console.log("Thunk: Update response:", response);

      if (!response.data.success) {
        console.error("Thunk: Server returned error:", response.data);
        return rejectWithValue(
          response.data.message || "Lỗi cập nhật từ server"
        );
      }

      dispatch(fetchMyAbsenceRequests());
      return response.data;
    } catch (error) {
      console.error("Thunk: Update request failed:", error);
      // Xử lý các loại lỗi khác nhau
      if (error.response) {
        // Server trả về response với status code ngoài range 2xx
        console.error("Thunk: Server error response:", error.response.data);
        return rejectWithValue(
          error.response.data?.message || "Lỗi server khi cập nhật đơn"
        );
      } else if (error.request) {
        // Request được gửi nhưng không nhận được response
        console.error("Thunk: No response received:", error.request);
        return rejectWithValue("Không nhận được phản hồi từ server");
      } else {
        // Lỗi khi setting up request
        console.error("Thunk: Request setup error:", error.message);
        return rejectWithValue("Lỗi khi gửi yêu cầu cập nhật");
      }
    }
  }
);

export const studentCancelAbsenceRequest = createAsyncThunk(
  "absenceRequests/cancelByStudent",
  async (requestId, { dispatch, rejectWithValue }) => {
    try {
      await cancelMyAbsenceRequest(requestId);
      // Xóa item khỏi state thay vì fetch lại
      // dispatch(removeAbsenceRequestFromList(requestId));
      // Hoặc đơn giản là fetch lại
      dispatch(fetchMyAbsenceRequests());
      return requestId; // Trả về ID để reducer có thể xóa
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to cancel absence request"
      );
    }
  }
);

// Async Thunks cho Admin/Teacher (ví dụ, bạn có thể tách ra slice riêng nếu cần)
export const fetchAllAbsenceRequestsForReview = createAsyncThunk(
  "absenceRequests/fetchAllForReview",
  async (params, { rejectWithValue }) => {
    try {
      const response = await getAllAbsenceRequestsForReview(params);
      return response.data; // { success, count, total, totalPages, currentPage, data }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Could not fetch absence requests for review"
      );
    }
  }
);

export const reviewerUpdateRequestStatus = createAsyncThunk(
  "absenceRequest/reviewerUpdateStatus",
  async ({ requestId, statusData }, { rejectWithValue }) => {
    try {
      const response = await updateAbsenceRequestStatusByReviewer(
        requestId,
        statusData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

export const fetchAbsenceRequestsBySession = createAsyncThunk(
  "absenceRequest/fetchBySession",
  async (sessionId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/absence-requests/session/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

const initialState = {
  // State cho sinh viên
  myRequests: {
    items: [],
    loading: false,
    error: null,
    count: 0,
  },
  // State cho admin/teacher review
  reviewRequests: {
    items: [],
    loading: false,
    error: null,
    count: 0,
    total: 0,
    totalPages: 0,
    currentPage: 1,
    params: null, // Lưu lại params filter hiện tại để fetch lại
  },
  // Trạng thái cho các hành động CUD (Create, Update, Delete)
  // Để hiển thị thông báo, loading spinners cho từng hành động
  creating: false,
  createError: null,
  updating: false,
  updateError: null,
  cancelling: false,
  cancelError: null,
  statusUpdating: false, // Cho việc duyệt đơn
  statusUpdateError: null,
};

const absenceRequestSlice = createSlice({
  name: "absenceRequests",
  initialState,
  reducers: {
    // Reducers đồng bộ nếu cần, ví dụ:
    // clearMyRequests: (state) => {
    //   state.myRequests.items = [];
    //   state.myRequests.count = 0;
    // },
    // updateAbsenceRequestInList: (state, action) => {
    //   const index = state.myRequests.items.findIndex(req => req._id === action.payload._id);
    //   if (index !== -1) state.myRequests.items[index] = action.payload;
    // },
    // removeAbsenceRequestFromList: (state, action) => {
    //    state.myRequests.items = state.myRequests.items.filter(req => req._id !== action.payload);
    //    state.myRequests.count = state.myRequests.items.length;
    // }
  },
  extraReducers: (builder) => {
    builder
      // Fetch My Requests (Student)
      .addCase(fetchMyAbsenceRequests.pending, (state) => {
        state.myRequests.loading = true;
        state.myRequests.error = null;
      })
      .addCase(fetchMyAbsenceRequests.fulfilled, (state, action) => {
        state.myRequests.loading = false;
        state.myRequests.items = action.payload.data;
        state.myRequests.count = action.payload.count;
      })
      .addCase(fetchMyAbsenceRequests.rejected, (state, action) => {
        state.myRequests.loading = false;
        state.myRequests.error = action.payload;
      })

      // Create Absence Request (Student)
      .addCase(studentCreateAbsenceRequest.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(studentCreateAbsenceRequest.fulfilled, (state) => {
        // data đã được fetch lại bởi thunk
        state.creating = false;
      })
      .addCase(studentCreateAbsenceRequest.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })

      // Update My Absence Request (Student)
      .addCase(studentUpdateAbsenceRequest.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(studentUpdateAbsenceRequest.fulfilled, (state) => {
        // data đã được fetch lại bởi thunk
        state.updating = false;
      })
      .addCase(studentUpdateAbsenceRequest.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      })

      // Cancel My Absence Request (Student)
      .addCase(studentCancelAbsenceRequest.pending, (state) => {
        state.cancelling = true;
        state.cancelError = null;
      })
      .addCase(studentCancelAbsenceRequest.fulfilled, (state, action) => {
        // data đã được fetch lại bởi thunk
        state.cancelling = false;
        // Nếu không fetch lại mà xóa trực tiếp:
        // state.myRequests.items = state.myRequests.items.filter(req => req._id !== action.payload);
        // state.myRequests.count = state.myRequests.items.length;
      })
      .addCase(studentCancelAbsenceRequest.rejected, (state, action) => {
        state.cancelling = false;
        state.cancelError = action.payload;
      })

      // Fetch All Requests (Admin/Teacher Review)
      .addCase(fetchAllAbsenceRequestsForReview.pending, (state) => {
        state.reviewRequests.loading = true;
        state.reviewRequests.error = null;
      })
      .addCase(fetchAllAbsenceRequestsForReview.fulfilled, (state, action) => {
        state.reviewRequests.loading = false;
        state.reviewRequests.items = action.payload.data;
        state.reviewRequests.count = action.payload.count;
        state.reviewRequests.total = action.payload.total;
        state.reviewRequests.totalPages = action.payload.totalPages;
        state.reviewRequests.currentPage = action.payload.currentPage;
        state.reviewRequests.params = action.meta.arg; // Lưu lại params đã dùng để fetch
      })
      .addCase(fetchAllAbsenceRequestsForReview.rejected, (state, action) => {
        state.reviewRequests.loading = false;
        state.reviewRequests.error = action.payload;
      })

      // Update Request Status (Reviewer)
      .addCase(reviewerUpdateRequestStatus.pending, (state) => {
        state.statusUpdating = true;
        state.statusUpdateError = null;
      })
      .addCase(reviewerUpdateRequestStatus.fulfilled, (state) => {
        // data đã được fetch lại bởi thunk
        state.statusUpdating = false;
      })
      .addCase(reviewerUpdateRequestStatus.rejected, (state, action) => {
        state.statusUpdating = false;
        state.statusUpdateError = action.payload;
      })

      // Fetch Absence Requests by Session
      .addCase(fetchAbsenceRequestsBySession.pending, (state) => {
        state.reviewRequests.loading = true;
        state.reviewRequests.error = null;
      })
      .addCase(fetchAbsenceRequestsBySession.fulfilled, (state, action) => {
        state.reviewRequests.loading = false;
        state.reviewRequests.items = action.payload.data;
        state.reviewRequests.count = action.payload.count;
        state.reviewRequests.total = action.payload.total;
        state.reviewRequests.totalPages = action.payload.totalPages;
        state.reviewRequests.currentPage = action.payload.currentPage;
        state.reviewRequests.params = action.meta.arg; // Lưu lại params đã dùng để fetch
      })
      .addCase(fetchAbsenceRequestsBySession.rejected, (state, action) => {
        state.reviewRequests.loading = false;
        state.reviewRequests.error = action.payload;
      });
  },
});

// export const { clearMyRequests, updateAbsenceRequestInList, removeAbsenceRequestFromList } = absenceRequestSlice.actions;
export default absenceRequestSlice.reducer;
