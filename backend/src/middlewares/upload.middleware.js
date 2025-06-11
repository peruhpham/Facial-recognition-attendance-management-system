const multer = require("multer");
const cloudinary = require("../config/cloudinary.config");
const path = require("path");

// Cấu hình Multer để lưu file tạm thời trong memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Chỉ chấp nhận các định dạng ảnh phổ biến
  const allowedTypes = /jpeg|jpg|png|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif)."), false);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file 5MB
  fileFilter: fileFilter,
});

// Middleware để upload một file ảnh lên Cloudinary cho Absence Evidence (GIỮ NGUYÊN)
// Sẽ thêm trường `file_url` vào `req` nếu upload thành công
const uploadToCloudinary = (fieldName = "evidence_image") => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        let errorMessage = "Lỗi upload file.";
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            errorMessage = "Kích thước file quá lớn (tối đa 5MB).";
          } else {
            errorMessage = err.message;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        return res.status(400).json({ success: false, message: errorMessage });
      }

      if (!req.file) {
        return next();
      }

      try {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "absence_evidence",
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              return res.status(500).json({
                success: false,
                message: "Lỗi khi upload ảnh bằng chứng lên cloud.",
              });
            }
            req.file_url = result.secure_url;
            next();
          }
        );
        uploadStream.end(req.file.buffer);
      } catch (uploadError) {
        res.status(500).json({
          success: false,
          message: "Lỗi máy chủ khi upload ảnh.",
        });
      }
    });
  };
};

/**
 * Middleware tạo hàm upload file ảnh lên Cloudinary với cấu hình tùy chọn.
 * @param {object} options - Tùy chọn cho middleware.
 * @param {string} options.fieldName - Tên trường file trong form data.
 * @param {string} options.cloudFolder - Tên thư mục trên Cloudinary để lưu file.
 * @returns Middleware function
 */
const createConfigurableUploader = ({ fieldName, cloudFolder }) => {
  if (!fieldName || !cloudFolder) {
    throw new Error(
      "fieldName và cloudFolder là bắt buộc cho createConfigurableUploader"
    );
  }
  return (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        let errorMessage = "Lỗi upload file.";
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            errorMessage = "Kích thước file quá lớn (tối đa 5MB).";
          } else {
            errorMessage = err.message;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        return res.status(400).json({ success: false, message: errorMessage });
      }

      if (!req.file) {
        return next();
      }

      try {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: cloudFolder,
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              console.error(
                `Cloudinary Upload Error for ${fieldName} to ${cloudFolder}:`,
                error
              );
              return res.status(500).json({
                success: false,
                message: "Lỗi khi upload ảnh lên cloud.",
              });
            }
            req.uploadedCloudinaryFile = {
              url: result.secure_url,
              public_id: result.public_id,
              original_filename: req.file.originalname,
            };
            next();
          }
        );
        uploadStream.end(req.file.buffer);
      } catch (uploadError) {
        console.error(
          `Server Error during Cloudinary Upload for ${fieldName} to ${cloudFolder}:`,
          uploadError
        );
        res.status(500).json({
          success: false,
          message: "Lỗi máy chủ khi upload ảnh.",
        });
      }
    });
  };
};

module.exports = { uploadToCloudinary, upload, createConfigurableUploader }; // Export thêm middleware mới
