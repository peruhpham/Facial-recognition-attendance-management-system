# Hệ Thống Điểm Danh Bằng Khuôn Mặt (FaceReg)

## Giới thiệu

**FaceReg** là hệ thống điểm danh thông minh sử dụng công nghệ nhận diện khuôn mặt, được thiết kế đặc biệt cho môi trường giáo dục. Dự án hiện đại hóa quy trình điểm danh truyền thống, giúp tăng hiệu quả, độ chính xác và tiết kiệm thời gian.

## Mục lục

- [Use Cases](#use-cases)
- [Cấu trúc Database](#cấu-trúc-database)
- [Chức năng chi tiết](#chức-năng-chi-tiết)
- [Quy trình nghiệp vụ](#quy-trình-nghiệp-vụ)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Endpoints](#api-endpoints)
- [Cài đặt và chạy](#cài-đặt-và-chạy)
- [Biến môi trường](#biến-môi-trường)
- [Đóng góp và phát triển](#đóng-góp-và-phát-triển)
- [License](#license)

## Use Cases

### Admin

- **Quản lý người dùng**: Tạo, xem, chỉnh sửa, vô hiệu hóa tài khoản
- **Quản lý khoa/ngành**: Tạo, chỉnh sửa cấu trúc tổ chức giáo dục
- **Quản lý lớp học**: Phân bổ giáo viên, sinh viên vào các lớp
- **Phân quyền**: Quản lý quyền truy cập hệ thống
- **Thống kê báo cáo**: Xem báo cáo tổng quan về điểm danh, hiệu suất

### Giáo viên

- **Quản lý lớp học**: Xem danh sách sinh viên, thông tin lớp
- **Tạo phiên điểm danh**: Khởi tạo và quản lý các buổi điểm danh
- **Theo dõi điểm danh**: Xem trạng thái có mặt của sinh viên theo thời gian thực
- **Điều chỉnh kết quả**: Sửa đổi trạng thái điểm danh trong trường hợp đặc biệt
- **Xuất báo cáo**: Tạo và tải xuống báo cáo điểm danh (PDF, Excel)
- **Quản lý thông báo**: Gửi thông báo đến sinh viên

### Sinh viên

- **Đăng ký khuôn mặt**: Thêm và cập nhật ảnh khuôn mặt
- **Điểm danh nhanh**: Thực hiện điểm danh bằng camera
- **Xem lịch sử**: Theo dõi thống kê chuyên cần cá nhân
- **Gửi đơn xin phép**: Đăng ký nghỉ học có phép
- **Nhận thông báo**: Xem thông báo từ giáo viên và hệ thống

## Cấu trúc Database

### Collections

#### Users

```json
{
  "_id": "ObjectId",
  "email": "String (unique)",
  "password": "String (hashed)",
  "fullName": "String",
  "role": "String (enum: 'admin', 'teacher', 'student')",
  "avatar": "String (URL)",
  "googleId": "String (optional)",
  "faceDescriptors": [Number],
  "department": "ObjectId (ref: 'Department')",
  "studentId": "String (for students)",
  "createdAt": "Date",
  "updatedAt": "Date",
  "isActive": "Boolean"
}
```

#### Departments

```json
{
  "_id": "ObjectId",
  "name": "String",
  "code": "String (unique)",
  "description": "String",
  "faculty": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

#### Classes

```json
{
  "_id": "ObjectId",
  "name": "String",
  "code": "String (unique)",
  "description": "String",
  "department": "ObjectId (ref: 'Department')",
  "teacher": "ObjectId (ref: 'User')",
  "students": ["ObjectId (ref: 'User')"],
  "schedule": {
    "dayOfWeek": "Number (0-6)",
    "startTime": "String (HH:MM)",
    "endTime": "String (HH:MM)",
    "location": "String"
  },
  "semester": "String",
  "academicYear": "String",
  "createdAt": "Date",
  "updatedAt": "Date",
  "isActive": "Boolean"
}
```

#### AttendanceSessions

```json
{
  "_id": "ObjectId",
  "class": "ObjectId (ref: 'Class')",
  "title": "String",
  "date": "Date",
  "startTime": "Date",
  "endTime": "Date",
  "status": "String (enum: 'scheduled', 'active', 'completed', 'cancelled')",
  "createdBy": "ObjectId (ref: 'User')",
  "attendanceRecords": ["ObjectId (ref: 'AttendanceRecord')"],
  "notes": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

#### AttendanceRecords

```json
{
  "_id": "ObjectId",
  "session": "ObjectId (ref: 'AttendanceSession')",
  "student": "ObjectId (ref: 'User')",
  "status": "String (enum: 'present', 'absent', 'late', 'excused')",
  "checkInTime": "Date",
  "detectionConfidence": "Number",
  "device": "String",
  "location": {
    "latitude": "Number",
    "longitude": "Number"
  },
  "verifiedBy": "ObjectId (ref: 'User')",
  "notes": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

#### LeaveRequests

```json
{
  "_id": "ObjectId",
  "student": "ObjectId (ref: 'User')",
  "classes": ["ObjectId (ref: 'Class')"],
  "startDate": "Date",
  "endDate": "Date",
  "reason": "String",
  "documents": ["String (URLs)"],
  "status": "String (enum: 'pending', 'approved', 'rejected')",
  "reviewedBy": "ObjectId (ref: 'User')",
  "reviewNotes": "String",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

#### Notifications

```json
{
  "_id": "ObjectId",
  "sender": "ObjectId (ref: 'User')",
  "recipients": ["ObjectId (ref: 'User')"],
  "title": "String",
  "message": "String",
  "type": "String (enum: 'system', 'attendance', 'leave', 'announcement')",
  "relatedTo": "ObjectId",
  "relatedModel": "String",
  "isRead": ["ObjectId (ref: 'User')"],
  "createdAt": "Date"
}
```

## Chức năng chi tiết

### Quản lý người dùng

- Đăng ký và xác thực (Email/Password, Google OAuth)
- Quản lý thông tin cá nhân và hồ sơ
- Đổi mật khẩu và khôi phục mật khẩu
- Quản lý ảnh đại diện và thông tin liên hệ

### Nhận diện khuôn mặt

- Đăng ký khuôn mặt với nhiều góc nhìn
- Nhận diện theo thời gian thực qua webcam
- Xác thực danh tính với độ chính xác cao
- Khả năng phát hiện giả mạo (liveness detection)

### Quản lý lớp học

- Thêm/sửa/xóa thông tin lớp học
- Gán giáo viên phụ trách
- Quản lý danh sách sinh viên
- Cấu hình lịch học và thời gian

### Điểm danh

- Tạo phiên điểm danh với thời gian quy định
- Điểm danh bằng khuôn mặt qua webcam
- Ghi nhận thời gian điểm danh
- Điểm danh thủ công trong trường hợp đặc biệt
- Xác định vị trí điểm danh (tùy chọn)

### Thống kê và báo cáo

- Thống kê điểm danh theo lớp/sinh viên
- Tính toán tỷ lệ chuyên cần
- Xuất báo cáo nhiều định dạng (PDF, Excel)
- Biểu đồ trực quan hóa dữ liệu

### Thông báo

- Thông báo phiên điểm danh mới
- Cảnh báo vắng mặt
- Thông báo kết quả xin nghỉ phép
- Gửi email/push notification

## Quy trình nghiệp vụ

### Quy trình thiết lập hệ thống

1. Admin tạo cấu trúc khoa/ngành
2. Admin tạo tài khoản giáo viên và sinh viên
3. Admin phân bổ giáo viên và sinh viên vào khoa/ngành
4. Giáo viên tạo và quản lý lớp học
5. Sinh viên đăng ký và huấn luyện nhận diện khuôn mặt

### Quy trình điểm danh

1. Giáo viên tạo phiên điểm danh mới
2. Hệ thống tạo mã QR/mã phiên duy nhất
3. Sinh viên quét mã và kích hoạt camera
4. Hệ thống nhận diện và xác thực khuôn mặt
5. Hệ thống ghi nhận kết quả điểm danh
6. Giáo viên xem kết quả theo thời gian thực
7. Phiên điểm danh tự động đóng sau thời gian quy định
8. Hệ thống tổng hợp kết quả và gửi thông báo

### Quy trình xin nghỉ phép

1. Sinh viên tạo đơn xin nghỉ phép
2. Sinh viên đính kèm tài liệu minh chứng (nếu cần)
3. Giáo viên xem và duyệt đơn
4. Hệ thống cập nhật trạng thái điểm danh thành "có phép"
5. Sinh viên nhận thông báo kết quả

## Kiến trúc hệ thống

![Kiến trúc hệ thống](https://via.placeholder.com/800x400?text=FaceReg+System+Architecture)

- **Frontend**: Single Page Application (SPA) với React
- **Backend**: RESTful API với Node.js/Express
- **Database**: MongoDB NoSQL
- **Authentication**: JWT + OAuth2
- **Face Recognition**: TensorFlow.js + face-api.js
- **Storage**: Lưu trữ ảnh với MongoDB GridFS hoặc cloud storage
- **Notification**: WebSocket + Email

## Công nghệ sử dụng

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: MongoDB 6.0+ với Mongoose 7.0+
- **Authentication**: JWT, Passport.js
- **Validation**: Joi/Yup
- **File Upload**: Multer
- **Email**: Nodemailer
- **Logging**: Winston
- **Testing**: Jest, Supertest

### Frontend

- **Library**: React 18+
- **State Management**: Redux Toolkit + Redux Persist
- **UI Framework**: Material UI v5
- **Routing**: React Router v6
- **Form Management**: React Hook Form
- **Data Fetching**: Axios + React Query
- **Charts**: Chart.js/Recharts
- **Face Recognition**: face-api.js (TensorFlow.js)
- **Camera**: react-webcam
- **PDF Generation**: jsPDF
- **Excel Export**: ExcelJS

### DevOps

- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Deployment**: Vercel/Netlify (Frontend), Railway/Render (Backend)

## Cấu trúc dự án

```
FaceReg/
├── backend/                   # API server
│   ├── src/
│   │   ├── config/            # Cấu hình
│   │   ├── controllers/       # Xử lý logic nghiệp vụ
│   │   ├── middlewares/       # Middleware
│   │   ├── models/            # MongoDB Schema
│   │   ├── routes/            # API Endpoints
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Utility functions
│   │   ├── validations/       # Validation schemas
│   │   └── app.js             # Express app
│   ├── uploads/               # Upload directory
│   ├── tests/                 # Unit/Integration tests
│   ├── .env.example           # Environment variables example
│   ├── package.json           # Dependencies
│   └── README.md              # Backend documentation
│
├── frontend/                  # React application
│   ├── public/
│   │   ├── models/            # Face-api models
│   │   └── locales/           # i18n translations
│   ├── src/
│   │   ├── assets/            # Static assets
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React Context
│   │   ├── features/          # Feature modules
│   │   ├── hooks/             # Custom hooks
│   │   ├── layouts/           # Layout components
│   │   ├── pages/             # Page components
│   │   ├── redux/             # Redux store
│   │   ├── services/          # API services
│   │   ├── utils/             # Utility functions
│   │   ├── App.js             # Root component
│   │   └── index.js           # Entry point
│   ├── .env.example           # Environment variables example
│   ├── package.json           # Dependencies
│   └── README.md              # Frontend documentation
│
├── docs/                      # Documentation
│   ├── api/                   # API documentation
│   ├── deployment/            # Deployment guides
│   └── diagrams/              # System diagrams
│
├── docker/                    # Docker configuration
│   ├── docker-compose.yml     # Docker compose
│   ├── Dockerfile.backend     # Backend Dockerfile
│   └── Dockerfile.frontend    # Frontend Dockerfile
│
├── .github/                   # GitHub configuration
│   └── workflows/             # GitHub Actions
│
├── .gitignore                 # Git ignore file
├── LICENSE                    # MIT License
└── README.md                  # Main documentation
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại
- `POST /api/auth/refresh-token` - Làm mới token
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu

### Users

- `GET /api/users` - Lấy danh sách người dùng (Admin)
- `GET /api/users/:id` - Lấy thông tin người dùng
- `PUT /api/users/:id` - Cập nhật thông tin người dùng
- `DELETE /api/users/:id` - Vô hiệu hóa tài khoản
- `POST /api/users/:id/avatar` - Cập nhật ảnh đại diện
- `POST /api/users/:id/face` - Đăng ký khuôn mặt

### Departments

- `GET /api/departments` - Danh sách khoa/ngành
- `POST /api/departments` - Tạo khoa/ngành mới (Admin)
- `PUT /api/departments/:id` - Cập nhật khoa/ngành
- `DELETE /api/departments/:id` - Xóa khoa/ngành

### Classes

- `GET /api/classes` - Danh sách lớp học
- `POST /api/classes` - Tạo lớp học mới (Admin/Teacher)
- `GET /api/classes/:id` - Chi tiết lớp học
- `PUT /api/classes/:id` - Cập nhật lớp học
- `DELETE /api/classes/:id` - Xóa lớp học
- `POST /api/classes/:id/students` - Thêm sinh viên vào lớp
- `DELETE /api/classes/:id/students/:studentId` - Xóa sinh viên khỏi lớp

### Attendance

- `POST /api/attendance/sessions` - Tạo phiên điểm danh
- `GET /api/attendance/sessions` - Danh sách phiên điểm danh
- `GET /api/attendance/sessions/:id` - Chi tiết phiên điểm danh
- `PUT /api/attendance/sessions/:id` - Cập nhật phiên điểm danh
- `DELETE /api/attendance/sessions/:id` - Xóa phiên điểm danh
- `POST /api/attendance/check-in` - Sinh viên điểm danh
- `PUT /api/attendance/records/:id` - Cập nhật kết quả điểm danh (Teacher)
- `GET /api/attendance/reports/class/:classId` - Báo cáo điểm danh theo lớp
- `GET /api/attendance/reports/student/:studentId` - Báo cáo điểm danh theo sinh viên

### Leave Requests

- `POST /api/leave-requests` - Tạo đơn xin nghỉ phép
- `GET /api/leave-requests` - Danh sách đơn xin nghỉ phép
- `GET /api/leave-requests/:id` - Chi tiết đơn xin nghỉ phép
- `PUT /api/leave-requests/:id` - Cập nhật đơn xin nghỉ phép
- `PUT /api/leave-requests/:id/review` - Duyệt/từ chối đơn xin nghỉ phép

### Notifications

- `GET /api/notifications` - Danh sách thông báo
- `POST /api/notifications` - Tạo thông báo mới
- `PUT /api/notifications/:id/read` - Đánh dấu đã đọc
- `DELETE /api/notifications/:id` - Xóa thông báo

## Cài đặt và chạy

### Yêu cầu hệ thống

- Node.js 18.x trở lên
- MongoDB 6.0 trở lên
- NPM hoặc Yarn
- Webcam (cho tính năng nhận diện khuôn mặt)

### Cài đặt

1. **Clone repository**

```bash
git clone https://github.com/yourusername/FaceReg.git
cd FaceReg
```

2. **Cài đặt Backend**

```bash
cd backend
npm install
cp .env.example .env
# Chỉnh sửa file .env với thông tin cấu hình phù hợp
```

3. **Cài đặt Frontend**

```bash
cd ../frontend
npm install
cp .env.example .env
# Chỉnh sửa file .env với thông tin cấu hình phù hợp
```

4. **Tải mô hình face-api.js**

```bash
mkdir -p public/models
cd public/models

# Tải các mô hình cần thiết
curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-shard1
curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1
curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json
curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1
curl -O https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard2
```

### Chạy ứng dụng

1. **Khởi động Backend**

```bash
cd backend
npm run dev
# Server sẽ chạy tại http://localhost:5000
```

2. **Khởi động Frontend**

```bash
cd frontend
npm start
# Ứng dụng sẽ mở tại http://localhost:3000
```

### Sử dụng Docker

```bash
docker-compose up
# Ứng dụng sẽ chạy tại http://localhost:3000
```

## Biến môi trường

### Backend (.env)

```
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/facereg

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=noreply@facereg.com
FROM_NAME=FaceReg

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Upload limits
MAX_FILE_SIZE=5000000
```

### Frontend (.env)

```
# API URL
REACT_APP_API_URL=http://localhost:5000/api

# Face API
REACT_APP_FACE_API_MODELS_URL=/models
REACT_APP_FACE_DETECTION_MIN_CONFIDENCE=0.5

# Features flags
REACT_APP_ENABLE_GEOLOCATION=false
REACT_APP_ENABLE_NOTIFICATIONS=true

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```
