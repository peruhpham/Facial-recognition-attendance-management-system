const express = require("express");
const router = express.Router();
const facilityController = require("../controllers/facility.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");
const {
  createConfigurableUploader,
} = require("../middlewares/upload.middleware");

// Middleware upload cho từng loại
const campusImageUploader = createConfigurableUploader({
  fieldName: "imageFile",
  cloudFolder: "facilities/campuses",
});

const buildingImageUploader = createConfigurableUploader({
  fieldName: "imageFile",
  cloudFolder: "facilities/buildings",
});

const roomImageUploader = createConfigurableUploader({
  fieldName: "imageFile",
  cloudFolder: "facilities/rooms",
});

// Campus routes
// @route   GET /api/facilities/campus
router.get("/campuses", protect, facilityController.getAllCampuses);

// @route   GET /api/facilities/campus/:id
router.get("/campuses/:id", protect, facilityController.getCampusById);

// @route   POST /api/facilities/campus
router.post(
  "/campuses",
  protect,
  authorize(["admin"]),
  campusImageUploader,
  facilityController.createCampus
);

// @route   PUT /api/facilities/campus/:id
router.put(
  "/campuses/:id",
  protect,
  authorize(["admin"]),
  campusImageUploader,
  facilityController.updateCampus
);

// @route   DELETE /api/facilities/campus/:id
router.delete(
  "/campuses/:id",
  protect,
  authorize(["admin"]),
  facilityController.deleteCampus
);

// Building routes
// @route   GET /api/facilities/buildings
router.get("/buildings", protect, facilityController.getAllBuildings);

// @route   GET /api/facilities/buildings/campus/:campusId
router.get(
  "/buildings/campuses/:campusId",
  protect,
  facilityController.getBuildingsByCampus
);

// @route   GET /api/facilities/buildings/:id
router.get("/buildings/:id", protect, facilityController.getBuildingById);

// @route   POST /api/facilities/buildings
router.post(
  "/buildings",
  protect,
  authorize(["admin"]),
  buildingImageUploader,
  facilityController.createBuilding
);

// @route   PUT /api/facilities/buildings/:id
router.put(
  "/buildings/:id",
  protect,
  authorize(["admin"]),
  buildingImageUploader,
  facilityController.updateBuilding
);

// @route   DELETE /api/facilities/buildings/:id
router.delete(
  "/buildings/:id",
  protect,
  authorize(["admin"]),
  facilityController.deleteBuilding
);

// Room routes
// @route   GET /api/facilities/rooms
router.get("/rooms", protect, facilityController.getAllRooms);

// @route   GET /api/facilities/rooms/building/:buildingId
router.get(
  "/rooms/building/:buildingId",
  protect,
  facilityController.getRoomsByBuilding
);

// @route   GET /api/facilities/rooms/:id
router.get("/rooms/:id", protect, facilityController.getRoomById);

// @route   POST /api/facilities/rooms
router.post(
  "/rooms",
  protect,
  authorize(["admin"]),
  roomImageUploader,
  facilityController.createRoom
);

// @route   PUT /api/facilities/rooms/:id
router.put(
  "/rooms/:id",
  protect,
  authorize(["admin"]),
  roomImageUploader,
  facilityController.updateRoom
);

// @route   DELETE /api/facilities/rooms/:id
router.delete(
  "/rooms/:id",
  protect,
  authorize(["admin"]),
  facilityController.deleteRoom
);

module.exports = router;
