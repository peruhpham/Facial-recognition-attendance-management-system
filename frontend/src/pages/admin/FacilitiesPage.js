import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Card,
  Chip,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Container,
  Avatar,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Search,
  Refresh,
  Room,
  Domain,
  ArrowBack,
  LocationOn,
  CloudUpload,
  DeleteForever as DeleteForeverIcon,
  PhotoCamera,
} from "@mui/icons-material";
import {
  fetchBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  fetchRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  fetchAllCampuses,
  createCampus,
  updateCampus,
  deleteCampus,
  setSelectedCampus,
  setSelectedBuilding,
} from "../../redux/slices/facilitySlice";
import { toast } from "react-hot-toast";
import axiosInstance from "../../utils/axios";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
];

// Các giá trị mặc định cho form
const defaultCampusFormData = {
  _id: "",
  name: "",
  code: "",
  address: "",
  status: "active",
  description: "",
  image_url: "",
  imageFile: null,
  removeCurrentImage: false,
};

const defaultBuildingFormData = {
  _id: "",
  name: "",
  code: "",
  campus_id: "",
  floors_count: 1,
  year_built: new Date().getFullYear(),
  status: "active",
  facilities: [],
  image_url: "",
  imageFile: null,
  removeCurrentImage: false,
};

const defaultRoomFormData = {
  _id: "",
  room_number: "",
  building_id: "",
  floor: "1",
  capacity: "0",
  room_type: "lecture",
  status: "available",
  equipment: [],
  image_url: "",
  imageFile: null,
  removeCurrentImage: false,
};

// Danh sách tiện ích có sẵn
const availableEquipment = [
  { id: "projector", label: "Máy chiếu" },
  { id: "air_conditioner", label: "Máy lạnh" },
  { id: "computer", label: "Máy tính" },
  { id: "tv", label: "TV" },
  { id: "sound_system", label: "Hệ thống âm thanh" },
  { id: "whiteboard", label: "Bảng trắng" },
  { id: "wifi", label: "WiFi" },
];

// Room types và status hợp lệ
const roomTypes = [
  { value: "lecture", label: "Phòng học" },
  { value: "lab", label: "Phòng thực hành" },
  { value: "office", label: "Phòng làm việc" },
  { value: "meeting", label: "Phòng họp" },
];

const roomStatuses = [
  { value: "available", label: "Hoạt động" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "unavailable", label: "Không hoạt động" },
];

// Danh sách tiện ích tòa nhà
const buildingFacilities = [
  { id: "elevator", label: "Thang máy" },
  { id: "parking", label: "Bãi đỗ xe" },
  { id: "security", label: "Bảo vệ 24/7" },
  { id: "cafeteria", label: "Căn tin" },
  { id: "disabled_access", label: "Lối đi cho người khuyết tật" },
  { id: "wifi", label: "WiFi" },
  { id: "backup_power", label: "Nguồn điện dự phòng" },
];

const FacilitiesPage = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  // Lấy trạng thái từ Redux
  const {
    campuses,
    buildings,
    rooms,
    selectedCampus,
    selectedBuilding,
    isLoading,
    buildingPagination,
    roomPagination,
  } = useSelector((state) => state.facility);

  // States cho tabs
  const [tabValue, setTabValue] = useState(0);

  // State cho form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quản lý cơ sở (Campuses)
  const [localCampusList, setLocalCampusList] = useState([]);
  const [campusSearchTerm, setCampusSearchTerm] = useState("");
  const [campusPage, setCampusPage] = useState(0);
  const [campusRowsPerPage, setCampusRowsPerPage] = useState(10);

  // Quản lý tòa nhà (Buildings)
  const [buildingSearchTerm, setBuildingSearchTerm] = useState("");
  const [buildingPage, setBuildingPage] = useState(0);
  const [buildingRowsPerPage, setBuildingRowsPerPage] = useState(10);

  // Quản lý phòng học (Rooms)
  const [roomSearchTerm, setRoomSearchTerm] = useState("");
  const [roomPage, setRoomPage] = useState(0);
  const [roomRowsPerPage, setRoomRowsPerPage] = useState(10);

  // States cho dialogs cơ sở
  const [campusDialogOpen, setCampusDialogOpen] = useState(false);
  const [campusDialogMode, setCampusDialogMode] = useState("add");
  const [campusFormData, setCampusFormData] = useState(defaultCampusFormData);
  const [campusImagePreview, setCampusImagePreview] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [campusFileError, setCampusFileError] = useState(""); // Thêm state lỗi file campus

  // States cho dialogs tòa nhà
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);
  const [buildingDialogMode, setBuildingDialogMode] = useState("add");
  const [buildingFormData, setBuildingFormData] = useState(
    defaultBuildingFormData
  );
  const [buildingImagePreview, setBuildingImagePreview] = useState(null);
  const [buildingFileError, setBuildingFileError] = useState(""); // Thêm state lỗi file building

  // States cho dialogs phòng học
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomDialogMode, setRoomDialogMode] = useState("add");
  const [roomFormData, setRoomFormData] = useState(defaultRoomFormData);
  const [roomImagePreview, setRoomImagePreview] = useState(null);
  const [roomFileError, setRoomFileError] = useState(""); // Thêm state lỗi file room

  // States cho dialogs xóa
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogType, setDeleteDialogType] = useState("building");
  const [itemToDelete, setItemToDelete] = useState(null);

  // States cho dialog xem ảnh
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [currentImageAlt, setCurrentImageAlt] = useState("");

  // Selectors cho dữ liệu từ Redux store
  const campusesData = useMemo(() => {
    if (!campuses) return [];
    return Array.isArray(campuses) ? campuses : campuses.data || [];
  }, [campuses]);

  const totalCampusItems = useMemo(() => {
    if (!campuses) return 0;
    return campuses.total || campuses.length || 0;
  }, [campuses]);

  // Fetch data khi component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await dispatch(fetchAllCampuses({}));
        await fetchCampusList();
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Fetch campuses từ API khi tìm kiếm
  useEffect(() => {
    if (campusSearchTerm !== undefined) {
      const delaySearch = setTimeout(() => {
        dispatch(
          fetchAllCampuses({
            limit: 100,
            search: campusSearchTerm,
          })
        );
      }, 500);

      return () => clearTimeout(delaySearch);
    }
  }, [dispatch, campusSearchTerm]);

  // Load dữ liệu campus
  const loadCampuses = useCallback(() => {
    dispatch(
      fetchAllCampuses({
        page: 1,
        limit: 100,
        search: campusSearchTerm,
      })
    );
  }, [dispatch, campusSearchTerm]);

  // Fetch buildings với phân trang và tìm kiếm
  const loadBuildings = useCallback(() => {
    const params = {
      page: buildingPage + 1,
      limit: buildingRowsPerPage,
    };

    if (buildingSearchTerm) {
      params.search = buildingSearchTerm;
    }

    if (selectedCampus?._id) {
      params.campus_id = selectedCampus._id;
    }

    dispatch(fetchBuildings(params));
  }, [
    dispatch,
    buildingPage,
    buildingRowsPerPage,
    buildingSearchTerm,
    selectedCampus,
  ]);

  // Fetch rooms với phân trang và tìm kiếm
  const loadRooms = useCallback(() => {
    const params = {
      page: roomPage + 1,
      limit: roomRowsPerPage,
    };

    if (roomSearchTerm) {
      params.search = roomSearchTerm;
    }

    if (selectedBuilding?._id) {
      params.building_id = selectedBuilding._id;
    }

    dispatch(fetchRooms(params));
  }, [dispatch, roomPage, roomRowsPerPage, roomSearchTerm, selectedBuilding]);

  // Chạy loadBuildings khi tham số thay đổi
  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  // Chạy loadRooms khi tham số thay đổi
  useEffect(() => {
    if (selectedBuilding) {
      loadRooms();
    }
  }, [loadRooms, selectedBuilding]);

  // Fetch danh sách campuses cho dropdown
  const fetchCampusList = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        "/facilities/campuses?limit=100"
      );
      setLocalCampusList(response.data.data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách cơ sở:", error);
      toast.error("Không thể tải danh sách cơ sở cho dropdown");
    }
  }, []);

  // Chạy fetchCampusList khi component mount
  useEffect(() => {
    fetchCampusList();
  }, [fetchCampusList]);

  // Hàm mở dialog xem ảnh
  const handleOpenImagePreview = (imageUrl, altText) => {
    setCurrentImageUrl(imageUrl);
    setCurrentImageAlt(altText);
    setImagePreviewOpen(true);
  };

  // Hàm đóng dialog xem ảnh
  const handleCloseImagePreview = () => {
    setImagePreviewOpen(false);
    setCurrentImageUrl("");
    setCurrentImageAlt("");
  };

  // Handlers cho tabs
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Tải dữ liệu theo tab
    if (newValue === 0) {
      loadCampuses();
    } else if (newValue === 1) {
      loadBuildings();
    } else if (newValue === 2) {
      loadRooms();
    }
  };

  // Xử lý tìm kiếm campus
  const handleCampusSearchChange = (e) => {
    setCampusSearchTerm(e.target.value);
    // Debounce search
    clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      dispatch(
        fetchAllCampuses({
          page: 1,
          limit: 100,
          search: e.target.value,
        })
      );
    }, 500);
    setSearchTimeout(timeout);
  };

  // Xử lý thay đổi trang cho campus
  const handleCampusChangePage = (event, newPage) => {
    setCampusPage(newPage);
  };

  // Xử lý thay đổi số lượng hàng cho campus
  const handleCampusChangeRowsPerPage = (event) => {
    setCampusRowsPerPage(parseInt(event.target.value, 10));
    setCampusPage(0);
  };

  // Handlers cho phân trang tòa nhà
  const handleBuildingChangePage = (event, newPage) => {
    setBuildingPage(newPage);
  };

  const handleBuildingChangeRowsPerPage = (event) => {
    setBuildingRowsPerPage(parseInt(event.target.value, 10));
    setBuildingPage(0);
  };

  // Handlers cho phân trang phòng học
  const handleRoomChangePage = (event, newPage) => {
    setRoomPage(newPage);
  };

  const handleRoomChangeRowsPerPage = (event) => {
    setRoomRowsPerPage(parseInt(event.target.value, 10));
    setRoomPage(0);
  };

  // Mở dialog campus (thêm hoặc sửa)
  const handleCampusDialogOpen = (mode, campus = null) => {
    setCampusDialogMode(mode);
    if (mode === "edit" && campus) {
      setCampusFormData({
        ...defaultCampusFormData,
        _id: campus._id,
        name: campus.name,
        code: campus.code,
        address: campus.address || "",
        description: campus.description || "",
        status: campus.status || "active",
        image_url: campus.image_url || "",
        imageFile: null,
        removeCurrentImage: false,
      });
      if (campus.image_url) {
        setCampusImagePreview(campus.image_url);
      } else {
        setCampusImagePreview(null);
      }
    } else {
      setCampusFormData(defaultCampusFormData);
      setCampusImagePreview(null);
    }
    setCampusDialogOpen(true);
  };

  // Đóng dialog campus
  const handleCampusDialogClose = () => {
    setCampusDialogOpen(false);
    setCampusFormData(defaultCampusFormData);
    setCampusImagePreview(null);
  };

  // Xử lý khi thay đổi form campus
  const handleCampusFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCampusFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Xử lý chọn file ảnh campus
  const handleCampusImageChange = (e) => {
    // toast.info("Đang xử lý file ảnh campus..."); // Bỏ dòng toast.info
    setCampusFileError(""); // Reset lỗi mỗi khi chọn file mới
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Kiểm tra kích thước file
      if (file.size > MAX_FILE_SIZE) {
        setCampusFileError(
          `Kích thước file không được vượt quá ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`
        );
        e.target.value = null;
        return;
      }

      // Kiểm tra loại file
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setCampusFileError(
          "Định dạng file không hợp lệ. Chỉ chấp nhận: " +
            ALLOWED_FILE_TYPES.map((type) => type.split("/")[1]).join(", ") +
            "."
        );
        e.target.value = null;
        return;
      }

      setCampusFormData((prev) => ({
        ...prev,
        imageFile: file,
        image_url: "", // Xóa image_url cũ nếu có
        removeCurrentImage: false, // Nếu chọn file mới thì không xóa ảnh hiện tại (nếu là edit)
      }));
      setCampusImagePreview(URL.createObjectURL(file));
    } else {
      // Trường hợp người dùng hủy chọn file (trong một số trình duyệt)
      // hoặc nếu logic trước đó cho phép imageFile là null và muốn giữ ảnh từ image_url
      if (campusFormData.imageFile && !e.target.files[0]) {
        // Nếu trước đó có file và giờ không có
        // Không làm gì cả nếu người dùng chỉ đóng dialog chọn file mà không chọn gì
        // Nếu muốn xóa file đã chọn trước đó khi người dùng bấm cancel, thì thêm logic ở đây
      }
      // Nếu không có file nào được chọn và trước đó cũng không có imageFile,
      // và có campusFormData.image_url (đang edit), thì giữ nguyên preview của image_url
      // Tuy nhiên, logic này có thể đã được xử lý bởi việc không set imageFile thành null ở trên
    }
  };

  // Xử lý xóa ảnh campus hiện tại (khi edit)
  const handleRemoveCampusImage = () => {
    setCampusFormData((prev) => ({
      ...prev,
      imageFile: null,
      image_url: "",
      removeCurrentImage: true,
    }));
    setCampusImagePreview(null);
  };

  // Xử lý submit form campus
  const handleCampusFormSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: campusFormData.name.trim(),
        code: campusFormData.code.trim(),
        address: campusFormData.address?.trim() || "",
        description: campusFormData.description?.trim() || "",
        status: campusFormData.status || "active",
        imageFile: campusFormData.imageFile,
        removeCurrentImage: campusFormData.removeCurrentImage,
      };

      // Kiểm tra và thêm location nếu có.
      // Giả sử campusFormData có thể chứa location_latitude và location_longitude
      // Bạn cần đảm bảo các trường này được quản lý trong campusFormData nếu muốn sử dụng
      if (
        campusFormData.location_latitude &&
        campusFormData.location_longitude
      ) {
        payload.location = JSON.stringify({
          latitude: campusFormData.location_latitude,
          longitude: campusFormData.location_longitude,
        });
      }

      if (campusDialogMode === "add") {
        await dispatch(createCampus(payload)).unwrap();
        toast.success("Đã thêm cơ sở thành công");
      } else {
        payload.id = campusFormData._id;
        await dispatch(updateCampus(payload)).unwrap();
        toast.success("Đã cập nhật cơ sở thành công");
      }

      handleCampusDialogClose();
      setTimeout(() => {
        dispatch(fetchAllCampuses({ limit: 100 }));
        fetchCampusList();
      }, 300);
    } catch (error) {
      console.error("Lỗi khi xử lý form cơ sở:", error);
      toast.error(error?.message || "Đã có lỗi xảy ra khi xử lý cơ sở");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xóa campus
  const handleDeleteCampus = (campusId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa cơ sở này không?")) {
      dispatch(deleteCampus(campusId))
        .unwrap()
        .then(() => {
          toast.success("Đã xóa cơ sở thành công");
          dispatch(fetchAllCampuses()); // Refresh list
        })
        .catch((error) => {
          console.error("Lỗi khi xóa cơ sở:", error);
          toast.error(error?.message || "Đã có lỗi xảy ra khi xóa cơ sở");
        });
    }
  };

  // Handlers cho bật/tắt building dialog
  const handleBuildingDialogOpen = (mode, building = null) => {
    setBuildingDialogMode(mode);
    if (mode === "edit" && building) {
      setBuildingFormData({
        ...defaultBuildingFormData,
        _id: building._id,
        name: building.name,
        code: building.code,
        campus_id: building.campus_id?._id || building.campus_id || "",
        floors_count: building.floors_count || 1,
        year_built: building.year_built || new Date().getFullYear(),
        status: building.status || "active",
        facilities: building.facilities || [],
        image_url: building.image_url || "",
        imageFile: null,
        removeCurrentImage: false,
      });
      if (building.image_url) {
        setBuildingImagePreview(building.image_url);
      } else {
        setBuildingImagePreview(null);
      }
    } else {
      setBuildingFormData({
        ...defaultBuildingFormData,
        campus_id: selectedCampus?._id || "",
        imageFile: null,
        removeCurrentImage: false,
      });
      setBuildingImagePreview(null);
    }
    setBuildingDialogOpen(true);
  };

  const handleCloseBuildingDialog = () => {
    setBuildingDialogOpen(false);
    setBuildingFormData(defaultBuildingFormData);
    setBuildingImagePreview(null);
  };

  // Handler cho building form change
  const handleBuildingFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "facilities") {
      setBuildingFormData((prev) => ({
        ...prev,
        facilities: typeof value === "string" ? value.split(",") : value,
      }));
    } else {
      setBuildingFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Handler cho chọn file ảnh building
  const handleBuildingImageChange = (e) => {
    // toast.info("Đang xử lý file ảnh tòa nhà..."); // Bỏ toast.info
    setBuildingFileError(""); // Reset lỗi
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_FILE_SIZE) {
        setBuildingFileError(
          `Kích thước file không được vượt quá ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`
        );
        e.target.value = null;
        return;
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setBuildingFileError(
          "Định dạng file không hợp lệ. Chỉ chấp nhận: " +
            ALLOWED_FILE_TYPES.map((type) => type.split("/")[1]).join(", ") +
            "."
        );
        e.target.value = null;
        return;
      }

      setBuildingFormData((prev) => ({
        ...prev,
        imageFile: file,
        image_url: "",
        removeCurrentImage: false,
      }));
      setBuildingImagePreview(URL.createObjectURL(file));
    } else {
      if (buildingFormData.imageFile && !e.target.files[0]) {
        // Giữ nguyên nếu người dùng hủy chọn file, không clear file đã chọn trước đó
      }
    }
  };

  // Handler cho xóa ảnh building hiện tại
  const handleRemoveBuildingImage = () => {
    setBuildingFormData((prev) => ({
      ...prev,
      imageFile: null,
      image_url: "",
      removeCurrentImage: true,
    }));
    setBuildingImagePreview(null);
  };

  // Handler cho submit building form
  const handleBuildingFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!buildingFormData.name.trim() || !buildingFormData.code.trim()) {
      toast.error("Vui lòng nhập đầy đủ tên và mã tòa nhà");
      setIsSubmitting(false);
      return;
    }
    if (!buildingFormData.campus_id) {
      toast.error("Vui lòng chọn cơ sở cho tòa nhà");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: buildingFormData.name.trim(),
        code: buildingFormData.code.trim(),
        campus_id: buildingFormData.campus_id,
        floors_count: Number(buildingFormData.floors_count),
        year_built: Number(buildingFormData.year_built),
        status: buildingFormData.status,
        // Đảm bảo facilities là một mảng các chuỗi (IDs)
        facilities: Array.isArray(buildingFormData.facilities)
          ? buildingFormData.facilities.map(String)
          : [],
        imageFile: buildingFormData.imageFile,
        removeCurrentImage: buildingFormData.removeCurrentImage,
      };
      console.log("Building form data to submit:", buildingFormData);
      console.log("Payload for create/update building:", payload);

      if (buildingDialogMode === "add") {
        await dispatch(createBuilding(payload)).unwrap();
        toast.success("Thêm tòa nhà thành công");
      } else {
        payload.id = buildingFormData._id;
        await dispatch(updateBuilding(payload)).unwrap();
        toast.success("Cập nhật tòa nhà thành công");
      }

      handleCloseBuildingDialog();
      setTimeout(() => {
        loadBuildings();
      }, 300);
    } catch (error) {
      console.error("Lỗi khi xử lý form tòa nhà:", error);
      toast.error(
        error?.message || "Có lỗi xảy ra khi xử lý thông tin tòa nhà"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers cho bật/tắt room dialog
  const handleRoomDialogOpen = (mode, room = null) => {
    setRoomDialogMode(mode);
    if (mode === "edit" && room) {
      setRoomFormData({
        ...defaultRoomFormData,
        _id: room._id || "",
        room_number: room.room_number || "",
        building_id: room.building_id?._id || room.building_id || "",
        floor: room.floor ? String(room.floor) : "1",
        capacity: room.capacity ? String(room.capacity) : "0",
        room_type: room.room_type || "lecture",
        status: room.status || "available",
        equipment: room.equipment
          ? Array.isArray(room.equipment)
            ? room.equipment.map((eq) =>
                typeof eq === "string" ? eq : eq.name || eq.id
              )
            : []
          : [],
        image_url: room.image_url || "",
        imageFile: null,
        removeCurrentImage: false,
      });
      if (room.image_url) {
        setRoomImagePreview(room.image_url);
      } else {
        setRoomImagePreview(null);
      }
    } else {
      setRoomFormData({
        ...defaultRoomFormData,
        building_id: selectedBuilding?._id || "",
        imageFile: null,
        removeCurrentImage: false,
      });
      setRoomImagePreview(null);
    }
    setRoomDialogOpen(true);
  };

  const handleCloseRoomDialog = () => {
    setRoomDialogOpen(false);
    setRoomFormData(defaultRoomFormData);
    setRoomImagePreview(null);
  };

  // Handler cho room form change
  const handleRoomFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoomFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handler cho chọn file ảnh room
  const handleRoomImageChange = (e) => {
    // toast.info("Đang xử lý file ảnh phòng..."); // Đảm bảo dòng này đã được xóa hoặc comment
    setRoomFileError(""); // Reset lỗi mỗi khi chọn file mới
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Kiểm tra kích thước file
      if (file.size > MAX_FILE_SIZE) {
        setRoomFileError(
          // Sử dụng setState thay vì toast
          `Kích thước file không được vượt quá ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`
        );
        e.target.value = null;
        return;
      }

      // Kiểm tra loại file
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setRoomFileError(
          // Sử dụng setState thay vì toast
          "Định dạng file không hợp lệ. Chỉ chấp nhận: " +
            ALLOWED_FILE_TYPES.map((type) => type.split("/")[1]).join(", ") +
            "."
        );
        e.target.value = null;
        return;
      }

      setRoomFormData((prev) => ({
        ...prev,
        imageFile: file,
        image_url: "",
        removeCurrentImage: false,
      }));
      setRoomImagePreview(URL.createObjectURL(file));
    } else {
      if (roomFormData.imageFile && !e.target.files[0]) {
        // Giữ nguyên nếu người dùng hủy chọn file
      }
    }
  };

  // Handler cho xóa ảnh room hiện tại
  const handleRemoveRoomImage = () => {
    setRoomFormData((prev) => ({
      ...prev,
      imageFile: null,
      image_url: "",
      removeCurrentImage: true,
    }));
    setRoomImagePreview(null);
  };

  // Handler cho submit room form
  const handleRoomFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!roomFormData.room_number.trim()) {
      toast.error("Vui lòng nhập đầy đủ số phòng");
      setIsSubmitting(false);
      return;
    }
    if (!roomFormData.building_id) {
      toast.error("Vui lòng chọn tòa nhà cho phòng học");
      setIsSubmitting(false);
      return;
    }

    try {
      const processedEquipment = (roomFormData.equipment || []).map((eqId) => ({
        name: eqId, // eqId ở đây là string, ví dụ "projector"
        quantity: 1, // Mặc định quantity là 1
        status: "working", // Mặc định status là "working"
      }));

      const payload = {
        room_number: roomFormData.room_number.trim(),
        building_id: roomFormData.building_id,
        floor: Number(roomFormData.floor),
        capacity: Number(roomFormData.capacity),
        room_type: roomFormData.room_type,
        status: roomFormData.status,
        equipment: processedEquipment, // Sử dụng equipment đã xử lý
        area: roomFormData.area ? Number(roomFormData.area) : undefined,
        imageFile: roomFormData.imageFile,
        removeCurrentImage: roomFormData.removeCurrentImage,
      };

      console.log("Room form data to submit:", roomFormData);
      console.log("Payload for create/update room:", payload);

      if (roomDialogMode === "add") {
        await dispatch(createRoom(payload)).unwrap();
        toast.success("Thêm phòng học thành công");
      } else {
        payload.id = roomFormData._id;
        await dispatch(updateRoom(payload)).unwrap();
        toast.success("Cập nhật phòng học thành công");
      }

      handleCloseRoomDialog();
      setTimeout(() => {
        loadRooms();
      }, 300);
    } catch (error) {
      console.error("Lỗi khi xử lý form phòng học:", error);
      toast.error(
        error?.message || "Có lỗi xảy ra khi xử lý thông tin phòng học"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers cho xóa
  const openDeleteDialog = (type, item) => {
    setDeleteDialogType(type);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    setIsSubmitting(true);
    try {
      if (deleteDialogType === "campus" && itemToDelete) {
        await dispatch(deleteCampus(itemToDelete._id)).unwrap();
        enqueueSnackbar("Xóa cơ sở thành công", { variant: "success" });
        loadCampuses();
      } else if (deleteDialogType === "building" && itemToDelete) {
        await dispatch(deleteBuilding(itemToDelete._id)).unwrap();
        enqueueSnackbar("Xóa tòa nhà thành công", { variant: "success" });
        loadBuildings();
      } else if (deleteDialogType === "room" && itemToDelete) {
        await dispatch(deleteRoom(itemToDelete._id)).unwrap();
        enqueueSnackbar("Xóa phòng học thành công", { variant: "success" });
        loadRooms();
      }
    } catch (error) {
      enqueueSnackbar(
        error.message || `Không thể xóa ${deleteDialogType}. Vui lòng thử lại.`,
        { variant: "error" }
      );
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Handler cho việc chọn cơ sở
  const handleSelectCampus = (campus) => {
    dispatch(setSelectedCampus(campus));

    // Tải danh sách tòa nhà của cơ sở đã chọn
    const params = {
      page: 1,
      limit: buildingRowsPerPage,
      search: buildingSearchTerm,
      campus_id: campus._id,
    };

    dispatch(fetchBuildings(params));
    setTabValue(1); // Chuyển sang tab tòa nhà
  };

  // Handler cho việc chọn tòa nhà
  const handleSelectBuilding = (building) => {
    dispatch(setSelectedBuilding(building));

    // Tải danh sách phòng của tòa nhà đã chọn
    const params = {
      page: 1,
      limit: roomRowsPerPage,
      search: roomSearchTerm,
      building_id: building._id,
    };

    dispatch(fetchRooms(params));
    setTabValue(2); // Chuyển sang tab phòng học
  };

  const handleBackToCampuses = () => {
    dispatch(setSelectedCampus(null));
    setBuildingSearchTerm("");
    setBuildingPage(0);
  };

  // Thêm handler quay lại tòa nhà từ phòng học
  const handleBackToBuildings = () => {
    dispatch(setSelectedBuilding(null));
    setRoomSearchTerm("");
    setRoomPage(0);
  };

  // Thêm hàm xử lý building
  const handleBuildingSearch = () => {
    loadBuildings();
  };

  // Thêm hàm xử lý room
  const handleRoomSearch = () => {
    loadRooms();
  };

  const handleEditCampus = (campus) => {
    setCampusFormData({
      _id: campus._id,
      code: campus.code,
      name: campus.name,
      address: campus.address || "",
      status: campus.status,
    });
    setCampusDialogMode("edit");
    setCampusDialogOpen(true);
  };

  // Hàm để chuyển đổi room_type thành văn bản hiển thị
  const getRoomTypeLabel = (type) => {
    const roomType = roomTypes.find((rt) => rt.value === type);
    return roomType ? roomType.label : type;
  };

  // Hàm để chuyển đổi status thành văn bản hiển thị
  const getRoomStatusLabel = (status) => {
    const roomStatus = roomStatuses.find((rs) => rs.value === status);
    return roomStatus ? roomStatus.label : status;
  };

  // Hàm để lấy màu sắc dựa trên status
  const getRoomStatusColor = (status) => {
    switch (status) {
      case "available":
        return "success";
      case "maintenance":
        return "warning";
      case "unavailable":
        return "error";
      default:
        return "default";
    }
  };

  // Render tùy theo tab đang chọn
  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return renderCampusesTab();
      case 1:
        return renderBuildingsTab();
      case 2:
        return renderRoomsTab();
      default:
        return renderCampusesTab();
    }
  };

  // Render tab cơ sở
  const renderCampusesTab = () => {
    // Đảm bảo hiển thị dữ liệu mới nhất
    const displayedCampuses = campusesData || [];

    return (
      <Box sx={{ mt: 2 }}>
        {/* Thanh công cụ */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TextField
            label="Tìm kiếm cơ sở"
            variant="outlined"
            size="small"
            value={campusSearchTerm}
            onChange={handleCampusSearchChange}
            sx={{ width: "300px" }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => dispatch(fetchAllCampuses({}))}
              sx={{ mr: 1 }}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleCampusDialogOpen("add")}
            >
              Thêm cơ sở
            </Button>
          </Box>
        </Box>

        {/* Bảng cơ sở */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Mã</TableCell>
                  <TableCell>Tên cơ sở</TableCell>
                  <TableCell>Địa chỉ</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="center">Ảnh</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : displayedCampuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCampuses.map((campus, index) => (
                    <TableRow key={campus._id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{campus.code}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            "&:hover": { color: "primary.main" },
                          }}
                          onClick={() => handleSelectCampus(campus)}
                        >
                          <LocationOn sx={{ mr: 1, fontSize: 20 }} />
                          {campus.name}
                        </Box>
                      </TableCell>
                      <TableCell>{campus.address || "N/A"}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            campus.status === "active"
                              ? "Hoạt động"
                              : campus.status === "maintenance"
                              ? "Bảo trì"
                              : "Không hoạt động"
                          }
                          color={
                            campus.status === "active"
                              ? "success"
                              : campus.status === "maintenance"
                              ? "warning"
                              : "error"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {campus.image_url ? (
                          <Tooltip title="Xem ảnh">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleOpenImagePreview(
                                  campus.image_url,
                                  `Ảnh cơ sở ${campus.name}`
                                )
                              }
                            >
                              <PhotoCamera />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditCampus(campus)}
                          title="Chỉnh sửa"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCampus(campus._id)}
                          title="Xóa"
                          sx={{ color: "error.main" }}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCampusItems}
            page={campusPage}
            onPageChange={handleCampusChangePage}
            rowsPerPage={campusRowsPerPage}
            onRowsPerPageChange={handleCampusChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Số hàng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} của ${count}`
            }
          />
        </Card>
      </Box>
    );
  };

  // Render tab tòa nhà
  const renderBuildingsTab = () => (
    <Box>
      {selectedCampus && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBackToCampuses}
            sx={{ mb: 2 }}
          >
            Quay lại danh sách cơ sở
          </Button>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selectedCampus.name} ({selectedCampus.code})
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Địa chỉ: {selectedCampus.address}
            </Typography>
            {selectedCampus.description && (
              <Typography variant="body2" color="textSecondary">
                Mô tả: {selectedCampus.description}
              </Typography>
            )}
          </Paper>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
            <TextField
              label="Tìm kiếm tòa nhà"
              variant="outlined"
              size="small"
              fullWidth
              value={buildingSearchTerm}
              onChange={(e) => {
                setBuildingSearchTerm(e.target.value);
                if (e.target.value.trim() === "") {
                  handleBuildingSearch();
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleBuildingSearch}
              startIcon={<Search />}
            >
              Tìm
            </Button>
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadBuildings}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleBuildingDialogOpen("add")}
              sx={{ ml: 2 }}
            >
              Thêm tòa nhà
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Tên tòa nhà</TableCell>
              <TableCell>Mã</TableCell>
              <TableCell>Cơ sở</TableCell>
              <TableCell align="center">Số tầng</TableCell>
              <TableCell>Tiện ích</TableCell>
              <TableCell align="center">Ảnh</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && buildings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : buildings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không tìm thấy tòa nhà nào
                </TableCell>
              </TableRow>
            ) : (
              buildings.map((building) => (
                <TableRow key={building._id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Domain sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="body1">{building.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{building.code}</TableCell>
                  <TableCell>
                    {building.campus_id?.name || "Không có thông tin"}
                  </TableCell>
                  <TableCell align="center">{building.floors_count}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {building.facilities && building.facilities.length > 0 ? (
                        building.facilities.map((facilityId) => {
                          const facility = buildingFacilities.find(
                            (f) => f.id === facilityId
                          );
                          return facility ? (
                            <Chip
                              key={facilityId}
                              label={facility.label}
                              size="small"
                              variant="outlined"
                            />
                          ) : null;
                        })
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Không có
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {building.image_url ? (
                      <Tooltip title="Xem ảnh">
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleOpenImagePreview(
                              building.image_url,
                              `Ảnh tòa nhà ${building.name}`
                            )
                          }
                        >
                          <PhotoCamera />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end">
                      <Tooltip title="Xem phòng học">
                        <IconButton
                          color="primary"
                          onClick={() => handleSelectBuilding(building)}
                        >
                          <Room />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sửa tòa nhà">
                        <IconButton
                          color="primary"
                          onClick={() => {
                            dispatch(setSelectedBuilding(building));
                            handleBuildingDialogOpen("edit", building);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa tòa nhà">
                        <IconButton
                          color="error"
                          onClick={() => openDeleteDialog("building", building)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={buildingPagination.totalCount}
          rowsPerPage={buildingRowsPerPage}
          page={buildingPage}
          onPageChange={handleBuildingChangePage}
          onRowsPerPageChange={handleBuildingChangeRowsPerPage}
          labelRowsPerPage="Dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} trên ${count}`
          }
        />
      </TableContainer>
    </Box>
  );

  // Render tab phòng học
  const renderRoomsTab = () => (
    <Box>
      {selectedBuilding ? (
        <>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleBackToBuildings}
              sx={{ mb: 2 }}
            >
              Quay lại danh sách tòa nhà
            </Button>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedBuilding.name} ({selectedBuilding.code})
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Cơ sở:{" "}
                {selectedBuilding.campus_id?.name || "Không có thông tin"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Số tầng: {selectedBuilding.floors_count}
              </Typography>
              {selectedBuilding.description && (
                <Typography variant="body2" color="textSecondary">
                  Mô tả: {selectedBuilding.description}
                </Typography>
              )}
            </Paper>
          </Box>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Box
              display="flex"
              flexDirection={{ xs: "column", sm: "row" }}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
              gap={2}
            >
              <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
                <TextField
                  label="Tìm kiếm phòng học"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={roomSearchTerm}
                  onChange={(e) => {
                    setRoomSearchTerm(e.target.value);
                    if (e.target.value.trim() === "") {
                      handleRoomSearch();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRoomSearch}
                  startIcon={<Search />}
                >
                  Tìm
                </Button>
              </Box>

              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadRooms}
                >
                  Làm mới
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleRoomDialogOpen("add")}
                  sx={{ ml: 2 }}
                >
                  Thêm phòng
                </Button>
              </Box>
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Phòng học</TableCell>
                  <TableCell>Mã phòng</TableCell>
                  <TableCell align="center">Tầng</TableCell>
                  <TableCell align="center">Sức chứa</TableCell>
                  <TableCell>Loại phòng</TableCell>
                  <TableCell>Tiện ích</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="center">Ảnh</TableCell>
                  <TableCell align="right">Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Không tìm thấy phòng học nào
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room._id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Room sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="body1">
                            Phòng {room.room_number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{room.room_number}</TableCell>
                      <TableCell align="center">{room.floor}</TableCell>
                      <TableCell align="center">{room.capacity}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoomTypeLabel(room.room_type)}
                          color={
                            room.room_type === "lecture"
                              ? "primary"
                              : room.room_type === "lab"
                              ? "secondary"
                              : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {room.equipment && room.equipment.length > 0 ? (
                            room.equipment.map((equipmentItem, index) => {
                              // Xử lý cả trường hợp equipment là object hoặc chuỗi
                              const equipmentId =
                                typeof equipmentItem === "object"
                                  ? equipmentItem.name
                                  : equipmentItem;
                              const equipment = availableEquipment.find(
                                (f) => f.id === equipmentId
                              );
                              return equipment ? (
                                <Chip
                                  key={`${equipmentId}-${index}`}
                                  label={equipment.label}
                                  size="small"
                                  variant="outlined"
                                />
                              ) : null;
                            })
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Không có
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getRoomStatusLabel(room.status)}
                          color={getRoomStatusColor(room.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {room.image_url ? (
                          <Tooltip title="Xem ảnh">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleOpenImagePreview(
                                  room.image_url,
                                  `Ảnh phòng ${room.room_number}`
                                )
                              }
                            >
                              <PhotoCamera />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" justifyContent="flex-end">
                          <Tooltip title="Sửa phòng học">
                            <IconButton
                              color="primary"
                              onClick={() => handleRoomDialogOpen("edit", room)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa phòng học">
                            <IconButton
                              color="error"
                              onClick={() => openDeleteDialog("room", room)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={roomPagination.totalCount}
              rowsPerPage={roomRowsPerPage}
              page={roomPage}
              onPageChange={handleRoomChangePage}
              onRowsPerPageChange={handleRoomChangeRowsPerPage}
              labelRowsPerPage="Dòng mỗi trang:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} trên ${count}`
              }
            />
          </TableContainer>
        </>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <Typography variant="h6" color="textSecondary">
            Vui lòng chọn một tòa nhà để xem danh sách phòng học
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Render dialog xác nhận xóa
  const renderDeleteConfirmDialog = () => {
    return (
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Xác nhận xóa{" "}
          {deleteDialogType === "campus"
            ? "cơ sở"
            : deleteDialogType === "building"
            ? "tòa nhà"
            : "phòng"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa{" "}
            {deleteDialogType === "campus"
              ? "cơ sở"
              : deleteDialogType === "building"
              ? "tòa nhà"
              : "phòng"}{" "}
            này? Hành động này không thể hoàn tác.
            {deleteDialogType === "campus" &&
              " Tất cả tòa nhà và phòng học trong cơ sở này cũng sẽ bị xóa."}
            {deleteDialogType === "building" &&
              " Tất cả phòng học trong tòa nhà này cũng sẽ bị xóa."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleDeleteItem}
            color="error"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : "Xóa"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Dialog Campus
  const renderCampusDialog = () => {
    return (
      <Dialog
        open={campusDialogOpen}
        onClose={handleCampusDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {campusDialogMode === "add" ? "Thêm cơ sở mới" : "Cập nhật cơ sở"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Cột cho ảnh */}
            <Grid item xs={12} md={4}>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Avatar
                  src={campusImagePreview || campusFormData.image_url}
                  alt={campusFormData.name || "Campus Image"}
                  variant="rounded"
                  sx={{
                    width: 180,
                    height: 180,
                    mb: 2,
                    border: "1px solid lightgray",
                  }}
                >
                  {!campusImagePreview && !campusFormData.image_url && (
                    <LocationOn sx={{ fontSize: 60 }} />
                  )}
                </Avatar>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                  size="small"
                >
                  Tải ảnh lên
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleCampusImageChange}
                  />
                </Button>
                {campusFileError && (
                  <Typography
                    color="error"
                    variant="caption"
                    sx={{ mt: 1, textAlign: "center" }}
                  >
                    {campusFileError}
                  </Typography>
                )}
                {(campusImagePreview || campusFormData.image_url) &&
                  campusDialogMode === "edit" && (
                    <Button
                      variant="text"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={handleRemoveCampusImage}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Xóa ảnh hiện tại
                    </Button>
                  )}
              </Box>
            </Grid>

            {/* Cột cho thông tin */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="code"
                    label="Mã cơ sở"
                    fullWidth
                    required
                    value={campusFormData.code}
                    onChange={handleCampusFormChange}
                    variant="outlined"
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="name"
                    label="Tên cơ sở"
                    fullWidth
                    required
                    value={campusFormData.name}
                    onChange={handleCampusFormChange}
                    variant="outlined"
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="address"
                    label="Địa chỉ"
                    fullWidth
                    value={campusFormData.address}
                    onChange={handleCampusFormChange}
                    variant="outlined"
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    label="Mô tả"
                    fullWidth
                    multiline
                    rows={3}
                    value={campusFormData.description}
                    onChange={handleCampusFormChange}
                    variant="outlined"
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isSubmitting}>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      name="status"
                      value={campusFormData.status}
                      onChange={handleCampusFormChange}
                      label="Trạng thái"
                    >
                      <MenuItem value="active">Hoạt động</MenuItem>
                      <MenuItem value="inactive">Không hoạt động</MenuItem>
                      <MenuItem value="under_construction">
                        Đang xây dựng
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCampusDialogClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={handleCampusFormSubmit}
            variant="contained"
            color="primary"
            disabled={
              !campusFormData.code ||
              !campusFormData.name ||
              !campusFormData.address ||
              isSubmitting
            }
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {isSubmitting
              ? "Đang xử lý..."
              : campusDialogMode === "add"
              ? "Thêm mới"
              : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Dialog Building
  const renderBuildingDialog = () => {
    return (
      <Dialog
        open={buildingDialogOpen}
        onClose={handleCloseBuildingDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {buildingDialogMode === "add" ? "Thêm tòa nhà mới" : "Sửa tòa nhà"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Cột cho ảnh */}
            <Grid item xs={12} md={4}>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Avatar
                  src={buildingImagePreview || buildingFormData.image_url}
                  alt={buildingFormData.name || "Building Image"}
                  variant="rounded"
                  sx={{
                    width: 180,
                    height: 180,
                    mb: 2,
                    border: "1px solid lightgray",
                  }}
                >
                  {!buildingImagePreview && !buildingFormData.image_url && (
                    <Domain sx={{ fontSize: 60 }} />
                  )}
                </Avatar>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                >
                  Tải ảnh lên
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleBuildingImageChange}
                  />
                </Button>
                {(buildingImagePreview || buildingFormData.image_url) &&
                  buildingDialogMode === "edit" && (
                    <Button
                      variant="text"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={handleRemoveBuildingImage}
                      size="small"
                      sx={{ mt: 1 }}
                      disabled={isSubmitting}
                    >
                      Xóa ảnh hiện tại
                    </Button>
                  )}
                {buildingFileError && (
                  <Typography
                    color="error"
                    variant="caption"
                    sx={{ mt: 1, textAlign: "center" }}
                  >
                    {buildingFileError}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Cột cho thông tin */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    name="name"
                    label="Tên tòa nhà"
                    fullWidth
                    required
                    value={buildingFormData.name}
                    onChange={handleBuildingFormChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="code"
                    label="Mã tòa nhà"
                    fullWidth
                    required
                    value={buildingFormData.code}
                    onChange={handleBuildingFormChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required disabled={isSubmitting}>
                    <InputLabel>Chọn cơ sở</InputLabel>
                    <Select
                      name="campus_id"
                      value={buildingFormData.campus_id}
                      onChange={handleBuildingFormChange}
                      label="Chọn cơ sở"
                    >
                      {localCampusList.map((campus) => (
                        <MenuItem key={campus._id} value={campus._id}>
                          {campus.name} ({campus.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="floors_count"
                    label="Số tầng"
                    type="number"
                    fullWidth
                    required
                    value={buildingFormData.floors_count}
                    onChange={handleBuildingFormChange}
                    InputProps={{ inputProps: { min: 1 } }}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="year_built"
                    label="Năm xây dựng"
                    type="number"
                    fullWidth
                    required
                    value={buildingFormData.year_built}
                    onChange={handleBuildingFormChange}
                    InputProps={{
                      inputProps: { min: 1900, max: new Date().getFullYear() },
                    }}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      name="status"
                      value={buildingFormData.status}
                      onChange={handleBuildingFormChange}
                      label="Trạng thái"
                    >
                      <MenuItem value="active">Hoạt động</MenuItem>
                      <MenuItem value="maintenance">Bảo trì</MenuItem>
                      <MenuItem value="inactive">Ngưng hoạt động</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                    Chọn Tiện ích (Chips)
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {buildingFacilities.map((facility) => (
                      <Chip
                        key={facility.id}
                        label={facility.label}
                        color={
                          buildingFormData.facilities.includes(facility.id)
                            ? "primary"
                            : "default"
                        }
                        onClick={() => {
                          const currentFacilities =
                            buildingFormData.facilities || [];
                          const newFacilities = currentFacilities.includes(
                            facility.id
                          )
                            ? currentFacilities.filter(
                                (id) => id !== facility.id
                              )
                            : [...currentFacilities, facility.id];

                          setBuildingFormData({
                            ...buildingFormData,
                            facilities: newFacilities,
                          });
                        }}
                        sx={{ cursor: "pointer" }}
                        disabled={isSubmitting}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBuildingDialog} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={handleBuildingFormSubmit}
            variant="contained"
            color="primary"
            disabled={
              !buildingFormData.name ||
              !buildingFormData.code ||
              !buildingFormData.campus_id ||
              isSubmitting
            }
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {isSubmitting
              ? "Đang xử lý..."
              : buildingDialogMode === "add"
              ? "Tạo mới"
              : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Dialog Room
  const renderRoomDialog = () => {
    return (
      <Dialog
        open={roomDialogOpen}
        onClose={handleCloseRoomDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {roomDialogMode === "add" ? "Thêm phòng học mới" : "Sửa phòng học"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Cột cho ảnh */}
            <Grid item xs={12} md={4}>
              <Box display="flex" flexDirection="column" alignItems="center">
                <Avatar
                  src={roomImagePreview || roomFormData.image_url}
                  alt={roomFormData.room_number || "Room Image"}
                  variant="rounded"
                  sx={{
                    width: 180,
                    height: 180,
                    mb: 2,
                    border: "1px solid lightgray",
                  }}
                >
                  {!roomImagePreview && !roomFormData.image_url && (
                    <Room sx={{ fontSize: 60 }} />
                  )}
                </Avatar>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                >
                  Tải ảnh lên
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleRoomImageChange}
                  />
                </Button>
                {/* Hiển thị lỗi file cho Room */}
                {roomFileError && (
                  <Typography
                    color="error"
                    variant="caption"
                    sx={{ mt: 1, textAlign: "center" }}
                  >
                    {roomFileError}
                  </Typography>
                )}
                {(roomImagePreview || roomFormData.image_url) &&
                  roomDialogMode === "edit" && (
                    <Button
                      variant="text"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={handleRemoveRoomImage}
                      size="small"
                      sx={{ mt: 1 }}
                      disabled={isSubmitting}
                    >
                      Xóa ảnh hiện tại
                    </Button>
                  )}
              </Box>
            </Grid>

            {/* Cột cho thông tin */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="room_number"
                    label="Số phòng"
                    fullWidth
                    required
                    value={roomFormData.room_number}
                    onChange={handleRoomFormChange}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required disabled={isSubmitting}>
                    <InputLabel>Tòa nhà</InputLabel>
                    <Select
                      name="building_id"
                      value={roomFormData.building_id}
                      onChange={handleRoomFormChange}
                      label="Tòa nhà"
                    >
                      {(selectedCampus
                        ? buildings.filter(
                            (b) =>
                              b.campus_id?._id === selectedCampus._id ||
                              b.campus_id === selectedCampus._id
                          )
                        : buildings
                      ).map((building) => (
                        <MenuItem key={building._id} value={building._id}>
                          {building.name} ({building.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="floor"
                    label="Tầng"
                    type="number"
                    fullWidth
                    required
                    value={roomFormData.floor}
                    onChange={handleRoomFormChange}
                    InputProps={{
                      inputProps: {
                        min: 1,
                        max:
                          buildings.find(
                            (b) => b._id === roomFormData.building_id
                          )?.floors_count || 100,
                      },
                    }}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="capacity"
                    label="Sức chứa"
                    type="number"
                    fullWidth
                    required
                    value={roomFormData.capacity}
                    onChange={handleRoomFormChange}
                    InputProps={{ inputProps: { min: 0 } }}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required disabled={isSubmitting}>
                    <InputLabel>Loại phòng</InputLabel>
                    <Select
                      name="room_type"
                      value={roomFormData.room_type}
                      onChange={handleRoomFormChange}
                      label="Loại phòng"
                    >
                      {roomTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isSubmitting}>
                    <InputLabel>Trạng thái</InputLabel>
                    <Select
                      name="status"
                      value={roomFormData.status}
                      onChange={handleRoomFormChange}
                      label="Trạng thái"
                    >
                      {roomStatuses.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="area"
                    label="Diện tích (m²)"
                    type="number"
                    fullWidth
                    value={roomFormData.area || ""}
                    onChange={handleRoomFormChange}
                    InputProps={{ inputProps: { min: 0 } }}
                    disabled={isSubmitting}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                    Tiện ích phòng
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {availableEquipment.map((facility) => (
                      <Chip
                        key={facility.id}
                        label={facility.label}
                        color={
                          (roomFormData.equipment || []).includes(facility.id)
                            ? "primary"
                            : "default"
                        }
                        onClick={() => {
                          const currentEquipment = roomFormData.equipment || [];
                          const newEquipment = currentEquipment.includes(
                            facility.id
                          )
                            ? currentEquipment.filter(
                                (id) => id !== facility.id
                              )
                            : [...currentEquipment, facility.id];
                          setRoomFormData({
                            ...roomFormData,
                            equipment: newEquipment,
                          });
                        }}
                        sx={{ cursor: "pointer" }}
                        disabled={isSubmitting}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoomDialog} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={handleRoomFormSubmit}
            variant="contained"
            color="primary"
            disabled={
              !roomFormData.room_number ||
              !roomFormData.building_id ||
              isSubmitting
            }
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {isSubmitting
              ? "Đang xử lý..."
              : roomDialogMode === "add"
              ? "Tạo mới"
              : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Dialog xem ảnh
  const renderImagePreviewDialog = () => (
    <Dialog
      open={imagePreviewOpen}
      onClose={handleCloseImagePreview}
      maxWidth="md"
    >
      <DialogTitle>
        Xem ảnh: {currentImageAlt}
        <IconButton
          aria-label="close"
          onClick={handleCloseImagePreview}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Add sx={{ transform: "rotate(45deg)" }} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt={currentImageAlt}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        ) : (
          <Typography>Không có ảnh để hiển thị.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseImagePreview}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Quản lý cơ sở vật chất
        </Typography>
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Cơ sở" />
        <Tab label="Tòa nhà" />
        <Tab label="Phòng" />
      </Tabs>

      {renderTabContent()}

      {/* Dialogs */}
      {renderCampusDialog()}
      {renderBuildingDialog()}
      {renderRoomDialog()}
      {renderDeleteConfirmDialog()}
      {renderImagePreviewDialog()}
    </Container>
  );
};

export default FacilitiesPage;
