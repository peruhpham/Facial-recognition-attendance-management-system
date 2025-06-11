import axios from "../utils/axios";

// Auth APIs
export const login = (credentials) => axios.post("/auth/login", credentials);
export const register = (userData) => axios.post("/auth/register", userData);
export const getCurrentUser = () => axios.get("/auth/me");

// Attendance APIs
export const getAttendanceSessions = (teachingClassId) =>
  axios.get(`/attendance/teaching-class/${teachingClassId}/sessions`);
export const createAttendanceSession = (sessionData) =>
  axios.post("/attendance/sessions", sessionData);
export const getAttendanceLogs = (studentId, teachingClassId) =>
  axios.get(`/attendance/student/${studentId}/logs`, {
    params: { teaching_class: teachingClassId },
  });

// Class APIs
export const getTeacherClasses = (teacherId) =>
  axios.get(`/classes/teaching/teacher/${teacherId}`);
export const getTeachingClassById = (id) =>
  axios.get(`/classes/teaching/${id}`);
export const checkScheduleConflicts = (data) =>
  axios.post(`/classes/teaching/check-conflicts`, data);
export const createTeachingClass = (classData) =>
  axios.post(`/classes/teaching`, classData);
export const updateTeachingClass = (id, classData) =>
  axios.put(`/classes/teaching/${id}`, classData);
export const addStudentsToClass = (teachingClassId, studentIds) =>
  axios.post(`/classes/teaching/${teachingClassId}/students/batch`, {
    student_ids: studentIds,
  });
export const removeStudentFromClass = (teachingClassId, studentId) =>
  axios.delete(`/classes/teaching/${teachingClassId}/students/${studentId}`);

// Face Recognition APIs
export const registerFace = (faceData) =>
  axios.post("/face-recognition/register", faceData);
export const verifyFace = (faceData) =>
  axios.post("/face-recognition/verify", faceData);

// Semester APIs
export const getAllSemesters = () => axios.get("/semesters");

// Student APIs
export const getStudentClasses = (studentId) =>
  axios.get(`/students/${studentId}/classes`);
export const getStudentAttendance = (studentId, teachingClassId) =>
  axios.get(`/students/${studentId}/attendance`, {
    params: { teaching_class: teachingClassId },
  });

// Department APIs (MỚI - nếu chưa có, hoặc để MajorsPage dùng)
export const getDepartments = () => axios.get("/departments");

// Major APIs (MỚI)
export const getMajors = (departmentId = null) => {
  let url = "/majors";
  if (departmentId) {
    url += `?department_id=${departmentId}`;
  }
  return axios.get(url);
};
export const createMajor = (data) => axios.post("/majors", data);
export const updateMajor = (id, data) => axios.put(`/majors/${id}`, data);
export const deleteMajor = (id) => axios.delete(`/majors/${id}`);
