const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth.middleware");
const roomController = require("../controllers/room.controller");
const {
  createConfigurableUploader,
} = require("../middlewares/upload.middleware");

// Middleware for room image upload
const uploadRoomImage = createConfigurableUploader({
  fieldName: "room_image", // Tên trường file trên form client
  cloudFolder: "facility/room", // Thư mục trên Cloudinary
});

// Room routes
router.route("/").get(roomController.getAllRooms).post(
  protect,
  authorize("admin"),
  uploadRoomImage, // Thêm middleware upload
  roomController.createRoom
);

router
  .route("/:id")
  .get(roomController.getRoomById)
  .put(
    protect,
    authorize("admin"),
    uploadRoomImage, // Thêm middleware upload
    roomController.updateRoom
  )
  .delete(protect, authorize("admin"), roomController.deleteRoom);

module.exports = router;
