const cloudinary = require("cloudinary").v2;

// Cấu hình Cloudinary sẽ được thực hiện ở file config riêng hoặc nơi khởi tạo app
// và inject vào đây nếu cần, hoặc các hàm sẽ dùng instance đã được config.
// Ví dụ: Giả sử cloudinary đã được config ở file khác và import vào đây nếu cần.
// Hoặc, controllers sẽ gọi các hàm này sau khi cloudinary đã được config.

/**
 * Xóa ảnh khỏi Cloudinary bằng public_id.
 * @param {string} publicId Public ID của ảnh trên Cloudinary.
 * @returns {Promise<object>}
 */
const deleteImageFromCloudinary = async (publicId) => {
  // Đảm bảo Cloudinary đã được cấu hình trước khi gọi hàm này.
  // Thông thường, file config cloudinary (cloudinary.config.js) sẽ chạy khi ứng dụng khởi động.
  if (!cloudinary.config().cloud_name) {
    console.error("Cloudinary chưa được cấu hình!");
    // throw new Error("Cloudinary configuration is missing.");
    // Trong trường hợp này, ta không nên throw lỗi làm dừng chương trình
    // mà trả về một kết quả cho biết việc xóa không thành công do cấu hình.
    return { result: "error", message: "Cloudinary configuration is missing." };
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error("Lỗi khi xóa ảnh từ Cloudinary:", error);
        // Không reject mà resolve với thông tin lỗi để controller có thể xử lý nhẹ nhàng hơn
        return resolve({
          result: "error",
          message: "Lỗi khi xóa ảnh từ Cloudinary.",
          errorDetails: error.message,
        });
      }
      // result sẽ là { result: 'ok' } hoặc { result: 'not found' }
      resolve(result);
    });
  });
};

/**
 * Upload ảnh từ chuỗi base64 lên Cloudinary.
 * @param {string} base64String Chuỗi base64 của ảnh (nên bao gồm cả data URI prefix nếu có, ví dụ: "data:image/jpeg;base64,...").
 * @param {string} folder Thư mục trên Cloudinary để lưu ảnh.
 * @param {string} [publicId] (Optional) Public ID tùy chỉnh cho ảnh. Nếu không cung cấp, Cloudinary sẽ tự tạo.
 * @returns {Promise<object>} Object chứa secure_url và public_id của ảnh đã upload.
 * @throws {Error} Nếu có lỗi xảy ra trong quá trình upload.
 */
const uploadBase64ToCloudinary = async (
  base64String,
  folder,
  publicId = null
) => {
  if (!base64String) {
    // Không nên throw error ở đây vì có trường hợp không có imageBase64
    // Controller sẽ quyết định có upload hay không
    console.log("[uploadBase64ToCloudinary] No base64 string provided.");
    return null;
  }
  if (!cloudinary.config().cloud_name) {
    console.error("Cloudinary chưa được cấu hình!");
    // Trả về null thay vì throw error để controller có thể xử lý nhẹ nhàng hơn
    return { error: "Cloudinary configuration is missing." };
  }

  try {
    const options = {
      folder: folder,
      resource_type: "image",
    };
    if (publicId) {
      options.public_id = publicId;
      options.overwrite = true; // Ghi đè nếu public_id đã tồn tại
    }

    // Cloudinary SDK tự động xử lý data URI prefix (e.g., "data:image/jpeg;base64,"),
    // nên không cần phải xóa nó thủ công nếu base64String đã bao gồm.
    const result = await cloudinary.uploader.upload(base64String, options);

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error(
      `Lỗi khi upload ảnh base64 lên Cloudinary (thư mục: ${folder}):`,
      error
    );
    // Trả về object lỗi để controller có thể kiểm tra và xử lý
    return {
      error: "Lỗi khi upload ảnh base64 lên cloud.",
      details: error.message,
    };
  }
};

module.exports = {
  deleteImageFromCloudinary,
  uploadBase64ToCloudinary,
};
