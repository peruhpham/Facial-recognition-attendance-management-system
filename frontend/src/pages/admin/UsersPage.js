import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  Avatar,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Search,
  Check,
  Close,
  Refresh,
  VerifiedUser,
  Person,
  School,
  SupervisorAccount,
} from "@mui/icons-material";
import {
  fetchAllUsers,
  approveUser,
  rejectUser,
  updateUserRole,
  deleteUser,
} from "../../redux/slices/adminSlice";

const ROLES = [
  { value: "admin", label: "Admin", color: "error" },
  { value: "teacher", label: "Giáo viên", color: "primary" },
  { value: "student", label: "Sinh viên", color: "success" },
];

const STATUS = [
  { value: "pending", label: "Chờ phê duyệt", color: "warning" },
  { value: "approved", label: "Đã phê duyệt", color: "success" },
  { value: "rejected", label: "Đã từ chối", color: "error" },
];

const UsersPage = () => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const { users, userStats, isLoading, error, pagination } = useSelector(
    (state) => state.admin
  );
  const { token } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [dispatch, page, rowsPerPage, roleFilter, statusFilter]);

  useEffect(() => {
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
    }
  }, [error, enqueueSnackbar]);

  const loadUsers = () => {
    dispatch(
      fetchAllUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
      })
    );
  };

  const handleSearch = () => {
    setPage(0);
    loadUsers();
  };

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openConfirmDialog = (user, action) => {
    setSelectedUser(user);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;

    try {
      await dispatch(approveUser(selectedUser._id)).unwrap();
      enqueueSnackbar("Phê duyệt người dùng thành công", {
        variant: "success",
      });
      setConfirmDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(error?.message || "Lỗi khi phê duyệt người dùng", {
        variant: "error",
      });
    }
  };

  const handleRejectUser = async () => {
    if (!selectedUser) return;

    try {
      await dispatch(rejectUser(selectedUser._id)).unwrap();
      enqueueSnackbar("Từ chối người dùng thành công", {
        variant: "success",
      });
      setConfirmDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(error?.message || "Lỗi khi từ chối người dùng", {
        variant: "error",
      });
    }
  };

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await dispatch(
        updateUserRole({
          userId: selectedUser._id,
          role: selectedRole,
        })
      ).unwrap();
      enqueueSnackbar("Cập nhật vai trò thành công", { variant: "success" });
      setRoleDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(error?.message || "Lỗi khi cập nhật vai trò", {
        variant: "error",
      });
    }
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await dispatch(deleteUser(selectedUser._id)).unwrap();
      enqueueSnackbar("Xóa người dùng thành công", { variant: "success" });
      setDeleteDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(error?.message || "Lỗi khi xóa người dùng", {
        variant: "error",
      });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Quản lý người dùng
      </Typography>

      {/* Thống kê */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                color="textSecondary"
                gutterBottom
                sx={{ fontSize: "1rem" }}
              >
                Tổng người dùng đã phê duyệt
              </Typography>
              <Box display="flex" alignItems="center">
                <Person sx={{ mr: 1, color: "text.secondary", fontSize: 40 }} />
                <Typography variant="h4">
                  {userStats.totalApprovedUsers || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                color="textSecondary"
                gutterBottom
                sx={{ fontSize: "1rem" }}
              >
                Giáo viên (Đã duyệt)
              </Typography>
              <Box display="flex" alignItems="center">
                <SupervisorAccount
                  sx={{ mr: 1, color: "text.secondary", fontSize: 40 }}
                />
                <Typography variant="h4">
                  {userStats.approvedTeachers || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                color="textSecondary"
                gutterBottom
                sx={{ fontSize: "1rem" }}
              >
                Sinh viên (Đã duyệt)
              </Typography>
              <Box display="flex" alignItems="center">
                <School sx={{ mr: 1, color: "text.secondary", fontSize: 40 }} />
                <Typography variant="h4">
                  {userStats.approvedStudents || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                color="textSecondary"
                gutterBottom
                sx={{ fontSize: "1rem" }}
              >
                Chờ phê duyệt
              </Typography>
              <Box display="flex" alignItems="center">
                <Person sx={{ mr: 1, color: "text.secondary", fontSize: 40 }} />
                <Typography variant="h4">
                  {(userStats.pendingTeachers || 0) +
                    (userStats.pendingStudents || 0)}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                display="block"
                color="textSecondary"
              >
                GV: {userStats.pendingTeachers || 0} | SV:{" "}
                {userStats.pendingStudents || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Khung tìm kiếm và lọc */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Tìm kiếm người dùng"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch}>
                      <Search />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="role-filter-label">Vai trò</InputLabel>
              <Select
                labelId="role-filter-label"
                id="role-filter"
                value={roleFilter}
                onChange={handleRoleFilterChange}
                label="Vai trò"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="status-filter-label">Trạng thái</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Trạng thái"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {STATUS.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid
            item
            xs={12}
            md={2}
            sx={{ display: "flex", justifyContent: "flex-end" }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<Refresh />}
              onClick={loadUsers}
            >
              Làm mới
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Bảng danh sách người dùng */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Thông tin</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>SĐT</TableCell>
              <TableCell>Địa chỉ</TableCell>
              <TableCell>Vai trò</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar
                        src={user.avatar_url}
                        sx={{ mr: 2 }}
                        alt={user.full_name}
                      />
                      <Box>
                        <Typography variant="body1">
                          {user.full_name}
                        </Typography>
                        {user.school_info?.student_id && (
                          <Typography variant="caption" color="textSecondary">
                            MSSV: {user.school_info.student_id}
                          </Typography>
                        )}
                        {user.school_info?.teacher_code && (
                          <Typography variant="caption" color="textSecondary">
                            MGV: {user.school_info.teacher_code}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.contact?.phone || "-"}</TableCell>
                  <TableCell>{user.contact?.address || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        ROLES.find((r) => r.value === user.role)?.label ||
                        user.role
                      }
                      color={
                        ROLES.find((r) => r.value === user.role)?.color ||
                        "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.role === "student"
                      ? user.school_info?.class_id?.name || "-"
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={
                        STATUS.find((s) => s.value === user.status)?.label ||
                        user.status
                      }
                      color={
                        STATUS.find((s) => s.value === user.status)?.color ||
                        "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" justifyContent="flex-end">
                      {user.status === "pending" && (
                        <>
                          <Tooltip title="Phê duyệt">
                            <IconButton
                              color="success"
                              onClick={() => openConfirmDialog(user, "approve")}
                            >
                              <Check />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Từ chối">
                            <IconButton
                              color="error"
                              onClick={() => openConfirmDialog(user, "reject")}
                            >
                              <Close />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Thay đổi vai trò">
                        <IconButton
                          color="primary"
                          onClick={() => openRoleDialog(user)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa người dùng">
                        <IconButton
                          color="error"
                          onClick={() => openDeleteDialog(user)}
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
          count={pagination.totalCount}
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

      {/* Dialog xác nhận */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          {confirmAction === "approve"
            ? "Phê duyệt người dùng"
            : "Từ chối người dùng"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction === "approve"
              ? `Bạn có chắc chắn muốn phê duyệt người dùng ${
                  selectedUser?.full_name || ""
                }?`
              : `Bạn có chắc chắn muốn từ chối người dùng ${
                  selectedUser?.full_name || ""
                }?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Hủy</Button>
          <Button
            onClick={
              confirmAction === "approve" ? handleApproveUser : handleRejectUser
            }
            color={confirmAction === "approve" ? "primary" : "error"}
            autoFocus
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thay đổi vai trò */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>Thay đổi vai trò người dùng</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Chọn vai trò mới cho {selectedUser?.full_name || ""}
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel id="role-select-label">Vai trò</InputLabel>
            <Select
              labelId="role-select-label"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              label="Vai trò"
            >
              {ROLES.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleRoleChange} color="primary">
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xóa người dùng */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Xóa người dùng</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa người dùng {selectedUser?.full_name || ""}
            ? Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleDeleteUser} color="error" autoFocus>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
