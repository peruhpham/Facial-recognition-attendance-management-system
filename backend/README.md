# Hệ Thống Điểm Danh Bằng Khuôn Mặt - Backend

Đây là phần backend của hệ thống điểm danh bằng khuôn mặt, phát triển bằng Node.js, Express và MongoDB.

## Tính năng chính

- Xác thực người dùng (JWT, Google OAuth)
- Quản lý người dùng (sinh viên, giáo viên, admin)
- Quản lý lớp học và phiên điểm danh
- Nhận diện khuôn mặt và điểm danh tự động
- Tính toán điểm chuyên cần

## Cài đặt

1. Cài đặt các dependencies:

```
npm install
```

2. Cấu hình file .env:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/facereg_attendance
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

3. Khởi động server:

```
npm run dev
```

## Cấu trúc dữ liệu

- **Users**: Người dùng (sinh viên, giáo viên, admin)
- **Departments**: Khoa
- **Courses**: Môn học
- **MainClasses**: Lớp chính (lớp cố định)
- **TeachingClasses**: Lớp học phần
- **AttendanceSessions**: Phiên điểm danh
- **AttendanceLogs**: Log điểm danh
- **StudentScores**: Điểm chuyên cần

## API Endpoints

### Xác thực

- `POST /api/auth/login`: Đăng nhập
- `POST /api/auth/register`: Đăng ký
- `GET /api/auth/me`: Lấy thông tin người dùng hiện tại
- `GET /api/auth/google`: Đăng nhập bằng Google

### Người dùng

- `GET /api/users`: Lấy danh sách người dùng
- `GET /api/users/:id`: Lấy thông tin người dùng
- `PUT /api/users/:id`: Cập nhật thông tin người dùng
- `DELETE /api/users/:id`: Xóa người dùng

### Lớp học

- `GET /api/teaching-classes`: Lấy danh sách lớp học
- `POST /api/teaching-classes`: Tạo lớp học mới
- `GET /api/teaching-classes/:id`: Lấy thông tin lớp học
- `PUT /api/teaching-classes/:id`: Cập nhật lớp học
- `DELETE /api/teaching-classes/:id`: Xóa lớp học

### Điểm danh

- `POST /api/attendance/sessions`: Tạo phiên điểm danh mới
- `GET /api/attendance/sessions/:id`: Lấy thông tin phiên điểm danh
- `PUT /api/attendance/sessions/:id`: Cập nhật phiên điểm danh
- `GET /api/attendance/logs/:sessionId`: Lấy danh sách logs điểm danh

### Nhận diện khuôn mặt

- `POST /api/face-recognition/save-features`: Lưu đặc trưng khuôn mặt
- `GET /api/face-recognition/class-features/:classId`: Lấy đặc trưng khuôn mặt của sinh viên trong lớp
- `POST /api/face-recognition/verify-attendance`: Xác nhận điểm danh bằng khuôn mặt
- `POST /api/face-recognition/manual-attendance`: Điểm danh thủ công

## Công nghệ sử dụng

- Node.js
- Express.js
- MongoDB & Mongoose
- JWT (JSON Web Tokens)
- Passport.js (JWT & Google OAuth)
- Bcrypt.js (Mã hóa mật khẩu)
