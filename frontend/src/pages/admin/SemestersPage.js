import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Tooltip,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { Add, Delete, Edit, Search, Refresh } from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL;

const SemestersPage = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useSelector((state) => state.auth);

  // State
  const [semesters, setSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    is_current: false,
    semester_number: "",
    academic_year: "",
    registration_start_date: "",
    registration_end_date: "",
  });
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load data on mount and when pagination/search changes
  useEffect(() => {
    loadSemesters();
  }, [page, rowsPerPage]);

  const loadSemesters = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${API_URL}/semesters?page=${
          page + 1
        }&limit=${rowsPerPage}&search=${searchTerm}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSemesters(response.data.data || []);
      setTotalCount(response.data.totalCount || 0);
      setIsLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải danh sách kỳ học:", error);
      enqueueSnackbar("Lỗi khi tải danh sách kỳ học", { variant: "error" });
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadSemesters();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Dialog handlers
  const openDialog = (mode, semester = null) => {
    setDialogMode(mode);
    if (mode === "edit" && semester) {
      setFormData({
        name: semester.name,
        year: semester.year || new Date().getFullYear(),
        start_date: semester.start_date
          ? semester.start_date.substring(0, 10)
          : "",
        end_date: semester.end_date ? semester.end_date.substring(0, 10) : "",
        is_current: semester.is_current || false,
        semester_number: semester.semester_number || "",
        academic_year: semester.academic_year || "",
        registration_start_date: semester.registration_start_date
          ? semester.registration_start_date.substring(0, 10)
          : "",
        registration_end_date: semester.registration_end_date
          ? semester.registration_end_date.substring(0, 10)
          : "",
      });
      setSelectedSemester(semester);
    } else {
      setFormData({
        name: "",
        year: new Date().getFullYear(),
        start_date: "",
        end_date: "",
        is_current: false,
        semester_number: "",
        academic_year: "",
        registration_start_date: "",
        registration_end_date: "",
      });
    }
    setDialogOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFormSubmit = async () => {
    try {
      if (dialogMode === "create") {
        await axios.post(`${API_URL}/semesters`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        enqueueSnackbar("Tạo kỳ học mới thành công", { variant: "success" });
      } else {
        await axios.put(
          `${API_URL}/semesters/${selectedSemester._id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        enqueueSnackbar("Cập nhật kỳ học thành công", { variant: "success" });
      }
      setDialogOpen(false);
      loadSemesters();
    } catch (error) {
      console.error("Lỗi khi thao tác với kỳ học:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi thao tác với kỳ học",
        { variant: "error" }
      );
    }
  };

  // Delete handlers
  const openDeleteDialog = (semester) => {
    setSelectedSemester(semester);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSemester = async () => {
    try {
      await axios.delete(`${API_URL}/semesters/${selectedSemester._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Xóa kỳ học thành công", { variant: "success" });
      setDeleteDialogOpen(false);
      loadSemesters();
    } catch (error) {
      console.error("Lỗi khi xóa kỳ học:", error);
      enqueueSnackbar(error.response?.data?.message || "Lỗi khi xóa kỳ học", {
        variant: "error",
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Quản lý kỳ học
      </Typography>

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
              label="Tìm kiếm kỳ học"
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
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
              onClick={handleSearch}
              startIcon={<Search />}
            >
              Tìm
            </Button>
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadSemesters}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog("create")}
            >
              Thêm kỳ học
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Tên kỳ học</TableCell>
              <TableCell>Năm học</TableCell>
              <TableCell>Ngày bắt đầu</TableCell>
              <TableCell>Ngày kết thúc</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : semesters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              semesters.map((semester) => (
                <TableRow key={semester._id}>
                  <TableCell>{semester.name}</TableCell>
                  <TableCell>{semester.year}</TableCell>
                  <TableCell>
                    {semester.start_date
                      ? new Date(semester.start_date).toLocaleDateString(
                          "vi-VN"
                        )
                      : ""}
                  </TableCell>
                  <TableCell>
                    {semester.end_date
                      ? new Date(semester.end_date).toLocaleDateString("vi-VN")
                      : ""}
                  </TableCell>
                  <TableCell>
                    {semester.calculated_status ? (
                      <Chip
                        label={semester.calculated_status}
                        color={
                          semester.calculated_status === "Đang diễn ra"
                            ? "primary"
                            : semester.calculated_status === "Đã kết thúc"
                            ? "default"
                            : "warning"
                        }
                        size="small"
                      />
                    ) : (
                      <Chip label="Không xác định" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Chỉnh sửa">
                      <IconButton
                        color="primary"
                        onClick={() => openDialog("edit", semester)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(semester)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} của ${count}`
          }
        />
      </TableContainer>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {dialogMode === "create" ? "Thêm kỳ học mới" : "Chỉnh sửa kỳ học"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Tên kỳ học"
                fullWidth
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="year"
                label="Năm học"
                fullWidth
                type="number"
                value={formData.year}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="start_date"
                label="Ngày bắt đầu"
                fullWidth
                type="date"
                value={formData.start_date}
                onChange={handleFormChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="end_date"
                label="Ngày kết thúc"
                fullWidth
                type="date"
                value={formData.end_date}
                onChange={handleFormChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleFormSubmit}>
            {dialogMode === "create" ? "Tạo mới" : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa kỳ học "{selectedSemester?.name}" không?
            Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSemester}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SemestersPage;
