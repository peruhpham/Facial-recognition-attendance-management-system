const express = require("express");
const router = express.Router();
const majorController = require("../controllers/major.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");

// Create a new major (Admin only)
router.post("/", [protect, authorize(["admin"])], majorController.createMajor);

// Get all majors
router.get("/", protect, majorController.getAllMajors);

// Get all public majors (no authentication needed)
router.get("/public", majorController.getAllPublicMajors);

// Get a single major by ID
router.get("/:majorId", protect, majorController.getMajorById);

// Update a major by ID (Admin only)
router.put(
  "/:majorId",
  [protect, authorize(["admin"])],
  majorController.updateMajorById
);

// Delete a major by ID (Admin only)
router.delete(
  "/:majorId",
  [protect, authorize(["admin"])],
  majorController.deleteMajorById
);

module.exports = router;
