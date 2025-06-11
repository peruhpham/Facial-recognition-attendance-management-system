const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const buildingController = require("../controllers/building.controller");
const {
  createConfigurableUploader,
} = require("../middlewares/upload.middleware");

// Middleware for building image upload
const uploadBuildingImage = createConfigurableUploader({
  fieldName: "building_image", // Tên trường file trên form client
  cloudFolder: "facility/building", // Thư mục trên Cloudinary
});

// Building routes
router.route("/").get(buildingController.getAllBuildings).post(
  protect,
  authorize("admin"),
  uploadBuildingImage, // Thêm middleware upload
  buildingController.createBuilding
);

router
  .route("/:id")
  .get(buildingController.getBuildingById)
  .put(
    protect,
    authorize("admin"),
    uploadBuildingImage, // Thêm middleware upload
    buildingController.updateBuilding
  )
  .delete(protect, authorize("admin"), buildingController.deleteBuilding);

module.exports = router;
