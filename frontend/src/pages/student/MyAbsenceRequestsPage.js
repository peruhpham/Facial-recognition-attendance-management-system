import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyAbsenceRequests,
  studentCreateAbsenceRequest,
  studentUpdateAbsenceRequest,
  studentCancelAbsenceRequest,
} from "../../redux/slices/absenceRequestSlice";
import {
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
} from "@mui/material";
import {
  AddCircleOutline,
  Edit,
  Delete,
  Refresh,
  Visibility,
  Image as ImageIcon,
  Clear,
  ErrorOutline,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  getMyTeachingClasses,
  getSchedulableSessionsForStudent,
} from "../../services/classService";

const getStatusChipColor = (status) => {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
      return "success";
    case "rejected":
      return "error";
    default:
      return "default";
  }
};

const MyAbsenceRequestsPage = () => {
  const dispatch = useDispatch();
  const { items, loading, error, count } = useSelector(
    (state) => state.absenceRequest.myRequests
  );
  const {
    creating,
    createError,
    updating,
    updateError,
    cancelling,
    cancelError,
  } = useSelector((state) => state.absenceRequest);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openConfirmDeleteDialog, setOpenConfirmDeleteDialog] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openEvidenceModal, setOpenEvidenceModal] = useState(false);
  const [evidenceImageUrl, setEvidenceImageUrl] = useState("");

  const [newRequestData, setNewRequestData] = useState({
    teaching_class_id: "",
    session_id: "",
    reason: "",
    evidence_url: "",
    evidence_file: null,
  });

  const [myClasses, setMyClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [fetchClassesError, setFetchClassesError] = useState(null);
  const [fetchSessionsError, setFetchSessionsError] = useState(null);
  const [sessionSelectionError, setSessionSelectionError] = useState(null);
  const [fileError, setFileError] = useState(null);

  // Keys để reset input file
  const [fileInputKeyCreate, setFileInputKeyCreate] = useState(0);
  const [fileInputKeyEdit, setFileInputKeyEdit] = useState(0);

  const evidenceFileCreateInputRef = useRef(null);
  const evidenceFileEditInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchMyAbsenceRequests());
  }, [dispatch]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (currentUser?._id) {
        setClassesLoading(true);
        setFetchClassesError(null);
        try {
          const response = await getMyTeachingClasses(currentUser._id);
          if (response.success) {
            setMyClasses(response.data || []);
          } else {
            setFetchClassesError(
              response.message || "Không thể tải danh sách lớp học."
            );
            setMyClasses([]);
          }
        } catch (err) {
          setFetchClassesError(err.message || "Lỗi khi tải danh sách lớp học.");
          setMyClasses([]);
        } finally {
          setClassesLoading(false);
        }
      }
    };
    fetchClasses();
  }, [currentUser]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (newRequestData.teaching_class_id) {
        setSessionsLoading(true);
        setFetchSessionsError(null);
        setSessionSelectionError(null);
        setSessions([]);
        setNewRequestData((prev) => ({ ...prev, session_id: "" }));
        try {
          const response = await getSchedulableSessionsForStudent(
            newRequestData.teaching_class_id
          );
          if (response.success) {
            const availableSessions = response.data || [];
            setSessions(availableSessions);

            if (availableSessions.length === 0) {
              setFetchSessionsError(
                "Không có buổi học nào sắp diễn ra để có thể xin nghỉ cho lớp này."
              );
            }
          } else {
            setFetchSessionsError(
              response.message || "Không thể tải danh sách buổi học."
            );
            setSessions([]);
          }
        } catch (err) {
          setFetchSessionsError(
            err.message || "Lỗi khi tải danh sách buổi học."
          );
          setSessions([]);
        } finally {
          setSessionsLoading(false);
        }
      } else {
        setSessions([]);
      }
    };
    fetchSessions();
  }, [newRequestData.teaching_class_id]);

  useEffect(() => {
    if (newRequestData.session_id && items.length > 0) {
      const existingRequestForSession = items.find(
        (req) => req.session_id?._id === newRequestData.session_id
      );
      if (existingRequestForSession) {
        setSessionSelectionError(
          `Bạn đã có đơn xin nghỉ cho buổi học này (Trạng thái: ${existingRequestForSession.status}). Vui lòng chọn buổi học khác.`
        );
      } else {
        setSessionSelectionError(null);
      }
    } else {
      setSessionSelectionError(null);
    }
  }, [newRequestData.session_id, items]);

  const handleRefresh = () => {
    dispatch(fetchMyAbsenceRequests());
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenCreateModal = () => {
    setNewRequestData({
      teaching_class_id: "",
      session_id: "",
      reason: "",
      evidence_url: "",
      evidence_file: null,
    });
    setFetchSessionsError(null);
    setSessionSelectionError(null);
    setFileError(null);
    if (evidenceFileCreateInputRef.current) {
      evidenceFileCreateInputRef.current.value = "";
    }
    setSessions([]);
    setFileInputKeyCreate((prevKey) => prevKey + 1);
    setOpenCreateModal(true);
  };
  const handleCloseCreateModal = () => setOpenCreateModal(false);

  const handleInputChange = (e, isEditMode = false) => {
    const { name, value, files } = e.target;

    if (name === "evidence_file") {
      const file = files[0];
      const setFileInputKey = isEditMode
        ? setFileInputKeyEdit
        : setFileInputKeyCreate;

      if (file) {
        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
          setFileError("Loại file không hợp lệ. Chỉ chấp nhận JPEG, PNG, GIF.");
          setNewRequestData((prev) => ({ ...prev, evidence_file: null }));
          setFileInputKey((prevKey) => prevKey + 1);
          return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          setFileError("Kích thước file quá lớn (tối đa 5MB).");
          setNewRequestData((prev) => ({ ...prev, evidence_file: null }));
          setFileInputKey((prevKey) => prevKey + 1);
          return;
        }
        setNewRequestData((prev) => ({
          ...prev,
          evidence_file: file,
          evidence_url: "",
        }));
        setFileError(null);
      } else {
        setNewRequestData((prev) => ({ ...prev, evidence_file: null }));
        setFileInputKey((prevKey) => prevKey + 1);
      }
    } else if (name === "evidence_url") {
      setNewRequestData((prev) => ({
        ...prev,
        [name]: value,
        evidence_file: null,
      }));
      setFileError(null);
      const setFileInputKey = isEditMode
        ? setFileInputKeyEdit
        : setFileInputKeyCreate;
      setFileInputKey((prevKey) => prevKey + 1);
    } else {
      setNewRequestData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRemoveEvidenceFile = (isEditMode = false) => {
    setNewRequestData((prev) => ({ ...prev, evidence_file: null }));
    setFileError(null);
    const setFileInputKey = isEditMode
      ? setFileInputKeyEdit
      : setFileInputKeyCreate;
    setFileInputKey((prevKey) => prevKey + 1);
  };

  const handleCreateSubmit = () => {
    if (!newRequestData.teaching_class_id) {
      alert("Vui lòng chọn lớp học.");
      return;
    }
    if (!newRequestData.session_id) {
      alert("Vui lòng chọn buổi học.");
      return;
    }
    if (!newRequestData.reason) {
      alert("Vui lòng nhập lý do.");
      return;
    }
    if (fileError) {
      alert(`Vui lòng sửa lỗi file: ${fileError}`);
      return;
    }

    const formData = new FormData();
    formData.append("session_id", newRequestData.session_id);
    formData.append("reason", newRequestData.reason);

    if (newRequestData.evidence_file instanceof File) {
      formData.append(
        "evidence_file",
        newRequestData.evidence_file,
        newRequestData.evidence_file.name
      );
    } else if (newRequestData.evidence_url) {
      formData.append("evidence_url", newRequestData.evidence_url);
    }

    dispatch(studentCreateAbsenceRequest(formData)).then((resultAction) => {
      if (studentCreateAbsenceRequest.fulfilled.match(resultAction)) {
        if (resultAction.payload.success) {
          handleCloseCreateModal();
        } else {
          // Hiển thị lỗi từ server nếu có, ví dụ: setCreateError(resultAction.payload.message)
          // Hoặc alert(resultAction.payload.message)
        }
      }
    });
  };

  // Handlers for Edit Modal
  const handleOpenEditModal = (request) => {
    setSelectedRequest(request);
    setNewRequestData({
      teaching_class_id: request.session_id?.teaching_class_id?._id || "",
      session_id: request.session_id?._id,
      reason: request.reason,
      evidence_url: request.evidence_url || "",
      evidence_file: null,
    });
    setSessions(request.session_id ? [request.session_id] : []);
    setFileInputKeyEdit((prevKey) => prevKey + 1);
    setSessionSelectionError(null);
    setOpenEditModal(true);
  };
  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedRequest(null);
    setNewRequestData({
      teaching_class_id: "",
      session_id: "",
      reason: "",
      evidence_url: "",
      evidence_file: null,
    });
  };
  const handleEditSubmit = () => {
    console.log("Starting handleEditSubmit...");
    console.log("Current newRequestData:", newRequestData);
    console.log("Selected request:", selectedRequest);

    if (
      !newRequestData.reason &&
      !newRequestData.evidence_file &&
      newRequestData.evidence_url === (selectedRequest?.evidence_url || "")
    ) {
      alert("Vui lòng nhập lý do hoặc thay đổi bằng chứng.");
      return;
    }

    const formData = new FormData();

    // Chỉ thêm reason nếu có thay đổi
    if (newRequestData.reason !== selectedRequest.reason) {
      console.log("Reason changed, adding to formData");
      formData.append("reason", newRequestData.reason);
    }

    // Xử lý bằng chứng
    if (newRequestData.evidence_file instanceof File) {
      console.log(
        "Adding new evidence file to formData:",
        newRequestData.evidence_file.name
      );
      formData.append("evidence_file", newRequestData.evidence_file);
    } else if (newRequestData.evidence_url !== selectedRequest.evidence_url) {
      console.log(
        "Evidence URL changed, adding to formData:",
        newRequestData.evidence_url
      );
      formData.append("evidence_url", newRequestData.evidence_url || "");
    }

    // Log formData contents
    console.log("FormData contents:");
    for (let pair of formData.entries()) {
      console.log(pair[0] + ": " + pair[1]);
    }

    console.log("Dispatching update request...");
    dispatch(
      studentUpdateAbsenceRequest({
        requestId: selectedRequest._id,
        updateData: formData,
      })
    )
      .then((resultAction) => {
        console.log("Update request result:", resultAction);
        if (studentUpdateAbsenceRequest.fulfilled.match(resultAction)) {
          if (resultAction.payload && resultAction.payload.success === false) {
            console.error("Server error:", resultAction.payload.message);
            alert("Lỗi cập nhật: " + resultAction.payload.message);
          } else {
            handleCloseEditModal();
          }
        } else if (studentUpdateAbsenceRequest.rejected.match(resultAction)) {
          console.error("Update request rejected:", resultAction.error);
          alert(
            "Lỗi cập nhật: " + (resultAction.error?.message || "Không xác định")
          );
        }
      })
      .catch((error) => {
        console.error("Unexpected error in handleEditSubmit:", error);
        alert("Lỗi không xác định khi cập nhật đơn: " + error.message);
      });
  };

  // Handlers for Delete Dialog
  const handleOpenConfirmDeleteDialog = (request) => {
    setSelectedRequest(request);
    setOpenConfirmDeleteDialog(true);
  };
  const handleCloseConfirmDeleteDialog = () => {
    setOpenConfirmDeleteDialog(false);
    setSelectedRequest(null);
  };
  const handleDeleteConfirm = () => {
    if (selectedRequest) {
      dispatch(studentCancelAbsenceRequest(selectedRequest._id)).then(
        (resultAction) => {
          if (studentCancelAbsenceRequest.fulfilled.match(resultAction)) {
            if (!cancelError) handleCloseConfirmDeleteDialog();
          }
        }
      );
    }
  };

  // Handlers for Evidence Modal
  const handleOpenEvidenceModal = (url) => {
    setEvidenceImageUrl(url);
    setOpenEvidenceModal(true);
  };

  const handleCloseEvidenceModal = () => {
    setOpenEvidenceModal(false);
    setEvidenceImageUrl("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "dd/MM/yyyy HH:mm", { locale: vi });
    } catch (e) {
      return dateString; // Trả về chuỗi gốc nếu không parse được
    }
  };

  const displayedItems = items.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading && items.length === 0) {
    // Chỉ hiển thị loading toàn trang khi chưa có data
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

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
          Đơn Xin Nghỉ Phép Của Tôi
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddCircleOutline />}
            onClick={handleOpenCreateModal}
            sx={{ mr: 1 }}
          >
            Tạo Đơn Mới
          </Button>
          <IconButton
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Làm mới"
          >
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {createError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Lỗi tạo đơn: {createError}
        </Alert>
      )}
      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Lỗi cập nhật đơn: {updateError}
        </Alert>
      )}
      {cancelError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Lỗi hủy đơn: {cancelError}
        </Alert>
      )}

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell>Buổi Học</TableCell>
                <TableCell>Môn Học</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell>Thời Gian</TableCell>
                <TableCell>Lý Do</TableCell>
                <TableCell>Trạng Thái</TableCell>
                <TableCell>Ngày Gửi</TableCell>
                <TableCell align="right">Hành Động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedItems.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Không có đơn xin nghỉ nào.
                  </TableCell>
                </TableRow>
              )}
              {displayedItems.map((request) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={request._id}>
                  <TableCell>
                    {request.session_id?.teaching_class_id?.class_name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {request.session_id?.teaching_class_id?.subject_id?.name ||
                      "N/A"}
                  </TableCell>
                  <TableCell>
                    {formatDate(request.session_id?.date).split(" ")[0]}
                  </TableCell>
                  <TableCell>
                    {request.session_id?.start_time &&
                    request.session_id?.end_time
                      ? `${format(
                          parseISO(request.session_id.start_time),
                          "HH:mm"
                        )} - ${format(
                          parseISO(request.session_id.end_time),
                          "HH:mm"
                        )}`
                      : "N/A"}
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {request.reason}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={request.status.toUpperCase()}
                      color={getStatusChipColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  <TableCell align="right">
                    {/* <IconButton size="small" onClick={() => alert('Xem chi tiết: ' + request._id)}><Visibility /></IconButton> */}
                    {request.status === "pending" && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditModal(request)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenConfirmDeleteDialog(request)}
                        >
                          <Delete />
                        </IconButton>
                      </>
                    )}
                    {/* Nút xem bằng chứng */}
                    {request.evidence_url && (
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleOpenEvidenceModal(request.evidence_url)
                        }
                        title="Xem bằng chứng"
                      >
                        <ImageIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={count} // Tổng số item từ state
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} trên ${count !== -1 ? count : `hơn ${to}`}`
          }
        />
      </Paper>

      {/* Create/Edit Modals - Dùng Dialog của MUI làm modal đơn giản */}
      {/* Create Modal */}
      <Dialog
        open={openCreateModal}
        onClose={handleCloseCreateModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tạo Đơn Xin Nghỉ Phép Mới</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Vui lòng chọn buổi học và điền đầy đủ thông tin.
          </DialogContentText>
          <TextField
            select
            margin="dense"
            name="teaching_class_id"
            label="Chọn lớp học"
            type="text"
            fullWidth
            variant="outlined"
            value={newRequestData.teaching_class_id}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            disabled={classesLoading}
            error={!!fetchClassesError}
            helperText={fetchClassesError}
            InputLabelProps={{ shrink: true }}
          >
            {classesLoading && (
              <MenuItem value="">
                <em>Đang tải lớp học...</em>
              </MenuItem>
            )}
            {!classesLoading &&
              myClasses.length === 0 &&
              !fetchClassesError && (
                <MenuItem value="">
                  <em>Không có lớp học nào.</em>
                </MenuItem>
              )}
            {myClasses.map((cls) => (
              <MenuItem key={cls._id} value={cls._id}>
                {cls.class_name} ({cls.class_code})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            margin="dense"
            name="session_id"
            label="Chọn buổi học cần nghỉ"
            type="text"
            fullWidth
            variant="outlined"
            value={newRequestData.session_id}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            disabled={
              sessionsLoading ||
              !newRequestData.teaching_class_id ||
              myClasses.length === 0
            }
            error={!!fetchSessionsError || !!sessionSelectionError}
            helperText={
              sessionSelectionError ||
              fetchSessionsError ||
              (!newRequestData.teaching_class_id && myClasses.length > 0
                ? "Vui lòng chọn lớp học trước"
                : sessions.length === 0 &&
                  newRequestData.teaching_class_id &&
                  !sessionsLoading &&
                  !fetchSessionsError
                ? "Không có buổi học nào có thể xin nghỉ cho lớp này."
                : "")
            }
            InputLabelProps={{ shrink: true }}
          >
            {sessionsLoading && (
              <MenuItem value="">
                <em>Đang tải buổi học...</em>
              </MenuItem>
            )}
            {!sessionsLoading &&
              sessions.length === 0 &&
              newRequestData.teaching_class_id &&
              !fetchSessionsError && (
                <MenuItem value="">
                  <em>Không có buổi học nào có thể xin nghỉ cho lớp này.</em>
                </MenuItem>
              )}
            {sessions.map((session) => (
              <MenuItem key={session._id} value={session._id}>
                {`${format(
                  parseISO(session.date),
                  "dd/MM/yyyy"
                )} - (Tiết ${format(
                  parseISO(session.start_time),
                  "HH:mm"
                )}-${format(parseISO(session.end_time), "HH:mm")}) - Phòng: ${
                  session.room?.room_number || "N/A"
                }`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            autoFocus
            margin="dense"
            name="reason"
            label="Lý Do Xin Nghỉ"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={newRequestData.reason}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          <Button
            component="label"
            variant="outlined"
            fullWidth
            sx={{
              mt: 1,
              mb: newRequestData.evidence_file ? 0 : 1,
              justifyContent: "flex-start",
            }}
          >
            Tải Lên Bằng Chứng (Ảnh)
            <input
              type="file"
              hidden
              name="evidence_file"
              accept="image/jpeg, image/png, image/gif"
              onChange={(e) => handleInputChange(e, false)}
              ref={evidenceFileCreateInputRef}
              key={fileInputKeyCreate}
            />
          </Button>
          {newRequestData.evidence_file && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1,
                border: "1px solid #ccc",
                borderRadius: "4px",
                mb: 1,
                mt: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {newRequestData.evidence_file.name}
              </Typography>
              <IconButton
                onClick={() => handleRemoveEvidenceFile(false)}
                size="small"
                title="Xóa file"
              >
                <Clear />
              </IconButton>
            </Box>
          )}
          {fileError && (
            <Typography
              color="error"
              variant="body2"
              display="block"
              sx={{
                mt: 0.5,
                mb: 1,
                ml: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ErrorOutline sx={{ fontSize: "1rem", mr: 0.5 }} />
              {fileError}
            </Typography>
          )}
          <TextField
            margin="dense"
            name="evidence_url"
            label="Hoặc nhập Link Bằng Chứng (nếu không tải file)"
            type="url"
            fullWidth
            variant="outlined"
            value={newRequestData.evidence_url}
            onChange={handleInputChange}
            disabled={!!newRequestData.evidence_file}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateModal} color="secondary">
            Hủy
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={
              creating ||
              !newRequestData.teaching_class_id ||
              !newRequestData.session_id ||
              !newRequestData.reason ||
              !!sessionSelectionError
            }
          >
            {creating ? <CircularProgress size={24} /> : "Gửi Đơn"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      {selectedRequest && (
        <Dialog
          open={openEditModal}
          onClose={handleCloseEditModal}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Chỉnh Sửa Đơn Xin Nghỉ Phép</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Buổi học:{" "}
              {`${
                selectedRequest.session_id?.teaching_class_id?.subject_id?.name
              } - ${
                selectedRequest.session_id?.teaching_class_id?.class_name
              } (${formatDate(selectedRequest.session_id?.date)})`}
              <br />
              Chỉ có thể chỉnh sửa lý do và bằng chứng. Buổi học không thể thay
              đổi.
            </DialogContentText>
            {/* Hiển thị ảnh bằng chứng hiện tại nếu có */}
            {selectedRequest && selectedRequest.evidence_url && (
              <Box sx={{ mb: 2, textAlign: "center" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Bằng chứng hiện tại:
                </Typography>
                <img
                  src={selectedRequest.evidence_url}
                  alt="Bằng chứng hiện tại"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "200px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none"; /* Ẩn nếu ảnh lỗi */
                  }}
                />
              </Box>
            )}
            <TextField
              disabled
              margin="dense"
              label="Buổi Học"
              type="text"
              fullWidth
              variant="outlined"
              value={`${
                selectedRequest.session_id?.teaching_class_id?.subject_id?.name
              } - ${
                selectedRequest.session_id?.teaching_class_id?.class_name
              } (${formatDate(selectedRequest.session_id?.date)})`}
              sx={{ mb: 2 }}
            />
            <TextField
              autoFocus
              margin="dense"
              name="reason"
              label="Lý Do Xin Nghỉ"
              type="text"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={newRequestData.reason}
              onChange={(e) => handleInputChange(e, true)}
              sx={{ mb: 2 }}
            />
            {/* Input tải file mới */}
            <Button
              component="label"
              variant="outlined"
              fullWidth
              sx={{
                mt: 1,
                mb: newRequestData.evidence_file ? 0 : 1,
                justifyContent: "flex-start",
              }}
            >
              Tải Lên Bằng Chứng Mới (Nếu muốn thay đổi/thêm)
              <input
                type="file"
                hidden
                name="evidence_file"
                accept="image/jpeg, image/png, image/gif"
                onChange={(e) => handleInputChange(e, true)}
                ref={evidenceFileEditInputRef}
                key={fileInputKeyEdit}
              />
            </Button>
            {newRequestData.evidence_file && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1,
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  mb: 1,
                  mt: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {newRequestData.evidence_file.name}
                </Typography>
                <IconButton
                  onClick={() => handleRemoveEvidenceFile(true)}
                  size="small"
                  title="Xóa file"
                >
                  <Clear />
                </IconButton>
              </Box>
            )}
            {fileError && (
              <Typography
                color="error"
                variant="body2"
                display="block"
                sx={{
                  mt: 0.5,
                  mb: 1,
                  ml: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ErrorOutline sx={{ fontSize: "1rem", mr: 0.5 }} />
                {fileError}
              </Typography>
            )}
            <TextField
              margin="dense"
              name="evidence_url"
              label="Hoặc nhập Link Bằng Chứng Mới (ghi đè file tải lên nếu có)"
              helperText="Để trống nếu muốn giữ lại bằng chứng cũ (và không tải file mới), hoặc xóa link nếu muốn bỏ bằng chứng dạng link."
              type="url"
              fullWidth
              variant="outlined"
              value={newRequestData.evidence_url}
              onChange={(e) => handleInputChange(e, true)}
              disabled={!!newRequestData.evidence_file}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditModal} color="secondary">
              Hủy
            </Button>
            <Button
              onClick={handleEditSubmit}
              variant="contained"
              disabled={
                updating ||
                (!newRequestData.reason &&
                  !newRequestData.evidence_file &&
                  newRequestData.evidence_url ===
                    (selectedRequest?.evidence_url || ""))
              }
            >
              {updating ? <CircularProgress size={24} /> : "Lưu Thay Đổi"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Confirm Delete Dialog */}
      <Dialog
        open={openConfirmDeleteDialog}
        onClose={handleCloseConfirmDeleteDialog}
      >
        <DialogTitle>Xác Nhận Hủy Đơn</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn hủy đơn xin nghỉ này không? Hành động này
            không thể hoàn tác.
            {selectedRequest && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Buổi học:{" "}
                {`${
                  selectedRequest.session_id?.teaching_class_id?.subject_id
                    ?.name
                } - ${
                  selectedRequest.session_id?.teaching_class_id?.class_name
                } (${formatDate(selectedRequest.session_id?.date)})`}
                <br />
                Lý do: {selectedRequest.reason}
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDeleteDialog} color="secondary">
            Không
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={cancelling}
          >
            {cancelling ? <CircularProgress size={24} /> : "Có, Hủy Đơn"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Evidence View Modal */}
      <Dialog
        open={openEvidenceModal}
        onClose={handleCloseEvidenceModal}
        maxWidth="md"
      >
        <DialogTitle>Bằng Chứng Xin Nghỉ</DialogTitle>
        <DialogContent>
          {evidenceImageUrl ? (
            <img
              src={evidenceImageUrl}
              alt="Bằng chứng"
              style={{ maxWidth: "100%", maxHeight: "80vh" }}
            />
          ) : (
            <Typography>Không có hình ảnh bằng chứng.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEvidenceModal}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyAbsenceRequestsPage;
