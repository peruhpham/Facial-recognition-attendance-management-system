const jwt = require("jsonwebtoken");
const { User } = require("../models/schemas");
require("dotenv").config();
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(" ")[1];

      // Xác minh token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Gán người dùng vào request
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      next();
    } catch (error) {
      console.error(error);

      // Phân biệt các loại lỗi token
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Phiên đăng nhập đã hết hạn",
          errorType: "TOKEN_EXPIRED",
        });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Token không hợp lệ",
          errorType: "INVALID_TOKEN",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Không được phép truy cập, token không hợp lệ",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Không được phép truy cập, không có token",
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Kiểm tra nếu roles là mảng phẳng hoặc mảng lồng nhau
    const flatRoles = roles.flat();

    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Vai trò ${req.user.role} không có quyền thực hiện thao tác này`,
      });
    }
    next();
  };
};
