import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSnackbar } from "notistack";
import {
  getMajors,
  createMajor,
  updateMajor,
  deleteMajor,
  getDepartments,
} from "../../services/api";

const MajorsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [majors, setMajors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentMajor, setCurrentMajor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    department_id: "",
    description: "",
  });

  const fetchMajors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMajors();
      setMajors(response.data.data || []);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Không thể tải danh sách ngành học.";
      setError(errMsg);
      enqueueSnackbar(errMsg, { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await getDepartments();
      setDepartments(response.data.data || []);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Không thể tải danh sách khoa.";
      enqueueSnackbar(errMsg, { variant: "error" });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchMajors();
    fetchDepartments();
  }, [fetchMajors, fetchDepartments]);

  const handleOpenFormDialog = (major = null) => {
    if (major) {
      setIsEditing(true);
      setCurrentMajor(major);
      setFormData({
        name: major.name,
        code: major.code,
        department_id: major.department_id?._id || "",
        description: major.description || "",
      });
    } else {
      setIsEditing(false);
      setCurrentMajor(null);
      setFormData({
        name: "",
        code: "",
        department_id: "",
        description: "",
      });
    }
    setOpenFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setOpenFormDialog(false);
    setCurrentMajor(null);
    setIsEditing(false);
  };

  const handleOpenDeleteDialog = (major) => {
    setCurrentMajor(major);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setCurrentMajor(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.department_id) {
      enqueueSnackbar("Vui lòng chọn khoa.", { variant: "warning" });
      return;
    }
    setLoading(true);
    try {
      if (isEditing && currentMajor) {
        await updateMajor(currentMajor._id, formData);
        enqueueSnackbar("Cập nhật ngành học thành công!", {
          variant: "success",
        });
      } else {
        await createMajor(formData);
        enqueueSnackbar("Thêm ngành học thành công!", { variant: "success" });
      }
      fetchMajors();
      handleCloseFormDialog();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Thao tác thất bại.";
      enqueueSnackbar(errMsg, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentMajor) return;
    setLoading(true);
    try {
      await deleteMajor(currentMajor._id);
      enqueueSnackbar("Xóa ngành học thành công!", { variant: "success" });
      fetchMajors();
      handleCloseDeleteDialog();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Xóa ngành học thất bại.";
      enqueueSnackbar(errMsg, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1">
          Quản lý Ngành học
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenFormDialog()}
        >
          Thêm Ngành học
        </Button>
      </Box>

      {loading && (
        <CircularProgress sx={{ display: "block", margin: "auto" }} />
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table sx={{ minWidth: 650 }} aria-label="majors table">
            <TableHead sx={{ backgroundColor: "primary.main" }}>
              <TableRow>
                <TableCell sx={{ color: "common.white", fontWeight: "bold" }}>
                  STT
                </TableCell>
                <TableCell sx={{ color: "common.white", fontWeight: "bold" }}>
                  Tên Ngành
                </TableCell>
                <TableCell sx={{ color: "common.white", fontWeight: "bold" }}>
                  Mã Ngành
                </TableCell>
                <TableCell sx={{ color: "common.white", fontWeight: "bold" }}>
                  Khoa
                </TableCell>
                <TableCell sx={{ color: "common.white", fontWeight: "bold" }}>
                  Mô tả
                </TableCell>
                <TableCell
                  sx={{
                    color: "common.white",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Hành động
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {majors.map((major, index) => (
                <TableRow
                  key={major._id}
                  sx={{
                    "&:nth-of-type(odd)": { backgroundColor: "action.hover" },
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell component="th" scope="row">
                    {major.name}
                  </TableCell>
                  <TableCell>{major.code}</TableCell>
                  <TableCell>{major.department_id?.name || "N/A"}</TableCell>
                  <TableCell>{major.description || "Không có"}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenFormDialog(major)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleOpenDeleteDialog(major)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {majors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Không có dữ liệu ngành học.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Form Dialog for Add/Edit Major */}
      <Dialog
        open={openFormDialog}
        onClose={handleCloseFormDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Chỉnh sửa Ngành học" : "Thêm Ngành học mới"}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  margin="dense"
                  name="name"
                  label="Tên Ngành học"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="code"
                  label="Mã Ngành học"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.code}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel id="department-select-label">Khoa</InputLabel>
                  <Select
                    labelId="department-select-label"
                    id="department_id"
                    name="department_id"
                    value={formData.department_id}
                    label="Khoa"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>Chọn Khoa</em>
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  name="description"
                  label="Mô tả (tùy chọn)"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: "16px 24px" }}>
            <Button onClick={handleCloseFormDialog} color="inherit">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : isEditing ? (
                "Lưu thay đổi"
              ) : (
                "Thêm Ngành"
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
      >
        <DialogTitle>Xác nhận Xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa ngành học "
            <strong>{currentMajor?.name}</strong>"? Hành động này không thể hoàn
            tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Xóa"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MajorsPage;
