import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../utils/axios";

// Hàm thay thế isValidObjectId từ mongoose
const isValidObjectId = (id) => {
  // Kiểm tra xem id có phải là chuỗi hex 24 ký tự hay không
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Thunks cho Campus
export const fetchCampuses = createAsyncThunk(
  "facility/fetchCampuses",
  async ({ page = 1, limit = 10, search = "" }, { rejectWithValue }) => {
    try {
      let url = `facilities/campuses?page=${page}&limit=${limit}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể lấy danh sách cơ sở"
      );
    }
  }
);

export const fetchAllCampuses = createAsyncThunk(
  "facility/fetchAllCampuses",
  async ({ page = 1, limit = 100, search = "" } = {}, { rejectWithValue }) => {
    try {
      // Thay đổi từ /facilities/campuses/all thành /facilities/campuses với tham số limit cao
      let url = `facilities/campuses?limit=${limit}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error("API error:", error);
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể lấy danh sách cơ sở"
      );
    }
  }
);

export const createCampus = createAsyncThunk(
  "facility/createCampus",
  async (campusPayload, { rejectWithValue }) => {
    try {
      const { name, code, imageFile, removeCurrentImage } = campusPayload;

      if (!name || !code) {
        return rejectWithValue("Tên và mã cơ sở là bắt buộc");
      }

      const formData = new FormData();
      for (const key in campusPayload) {
        if (Object.prototype.hasOwnProperty.call(campusPayload, key)) {
          if (key !== "imageFile" && key !== "removeCurrentImage") {
            if (
              campusPayload[key] !== undefined &&
              campusPayload[key] !== null
            ) {
              formData.append(key, campusPayload[key]);
            }
          }
        }
      }

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      if (removeCurrentImage === true) {
        formData.append("remove_image", "true");
      }

      const response = await axiosInstance.post(
        `facilities/campuses`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể tạo cơ sở mới"
      );
    }
  }
);

export const updateCampus = createAsyncThunk(
  "facility/updateCampus",
  async (campusPayload, { rejectWithValue }) => {
    try {
      const { id, name, code, imageFile, removeCurrentImage } = campusPayload;

      if (!id) {
        return rejectWithValue("ID cơ sở là bắt buộc để cập nhật");
      }
      if (!name || !code) {
        return rejectWithValue("Tên và mã cơ sở là bắt buộc khi cập nhật");
      }

      const formData = new FormData();
      for (const key in campusPayload) {
        if (Object.prototype.hasOwnProperty.call(campusPayload, key)) {
          if (
            key !== "id" &&
            key !== "imageFile" &&
            key !== "removeCurrentImage"
          ) {
            if (
              campusPayload[key] !== undefined &&
              campusPayload[key] !== null
            ) {
              formData.append(key, campusPayload[key]);
            }
          }
        }
      }

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      if (removeCurrentImage === true) {
        formData.append("remove_image", "true");
      }

      const response = await axiosInstance.put(
        `facilities/campuses/${id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể cập nhật cơ sở"
      );
    }
  }
);

export const deleteCampus = createAsyncThunk(
  "facility/deleteCampus",
  async (campusId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`facilities/campuses/${campusId}`);
      return campusId;
    } catch (error) {
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể xóa cơ sở"
      );
    }
  }
);

// Thunks cho Building
export const fetchBuildings = createAsyncThunk(
  "facility/fetchBuildings",
  async (
    { page = 1, limit = 10, search = "", campus_id = "" },
    { rejectWithValue }
  ) => {
    try {
      let url = `facilities/buildings?page=${page}&limit=${limit}`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (campus_id) {
        url += `&campus_id=${campus_id}`;
      }

      const response = await axiosInstance.get(url);

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue("Token không hợp lệ hoặc đã hết hạn");
      }
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải danh sách tòa nhà"
      );
    }
  }
);

export const createBuilding = createAsyncThunk(
  "facility/createBuilding",
  async (buildingPayload, { rejectWithValue }) => {
    try {
      const { name, code, campus_id, facilities, imageFile } = buildingPayload;

      if (!name || !code) {
        return rejectWithValue("Tên và mã tòa nhà không được để trống");
      }
      if (campus_id && !isValidObjectId(campus_id)) {
        return rejectWithValue("ID cơ sở không hợp lệ");
      }

      const formData = new FormData();
      for (const key in buildingPayload) {
        if (Object.prototype.hasOwnProperty.call(buildingPayload, key)) {
          if (key !== "imageFile" && key !== "removeCurrentImage") {
            if (
              buildingPayload[key] !== undefined &&
              buildingPayload[key] !== null
            ) {
              if (key === "facilities" && Array.isArray(buildingPayload[key])) {
                buildingPayload[key].forEach((facility) => {
                  formData.append("facilities", facility);
                });
              } else {
                formData.append(key, buildingPayload[key]);
              }
            }
          }
        }
      }

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      const response = await axiosInstance.post(
        `facilities/buildings`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.data?.message === "jwt expired"
      ) {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể tạo tòa nhà mới"
      );
    }
  }
);

export const updateBuilding = createAsyncThunk(
  "facility/updateBuilding",
  async (buildingPayload, { rejectWithValue }) => {
    try {
      const {
        id,
        name,
        code,
        campus_id,
        facilities,
        imageFile,
        removeCurrentImage,
      } = buildingPayload;

      if (!id) {
        return rejectWithValue("ID của tòa nhà là bắt buộc");
      }
      if (!name || !code) {
        return rejectWithValue("Tên và mã tòa nhà là các trường bắt buộc");
      }
      if (campus_id && !isValidObjectId(campus_id)) {
        return rejectWithValue("ID cơ sở không hợp lệ");
      }

      const formData = new FormData();
      for (const key in buildingPayload) {
        if (Object.prototype.hasOwnProperty.call(buildingPayload, key)) {
          if (
            key !== "id" &&
            key !== "imageFile" &&
            key !== "removeCurrentImage"
          ) {
            if (
              buildingPayload[key] !== undefined &&
              buildingPayload[key] !== null
            ) {
              if (key === "facilities" && Array.isArray(buildingPayload[key])) {
                if (buildingPayload[key].length === 0) {
                  formData.append("facilities", "");
                } else {
                  buildingPayload[key].forEach((facility) => {
                    formData.append("facilities", facility);
                  });
                }
              } else {
                formData.append(key, buildingPayload[key]);
              }
            }
          }
        }
      }

      if (imageFile) {
        formData.append("imageFile", imageFile);
      } else if (removeCurrentImage) {
        formData.append("remove_image", "true");
      }

      const response = await axiosInstance.put(
        `facilities/buildings/${id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.data?.message === "jwt expired"
      ) {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể cập nhật tòa nhà"
      );
    }
  }
);

export const deleteBuilding = createAsyncThunk(
  "facility/deleteBuilding",
  async (id, { rejectWithValue }) => {
    try {
      if (!id) {
        return rejectWithValue("ID của tòa nhà là bắt buộc");
      }

      const response = await axiosInstance.delete(`facilities/buildings/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue("Token không hợp lệ hoặc đã hết hạn");
      }
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể xóa tòa nhà"
      );
    }
  }
);

// Thunks cho Room
export const fetchRooms = createAsyncThunk(
  "facility/fetchRooms",
  async (
    { page = 1, limit = 10, search = "", building_id = "" },
    { rejectWithValue }
  ) => {
    try {
      let url = `facilities/rooms?page=${page}&limit=${limit}`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (building_id) {
        url += `&building_id=${encodeURIComponent(building_id)}`;
      }

      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue("Token không hợp lệ hoặc đã hết hạn");
      }
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải danh sách phòng"
      );
    }
  }
);

export const createRoom = createAsyncThunk(
  "facility/createRoom",
  async (roomPayload, { rejectWithValue }) => {
    try {
      const { room_number, building_id, imageFile, equipment } = roomPayload;

      if (!room_number || !building_id) {
        return rejectWithValue("Số phòng và ID tòa nhà là các trường bắt buộc");
      }
      if (building_id && !isValidObjectId(building_id)) {
        return rejectWithValue("ID tòa nhà không hợp lệ");
      }

      const formData = new FormData();
      for (const key in roomPayload) {
        if (Object.prototype.hasOwnProperty.call(roomPayload, key)) {
          if (key !== "imageFile" && key !== "removeCurrentImage") {
            if (roomPayload[key] !== undefined && roomPayload[key] !== null) {
              if (key === "equipment" && Array.isArray(roomPayload[key])) {
                formData.append("equipment", JSON.stringify(roomPayload[key]));
              } else {
                formData.append(key, roomPayload[key]);
              }
            }
          }
        }
      }

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      const response = await axiosInstance.post(`facilities/rooms`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.data?.message === "jwt expired"
      ) {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể tạo phòng mới"
      );
    }
  }
);

export const updateRoom = createAsyncThunk(
  "facility/updateRoom",
  async (roomPayload, { rejectWithValue }) => {
    try {
      const {
        id,
        room_number,
        building_id,
        imageFile,
        removeCurrentImage,
        equipment,
      } = roomPayload;

      if (!id) {
        return rejectWithValue("ID phòng là bắt buộc");
      }
      if (!room_number) {
        return rejectWithValue("Số phòng là bắt buộc");
      }
      if (building_id && !isValidObjectId(building_id)) {
        return rejectWithValue("ID tòa nhà không hợp lệ");
      }

      const formData = new FormData();
      for (const key in roomPayload) {
        if (Object.prototype.hasOwnProperty.call(roomPayload, key)) {
          if (
            key !== "id" &&
            key !== "imageFile" &&
            key !== "removeCurrentImage"
          ) {
            if (roomPayload[key] !== undefined && roomPayload[key] !== null) {
              if (key === "equipment" && Array.isArray(roomPayload[key])) {
                formData.append("equipment", JSON.stringify(roomPayload[key]));
              } else {
                formData.append(key, roomPayload[key]);
              }
            }
          }
        }
      }

      if (imageFile) {
        formData.append("imageFile", imageFile);
      } else if (removeCurrentImage) {
        formData.append("remove_image", "true");
      }

      const response = await axiosInstance.put(
        `facilities/rooms/${id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.data?.message === "jwt expired"
      ) {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể cập nhật phòng"
      );
    }
  }
);

export const deleteRoom = createAsyncThunk(
  "facility/deleteRoom",
  async (id, { rejectWithValue }) => {
    if (!id) {
      return rejectWithValue("ID của phòng là bắt buộc");
    }

    try {
      const response = await axiosInstance.delete(`facilities/rooms/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue("Token không hợp lệ hoặc đã hết hạn");
      }
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể xóa phòng"
      );
    }
  }
);

// Thunks cho Room Schedules
export const fetchRoomSchedules = createAsyncThunk(
  "facility/fetchRoomSchedules",
  async (
    { page = 1, limit = 10, search = "", room_id = "" },
    { rejectWithValue }
  ) => {
    try {
      let url = `facilities/room-schedules?page=${page}&limit=${limit}`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (room_id) {
        url += `&room_id=${room_id}`;
      }

      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return rejectWithValue("Token không hợp lệ hoặc đã hết hạn");
      }
      if (error.response?.data?.message === "jwt expired") {
        return rejectWithValue("jwt expired");
      }
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải lịch sử dụng phòng"
      );
    }
  }
);

// Initial state
const initialState = {
  campuses: [],
  buildings: [],
  rooms: [],
  roomSchedules: {
    items: [],
    totalItems: 0,
    hasMore: false,
  },
  selectedCampus: null,
  selectedBuilding: null,
  selectedRoom: null,
  isLoading: false,
  error: null,
  campusPagination: {
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
  },
  buildingPagination: {
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
  },
  roomPagination: {
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0,
  },
};

// Slice
const facilitySlice = createSlice({
  name: "facility",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedCampus: (state, action) => {
      state.selectedCampus = action.payload;
    },
    setSelectedBuilding: (state, action) => {
      state.selectedBuilding = action.payload;
    },
    setSelectedRoom: (state, action) => {
      state.selectedRoom = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Campus reducers
      .addCase(fetchCampuses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCampuses.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data) {
          state.campuses = action.payload.data;
        }
        state.campusPagination = {
          totalCount: action.payload?.totalItems || 0,
          currentPage: action.payload?.currentPage || 1,
          totalPages: action.payload?.totalPages || 1,
        };
      })
      .addCase(fetchCampuses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Đã xảy ra lỗi khi tải danh sách cơ sở";
      })
      .addCase(fetchAllCampuses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllCampuses.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data) {
          state.campuses = action.payload.data;
        } else if (Array.isArray(action.payload)) {
          state.campuses = action.payload;
        }
      })
      .addCase(fetchAllCampuses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        console.error("fetchAllCampuses.rejected", action.payload);
      })
      .addCase(createCampus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCampus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data) {
          state.campuses = [action.payload.data, ...state.campuses];
        }
      })
      .addCase(createCampus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Đã xảy ra lỗi khi tạo cơ sở mới";
      })
      .addCase(updateCampus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCampus.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedCampus = action.payload.data;
        state.campuses = state.campuses.map((campus) =>
          campus._id === updatedCampus._id ? updatedCampus : campus
        );
      })
      .addCase(updateCampus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Đã xảy ra lỗi khi cập nhật cơ sở";
      })
      .addCase(deleteCampus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCampus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.campuses = state.campuses.filter(
          (campus) => campus._id !== action.payload
        );
      })
      .addCase(deleteCampus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Đã xảy ra lỗi khi xóa cơ sở";
      })

      // Fetch All Buildings
      .addCase(fetchBuildings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBuildings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.buildings = action.payload.data;
        state.buildingPagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 10,
          totalPages: action.payload.totalPages || 1,
          totalCount: action.payload.totalCount || 0,
        };
      })
      .addCase(fetchBuildings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create Building
      .addCase(createBuilding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBuilding.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data) {
          state.buildings = [action.payload.data, ...state.buildings];
        }
        state.buildingPagination.totalCount += 1;
      })
      .addCase(createBuilding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Building
      .addCase(updateBuilding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBuilding.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedBuilding = action.payload.data;
        state.buildings = state.buildings.map((building) =>
          building._id === updatedBuilding._id ? updatedBuilding : building
        );
      })
      .addCase(updateBuilding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Delete Building
      .addCase(deleteBuilding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBuilding.fulfilled, (state, action) => {
        state.isLoading = false;
        state.buildings = state.buildings.filter(
          (building) => building._id !== action.payload.id
        );
        state.buildingPagination.totalCount -= 1;
      })
      .addCase(deleteBuilding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch All Rooms
      .addCase(fetchRooms.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms = action.payload.data;
        state.roomPagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 10,
          totalPages: action.payload.totalPages || 1,
          totalCount: action.payload.totalCount || 0,
        };
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create Room
      .addCase(createRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.data) {
          state.rooms = [action.payload.data, ...state.rooms];
        }
        state.roomPagination.totalCount += 1;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Room
      .addCase(updateRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedRoom = action.payload.data;
        state.rooms = state.rooms.map((room) =>
          room._id === updatedRoom._id ? updatedRoom : room
        );
      })
      .addCase(updateRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Delete Room
      .addCase(deleteRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms = state.rooms.filter(
          (room) => room._id !== action.payload.id
        );
        state.roomPagination.totalCount -= 1;
      })
      .addCase(deleteRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch Room Schedules
      .addCase(fetchRoomSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoomSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roomSchedules.items = action.payload.data;
        state.roomSchedules.totalItems = action.payload.total;
        state.roomSchedules.hasMore = action.payload.hasMore;
      })
      .addCase(fetchRoomSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedCampus,
  setSelectedBuilding,
  setSelectedRoom,
} = facilitySlice.actions;

export default facilitySlice.reducer;
