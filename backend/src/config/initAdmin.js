const bcrypt = require("bcryptjs");
const { User } = require("../models/schemas");

/**
 * Hàm khởi tạo tài khoản admin mặc định nếu chưa tồn tại
 */
const initAdmin = async () => {
  try {
    // Kiểm tra xem đã có admin trong hệ thống chưa
    const adminCount = await User.countDocuments({ role: "admin" });

    if (adminCount === 0) {
      console.log("Đang tạo tài khoản admin mặc định...");

      // Tạo salt và hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("123456", salt);

      // Tạo tài khoản admin
      await User.create({
        email: "admin@sys.com",
        password: hashedPassword,
        full_name: "Administrator",
        role: "admin",
        status: "approved",
        created_at: Date.now(),
      });

      console.log("Đã tạo tài khoản admin mặc định:");
      console.log("- Email: admin@sys.com");
      console.log("- Mật khẩu: 123456");
      console.log("Hãy đổi mật khẩu sau khi đăng nhập lần đầu!");
    }
  } catch (error) {
    console.error("Lỗi khi tạo tài khoản admin:", error);
  }
};

module.exports = initAdmin;
