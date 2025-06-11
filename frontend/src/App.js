import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { getCurrentUser, logout } from "./redux/slices/authSlice";
import jwtDecode from "jwt-decode";
import { toast } from "react-hot-toast";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import DashboardPage from "./pages/DashboardPage";
import FaceRegistrationPage from "./pages/FaceRegistrationPage";
import GoogleRedirectPage from "./pages/GoogleRedirectPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import CompleteRegistrationPage from "./pages/CompleteRegistrationPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Student Pages
import StudentClassesPage from "./pages/student/ClassesPage";
import StudentAttendancePage from "./pages/student/AttendancePage";
import StudentScoresPage from "./pages/student/ScoresPage";
import StudentTeachersPage from "./pages/student/TeachersPage";
import MyAbsenceRequestsPage from "./pages/student/MyAbsenceRequestsPage";

// Teacher Pages
import TeacherClassesPage from "./pages/teacher/ClassesPage";
import TeacherClassDetailPage from "./pages/teacher/ClassDetailPage";
import TeacherAttendancePage from "./pages/teacher/AttendancePage";
import TeacherMainClassPage from "./pages/teacher/MainClassPage";
import CameraTestPage from "./pages/teacher/CameraTestPage";

// Admin Pages
import AdminUsersPage from "./pages/admin/UsersPage";
import AdminClassesPage from "./pages/admin/ClassesPage";
import AdminDepartmentsPage from "./pages/admin/DepartmentsPage";
import AdminFacilitiesPage from "./pages/admin/FacilitiesPage";
import AdminSemestersPage from "./pages/admin/SemestersPage";
import AdminSubjectsPage from "./pages/admin/SubjectsPage";
import MajorsPage from "./pages/admin/MajorsPage";
import TestPage from "./pages/admin/TestPage";

// Layouts
import MainLayout from "./layouts/MainLayout";
import MinimalLayout from "./layouts/MinimalLayout";

// Auth check
import ProtectedRoute from "./components/ProtectedRoute";

// Hàm kiểm tra token hết hạn
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const decoded = jwtDecode(token);
    return decoded.exp < Date.now() / 1000;
  } catch (error) {
    console.error("Token decode error:", error);
    return true;
  }
};

const App = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);

  // Kiểm tra token hết hạn khi ứng dụng khởi động
  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      if (isTokenExpired(storedToken)) {
        // Token đã hết hạn
        toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        dispatch(logout());
        navigate("/login");
      } else if (!user && token === storedToken) {
        // Token hợp lệ, lấy thông tin người dùng
        dispatch(getCurrentUser());
      }
    }
  }, [dispatch, user, token, navigate]);

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MinimalLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="role-selection" element={<RoleSelectionPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password/:token" element={<ResetPasswordPage />} />

        {/* Routes cho đăng nhập Google */}
        <Route path="login/success" element={<GoogleRedirectPage />} />
        <Route path="login/error" element={<GoogleRedirectPage />} />

        {/* Routes cho đăng ký và phê duyệt */}
        <Route
          path="complete-registration"
          element={<CompleteRegistrationPage />}
        />
        <Route path="pending-approval" element={<PendingApprovalPage />} />
      </Route>

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="register-face" element={<FaceRegistrationPage />} />

        {/* Student Routes */}
        <Route path="student">
          <Route
            path="classes"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="attendance/:classId"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="scores"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentScoresPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="teachers"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentTeachersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="absence-requests"
            element={
              <ProtectedRoute roles={["student"]}>
                <MyAbsenceRequestsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Teacher Routes */}
        <Route path="teacher">
          <Route
            path="classes"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="classes/:classId"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherClassDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="attendance/:classId/:sessionId"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="main-class"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <TeacherMainClassPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="camera-test"
            element={
              <ProtectedRoute roles={["teacher"]}>
                <CameraTestPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Admin Routes */}
        <Route path="admin">
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="classes" element={<AdminClassesPage />} />
          <Route path="departments" element={<AdminDepartmentsPage />} />
          <Route path="majors" element={<MajorsPage />} />
          <Route path="semesters" element={<AdminSemestersPage />} />
          <Route path="subjects" element={<AdminSubjectsPage />} />
          <Route path="facilities" element={<AdminFacilitiesPage />} />
          <Route path="test" element={<TestPage />} />
        </Route>
      </Route>

      {/* Not Found Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
