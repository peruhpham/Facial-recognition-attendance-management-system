import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../utils/axios";

// Thunks
export const fetchAllUsers = createAsyncThunk(
  "admin/fetchAllUsers",
  async (
    { page = 1, limit = 10, search = "", role = "", status = "" },
    { getState, rejectWithValue }
  ) => {
    try {
      // Lấy danh sách người dùng
      const usersResponse = await axiosInstance.get(
        `/users?page=${page}&limit=${limit}&search=${search}${
          role ? `&role=${role}` : ""
        }${status ? `&status=${status}` : ""}`
      );

      // Lấy thống kê người dùng
      const statsResponse = await axiosInstance.get("/users/stats");

      // Kết hợp kết quả
      return {
        ...usersResponse.data,
        ...statsResponse.data, // Thêm dữ liệu thống kê từ API stats
      };
    } catch (error) {
      console.error("fetchAllUsers error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể lấy danh sách người dùng"
      );
    }
  }
);

export const approveUser = createAsyncThunk(
  "admin/approveUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/users/${userId}/approve`, {});
      return { userId, data: response.data };
    } catch (error) {
      console.error("approveUser error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể phê duyệt người dùng"
      );
    }
  }
);

export const rejectUser = createAsyncThunk(
  "admin/rejectUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/users/${userId}/reject`, {});
      return { userId, data: response.data };
    } catch (error) {
      console.error("rejectUser error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể từ chối người dùng"
      );
    }
  }
);

export const updateUserRole = createAsyncThunk(
  "admin/updateUserRole",
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/users/${userId}/role`, {
        role,
      });
      return { userId, role, data: response.data };
    } catch (error) {
      console.error("updateUserRole error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể cập nhật vai trò người dùng"
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  "admin/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/users/${userId}`);
      return userId;
    } catch (error) {
      console.error("deleteUser error:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể xóa người dùng"
      );
    }
  }
);

// Initial state
const initialState = {
  users: [],
  userStats: {
    totalUsers: 0,
    students: 0,
    teachers: 0,
    pendingTeachers: 0,
    pendingStudents: 0,
  },
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
  },
};

// Slice
const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAdminState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Users
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload.data;

        // Cập nhật đúng thống kê từ response
        state.userStats = {
          totalUsers: action.payload.totalUsers || 0,
          totalApprovedUsers: action.payload.totalApprovedUsers || 0,
          students: action.payload.students || 0,
          approvedStudents: action.payload.approvedStudents || 0,
          teachers: action.payload.teachers || 0,
          approvedTeachers: action.payload.approvedTeachers || 0,
          pendingTeachers: action.payload.pendingTeachers || 0,
          pendingStudents: action.payload.pendingStudents || 0,
        };

        state.pagination = {
          page: action.payload.currentPage || 1,
          limit: action.payload.limit || 10,
          totalPages: action.payload.totalPages || 1,
          totalCount: action.payload.total || 0,
        };
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Approve User
      .addCase(approveUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(approveUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? { ...user, status: "approved" }
            : user
        );
        // Cập nhật thống kê
        if (
          state.users.find((u) => u._id === action.payload.userId)?.role ===
          "teacher"
        ) {
          state.userStats.pendingTeachers -= 1;
        } else {
          state.userStats.pendingStudents -= 1;
        }
      })
      .addCase(approveUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Reject User
      .addCase(rejectUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? { ...user, status: "rejected" }
            : user
        );
        // Cập nhật thống kê
        if (
          state.users.find((u) => u._id === action.payload.userId)?.role ===
          "teacher"
        ) {
          state.userStats.pendingTeachers -= 1;
        } else {
          state.userStats.pendingStudents -= 1;
        }
      })
      .addCase(rejectUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update User Role
      .addCase(updateUserRole.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.map((user) =>
          user._id === action.payload.userId
            ? { ...user, role: action.payload.role }
            : user
        );
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.filter((user) => user._id !== action.payload);
        state.userStats.totalUsers -= 1;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetAdminState } = adminSlice.actions;

export default adminSlice.reducer;
