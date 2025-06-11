const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const campusController = require("../controllers/campus.controller");
const {
  createConfigurableUploader,
} = require("../middlewares/upload.middleware");

// Middleware for campus image upload
const uploadCampusImage = createConfigurableUploader({
  fieldName: "campus_image", // Tên trường file trên form client
  cloudFolder: "facility/campus", // Thư mục trên Cloudinary
});

// Campus routes
router.route("/").get(campusController.getAllCampuses).post(
  protect,
  authorize("admin"),
  uploadCampusImage, // Thêm middleware upload
  campusController.createCampus
);

router
  .route("/:id")
  .get(campusController.getCampusById)
  .put(
    protect,
    authorize("admin"),
    uploadCampusImage, // Thêm middleware upload
    campusController.updateCampus
  )
  .delete(protect, authorize("admin"), campusController.deleteCampus);

module.exports = router;
