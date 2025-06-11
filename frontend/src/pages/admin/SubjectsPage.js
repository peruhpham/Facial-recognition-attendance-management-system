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

const SubjectsPage = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useSelector((state) => state.auth);

  // State
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    credits: 3,
    department_id: "",
    description: "",
    status: "đang dạy",
  });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load data on mount and when pagination/search changes
  useEffect(() => {
    loadSubjects();
    loadDepartments();
  }, [page, rowsPerPage]);

  const loadSubjects = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${API_URL}/subjects?page=${
          page + 1
        }&limit=${rowsPerPage}&search=${searchTerm}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSubjects(response.data.data || []);
      setTotalCount(response.data.totalCount || 0);
      setIsLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải danh sách môn học:", error);
      enqueueSnackbar("Lỗi khi tải danh sách môn học", { variant: "error" });
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách khoa:", error);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadSubjects();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Dialog handlers
  const openDialog = (mode, subject = null) => {
    setDialogMode(mode);
    if (mode === "edit" && subject) {
      setFormData({
        code: subject.code || "",
        name: subject.name || "",
        credits: subject.credits || 3,
        department_id: subject.department_id?._id || "",
        description: subject.description || "",
        status: subject.status || "đang dạy",
      });
      setSelectedSubject(subject);
    } else {
      setFormData({
        code: "",
        name: "",
        credits: 3,
        department_id: "",
        description: "",
        status: "đang dạy",
      });
    }
    setDialogOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFormSubmit = async () => {
    try {
      if (dialogMode === "create") {
        await axios.post(`${API_URL}/subjects`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        enqueueSnackbar("Tạo môn học mới thành công", { variant: "success" });
      } else {
        await axios.put(
          `${API_URL}/subjects/${selectedSubject._id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        enqueueSnackbar("Cập nhật môn học thành công", { variant: "success" });
      }
      setDialogOpen(false);
      loadSubjects();
    } catch (error) {
      console.error("Lỗi khi thao tác với môn học:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi thao tác với môn học",
        { variant: "error" }
      );
    }
  };

  // Delete handlers
  const openDeleteDialog = (subject) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubject = async () => {
    try {
      await axios.delete(`${API_URL}/subjects/${selectedSubject._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Xóa môn học thành công", { variant: "success" });
      setDeleteDialogOpen(false);
      loadSubjects();
    } catch (error) {
      console.error("Lỗi khi xóa môn học:", error);
      enqueueSnackbar(error.response?.data?.message || "Lỗi khi xóa môn học", {
        variant: "error",
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Quản lý môn học
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
              label="Tìm kiếm môn học"
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
              onClick={loadSubjects}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog("create")}
            >
              Thêm môn học
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Mã môn học</TableCell>
              <TableCell>Tên môn học</TableCell>
              <TableCell>Số tín chỉ</TableCell>
              <TableCell>Khoa</TableCell>
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
            ) : subjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              subjects.map((subject) => (
                <TableRow key={subject._id}>
                  <TableCell>{subject.code}</TableCell>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>{subject.credits}</TableCell>
                  <TableCell>{subject.department_id?.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={subject.status || "đang dạy"}
                      color={
                        subject.status === "đang dạy" ? "primary" : "warning"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Chỉnh sửa">
                      <IconButton
                        color="primary"
                        onClick={() => openDialog("edit", subject)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(subject)}
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
          {dialogMode === "create" ? "Thêm môn học mới" : "Chỉnh sửa môn học"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="code"
                label="Mã môn học"
                fullWidth
                value={formData.code}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="credits"
                label="Số tín chỉ"
                fullWidth
                type="number"
                value={formData.credits}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Tên môn học"
                fullWidth
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Khoa</InputLabel>
                <Select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleFormChange}
                  label="Khoa"
                >
                  {departments.map((department) => (
                    <MenuItem key={department._id} value={department._id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Mô tả"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  label="Trạng thái"
                >
                  <MenuItem value="đang dạy">Đang dạy</MenuItem>
                  <MenuItem value="ngừng dạy">Ngừng dạy</MenuItem>
                </Select>
              </FormControl>
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
            Bạn có chắc chắn muốn xóa môn học "{selectedSubject?.name}" không?
            Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSubject}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubjectsPage;
