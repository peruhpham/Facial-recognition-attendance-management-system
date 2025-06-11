import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "../utils/axios";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { Person, Edit } from "@mui/icons-material";
import { setCredentials } from "../redux/slices/authSlice";

const API_URL = process.env.REACT_APP_API_URL;

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    student_id: "",
    teacher_code: "",
    department: "",
    major: "",
    class_name: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?._id) {
        setLoadingProfile(true);
        try {
          const response = await axios.get(`${API_URL}/users/${user._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const profileData = response.data.data;
          setFormData({
            full_name: profileData.full_name || "",
            email: profileData.email || "",
            phone: profileData.contact?.phone || "",
            student_id: profileData.school_info?.student_id || "",
            teacher_code: profileData.school_info?.teacher_code || "",
            department:
              profileData.role === "student"
                ? profileData.school_info?.class_id?.major_id?.department_id
                    ?.name ||
                  profileData.school_info?.major_id?.department_id?.name ||
                  profileData.school_info?.department_id?.name ||
                  ""
                : profileData.school_info?.department_id?.name || "",
            major:
              profileData.role === "student"
                ? profileData.school_info?.class_id?.major_id?.name ||
                  profileData.school_info?.major_id?.name ||
                  ""
                : "",
            class_name:
              profileData.role === "student"
                ? profileData.school_info?.class_id?.name ||
                  profileData.school_info?.class ||
                  ""
                : "",
          });
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError("Không thể tải thông tin hồ sơ.");
          setFormData({
            full_name: user.full_name || "",
            email: user.email || "",
            phone: user.contact?.phone || "",
            student_id: user.school_info?.student_id || "",
            teacher_code: user.school_info?.teacher_code || "",
            department: "",
            major: "",
            class_name: "",
          });
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [user?._id, token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const updateData = {
        full_name: formData.full_name,
        contact: {
          phone: formData.phone,
        },
        school_info: {
          student_id: formData.student_id,
          teacher_code: formData.teacher_code,
          department: formData.department,
        },
      };

      const response = await axios.put(
        `${API_URL}/users/${user._id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      dispatch(
        setCredentials({
          user: response.data.data,
          token,
        })
      );

      setSuccessMessage("Cập nhật thông tin thành công");
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi cập nhật thông tin");
      console.error("Error updating profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setSuccessMessage("Chức năng đặt lại mật khẩu đang được phát triển");
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Hồ sơ cá nhân
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessMessage("")} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "primary.main",
              mr: 2,
            }}
          >
            <Person sx={{ fontSize: 40 }} />
          </Avatar>
          <Box>
            <Typography variant="h5">{user?.full_name}</Typography>
            <Typography color="textSecondary">
              {user?.role === "admin"
                ? "Quản trị viên"
                : user?.role === "teacher"
                ? "Giảng viên"
                : "Sinh viên"}
            </Typography>
          </Box>
          {!isEditing && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              sx={{ ml: "auto" }}
              onClick={() => setIsEditing(true)}
            >
              Chỉnh sửa
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Họ và tên"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                disabled
                variant="filled"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                variant={isEditing ? "outlined" : "filled"}
              />
            </Grid>
            {user?.role === "student" && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Mã số sinh viên (MSSV)"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant={isEditing ? "outlined" : "filled"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Lớp"
                    name="class_name"
                    value={formData.class_name}
                    disabled
                    variant={"filled"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ngành học"
                    name="major"
                    value={formData.major}
                    disabled
                    variant={"filled"}
                  />
                </Grid>
              </>
            )}
            {user?.role === "teacher" && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Mã giảng viên"
                  name="teacher_code"
                  value={formData.teacher_code}
                  onChange={handleChange}
                  disabled={!isEditing}
                  variant={isEditing ? "outlined" : "filled"}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Khoa/Phòng ban"
                name="department"
                value={formData.department}
                disabled={!isEditing}
                variant={isEditing && false ? "outlined" : "filled"}
              />
            </Grid>

            {isEditing && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        full_name: user.full_name || "",
                        email: user.email || "",
                        phone: user.contact?.phone || "",
                        student_id: user.school_info?.student_id || "",
                        teacher_code: user.school_info?.teacher_code || "",
                        department: user.school_info?.department || "",
                        major: "",
                        class_name: "",
                      });
                    }}
                    disabled={isLoading}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </form>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bảo mật
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Button
          variant="outlined"
          color="primary"
          onClick={handleResetPassword}
          sx={{ mt: 1 }}
        >
          Đổi mật khẩu
        </Button>
      </Paper>
    </Box>
  );
};

export default ProfilePage;
