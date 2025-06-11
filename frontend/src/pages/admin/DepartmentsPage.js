import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
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
} from "@mui/material";
import { Add, Delete, Edit, Search, Refresh } from "@mui/icons-material";

const API_URL = process.env.REACT_APP_API_URL;

const DepartmentsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { token } = useSelector((state) => state.auth);

  // State
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
    name: "",
    code: "",
    description: "",
  });
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load data on mount and when pagination/search changes
  useEffect(() => {
    loadDepartments();
  }, [page, rowsPerPage]);

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${API_URL}/departments?page=${
          page + 1
        }&limit=${rowsPerPage}&search=${searchTerm}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDepartments(response.data.data || []);
      setTotalCount(response.data.totalCount || 0);
      setIsLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải danh sách khoa:", error);
      enqueueSnackbar("Lỗi khi tải danh sách khoa", { variant: "error" });
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadDepartments();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Dialog handlers
  const openDialog = (mode, department = null) => {
    setDialogMode(mode);
    if (mode === "edit" && department) {
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || "",
      });
      setSelectedDepartment(department);
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
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
        await axios.post(`${API_URL}/departments`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        enqueueSnackbar("Tạo khoa mới thành công", { variant: "success" });
      } else {
        await axios.put(
          `${API_URL}/departments/${selectedDepartment._id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        enqueueSnackbar("Cập nhật khoa thành công", { variant: "success" });
      }
      setDialogOpen(false);
      loadDepartments();
    } catch (error) {
      console.error("Lỗi khi thao tác với khoa:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi thao tác với khoa",
        { variant: "error" }
      );
    }
  };

  // Delete handlers
  const openDeleteDialog = (department) => {
    setSelectedDepartment(department);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDepartment = async () => {
    try {
      await axios.delete(`${API_URL}/departments/${selectedDepartment._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Xóa khoa thành công", { variant: "success" });
      setDeleteDialogOpen(false);
      loadDepartments();
    } catch (error) {
      console.error("Lỗi khi xóa khoa:", error);
      enqueueSnackbar(error.response?.data?.message || "Lỗi khi xóa khoa", {
        variant: "error",
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Quản lý khoa
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
              label="Tìm kiếm khoa"
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
              onClick={loadDepartments}
            >
              Làm mới
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog("create")}
            >
              Thêm khoa
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Tên khoa</TableCell>
              <TableCell>Mã khoa</TableCell>
              <TableCell>Mô tả</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Không tìm thấy khoa nào
                </TableCell>
              </TableRow>
            ) : (
              departments.map((department) => (
                <TableRow key={department._id}>
                  <TableCell>{department.name}</TableCell>
                  <TableCell>{department.code}</TableCell>
                  <TableCell>{department.description}</TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end">
                      <Tooltip title="Sửa khoa">
                        <IconButton
                          color="primary"
                          onClick={() => openDialog("edit", department)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa khoa">
                        <IconButton
                          color="error"
                          onClick={() => openDeleteDialog(department)}
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
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} trên ${count}`
          }
        />
      </TableContainer>

      {/* Dialog tạo/sửa khoa */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === "create" ? "Thêm khoa mới" : "Sửa khoa"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Tên khoa"
                fullWidth
                required
                value={formData.name}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="code"
                label="Mã khoa"
                fullWidth
                required
                value={formData.code}
                onChange={handleFormChange}
              />
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleFormSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.name || !formData.code}
          >
            {dialogMode === "create" ? "Tạo mới" : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Xác nhận xóa khoa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa khoa "{selectedDepartment?.name}"? Hành
            động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={handleDeleteDepartment}
            variant="contained"
            color="error"
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentsPage;
