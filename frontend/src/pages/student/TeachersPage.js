import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { getTeachers } from "../../services/teacherService"; // Import hàm API mới

const TeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        setError(null);
        // Gọi API thực tế để lấy danh sách giảng viên
        const data = await getTeachers();
        // Kiểm tra cấu trúc dữ liệu trả về từ API và cập nhật nếu cần
        // Ví dụ: nếu API trả về { teachers: [...] } thì dùng data.teachers
        setTeachers(data || []); // Sử dụng dữ liệu từ API, đảm bảo là array

        // Xóa hoặc comment out dữ liệu giả lập
        // const mockTeachers = [
        //   { id: 1, name: 'Nguyễn Văn A', email: 'a.nv@example.com', department: 'Công nghệ thông tin', subjects: ['Lập trình Web', 'Cơ sở dữ liệu'] },
        //   { id: 2, name: 'Trần Thị B', email: 'b.tt@example.com', department: 'Toán ứng dụng', subjects: ['Giải tích 1', 'Xác suất thống kê'] },
        //   { id: 3, name: 'Lê Văn C', email: 'c.lv@example.com', department: 'Vật lý kỹ thuật', subjects: ['Vật lý 1', 'Điện tử cơ bản'] },
        // ];
        // await new Promise(resolve => setTimeout(resolve, 1000));
        // setTeachers(mockTeachers);
      } catch (err) {
        console.error("Lỗi khi tải danh sách giảng viên:", err);
        setError("Không thể tải danh sách giảng viên. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  if (loading) {
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

  if (error) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Thông tin Giảng viên
      </Typography>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>STT</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Họ và tên</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Khoa</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Số điện thoại</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Không có dữ liệu giảng viên.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((teacher, index) => (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={teacher.id}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{teacher.name}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.department}</TableCell>
                    <TableCell>
                      {teacher.contact?.phone || "Chưa cập nhật"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default TeachersPage;
