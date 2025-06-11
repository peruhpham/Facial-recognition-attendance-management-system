const { Major, Department } = require("../models/schemas");
const mongoose = require("mongoose");

// Create a new major
exports.createMajor = async (req, res) => {
  try {
    const { name, code, department_id, description } = req.body;

    // Check if department_id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(department_id)) {
      return res.status(400).json({ message: "Invalid Department ID." });
    }

    // Check if department exists
    const department = await Department.findById(department_id);
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    // Check if major code already exists
    const existingMajor = await Major.findOne({ code });
    if (existingMajor) {
      return res.status(400).json({ message: "Major code already exists." });
    }

    const newMajor = new Major({
      name,
      code,
      department_id,
      description,
    });

    await newMajor.save();
    res.status(201).json({
      message: "Major created successfully!",
      data: newMajor,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating major", error: error.message });
  }
};

// Get all majors
exports.getAllMajors = async (req, res) => {
  try {
    const { department_id } = req.query;
    let filter = {};
    if (department_id) {
      if (!mongoose.Types.ObjectId.isValid(department_id)) {
        return res.status(400).json({ message: "Invalid Department ID." });
      }
      filter.department_id = department_id;
    }

    const majors = await Major.find(filter).populate(
      "department_id",
      "name code"
    );
    res.status(200).json({
      message: "Majors retrieved successfully!",
      data: majors,
      total: majors.length,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving majors", error: error.message });
  }
};

// Get all public majors (no authentication required)
exports.getAllPublicMajors = async (req, res) => {
  try {
    const { department_id } = req.query;
    let filter = {};
    if (department_id) {
      if (!mongoose.Types.ObjectId.isValid(department_id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Department ID." });
      }
      filter.department_id = department_id;
    }

    const majors = await Major.find(filter).populate(
      "department_id",
      "name code"
    );
    res.status(200).json({
      success: true,
      message: "Public majors retrieved successfully!",
      data: majors,
      total: majors.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving public majors",
      error: error.message,
    });
  }
};

// Get a single major by ID
exports.getMajorById = async (req, res) => {
  try {
    const { majorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(majorId)) {
      return res.status(400).json({ message: "Invalid Major ID." });
    }

    const major = await Major.findById(majorId).populate(
      "department_id",
      "name code"
    );
    if (!major) {
      return res.status(404).json({ message: "Major not found." });
    }
    res.status(200).json({
      message: "Major retrieved successfully!",
      data: major,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving major", error: error.message });
  }
};

// Update a major by ID
exports.updateMajorById = async (req, res) => {
  try {
    const { majorId } = req.params;
    const { name, code, department_id, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(majorId)) {
      return res.status(400).json({ message: "Invalid Major ID." });
    }

    if (department_id && !mongoose.Types.ObjectId.isValid(department_id)) {
      return res.status(400).json({ message: "Invalid Department ID." });
    }

    // Check if department exists if department_id is provided
    if (department_id) {
      const department = await Department.findById(department_id);
      if (!department) {
        return res.status(404).json({ message: "Department not found." });
      }
    }

    // Check if new major code already exists for another major
    if (code) {
      const existingMajor = await Major.findOne({
        code,
        _id: { $ne: majorId },
      });
      if (existingMajor) {
        return res
          .status(400)
          .json({ message: "Major code already exists for another major." });
      }
    }

    const updatedMajor = await Major.findByIdAndUpdate(
      majorId,
      { name, code, department_id, description, updated_at: Date.now() },
      { new: true, runValidators: true }
    ).populate("department_id", "name code");

    if (!updatedMajor) {
      return res.status(404).json({ message: "Major not found." });
    }

    res.status(200).json({
      message: "Major updated successfully!",
      data: updatedMajor,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating major", error: error.message });
  }
};

// Delete a major by ID
exports.deleteMajorById = async (req, res) => {
  try {
    const { majorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(majorId)) {
      return res.status(400).json({ message: "Invalid Major ID." });
    }
    // TODO: Check if this major is being used by any MainClass or User before deleting
    // For now, we'll just delete it. Add cascading delete logic or prevention if needed.

    const deletedMajor = await Major.findByIdAndDelete(majorId);

    if (!deletedMajor) {
      return res.status(404).json({ message: "Major not found." });
    }

    res.status(200).json({
      message: "Major deleted successfully!",
      data: deletedMajor,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting major", error: error.message });
  }
};
