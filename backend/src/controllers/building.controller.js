const { Building, Campus, Room } = require("../models/schemas");
const { deleteImageFromCloudinary } = require("../utils/cloudinary");

/**
 * Controller quản lý tòa nhà
 */

// @desc    Lấy danh sách tất cả tòa nhà
// @route   GET /api/buildings
// @access  Private
exports.getAllBuildings = async (req, res) => {
  try {
    const { campus_id, search } = req.query;
    const query = {};

    if (campus_id) {
      query.campus_id = campus_id;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const buildings = await Building.find(query)
      .populate("campus_id", "name code")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: buildings.length,
      data: buildings,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tòa nhà:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách tòa nhà",
      error: error.message,
    });
  }
};

// @desc    Lấy tòa nhà theo ID
// @route   GET /api/buildings/:id
// @access  Private
exports.getBuildingById = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id).populate(
      "campus_id",
      "name code address"
    );

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà với ID này",
      });
    }

    res.status(200).json({
      success: true,
      data: building,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin tòa nhà:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin tòa nhà",
      error: error.message,
    });
  }
};

// @desc    Tạo tòa nhà mới
// @route   POST /api/buildings
// @access  Private (Admin)
exports.createBuilding = async (req, res) => {
  try {
    const {
      name,
      code,
      campus_id,
      floors_count,
      year_built,
      facilities,
      status,
    } = req.body;

    // Kiểm tra campus tồn tại
    const campus = await Campus.findById(campus_id);
    if (!campus) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở với ID này",
      });
    }

    // Kiểm tra mã tòa nhà đã tồn tại chưa
    const existingBuilding = await Building.findOne({ code, campus_id });
    if (existingBuilding) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: "Mã tòa nhà này đã tồn tại trong cơ sở đã chọn",
      });
    }

    const buildingData = {
      name,
      code,
      campus_id,
      floors_count: floors_count || 1,
      year_built,
      status: status || "active",
      facilities: facilities || [],
    };

    if (req.uploadedCloudinaryFile) {
      buildingData.image_url = req.uploadedCloudinaryFile.url;
      buildingData.image_public_id = req.uploadedCloudinaryFile.public_id;
    }

    const building = await Building.create(buildingData);

    res.status(201).json({
      success: true,
      data: building,
      message: "Tạo tòa nhà thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo tòa nhà mới:", error);
    if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
      await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo tòa nhà mới",
      error: error.message,
    });
  }
};

// @desc    Cập nhật tòa nhà
// @route   PUT /api/buildings/:id
// @access  Private (Admin)
exports.updateBuilding = async (req, res) => {
  try {
    const {
      name,
      code,
      campus_id,
      floors_count,
      year_built,
      facilities,
      status,
    } = req.body;
    const buildingId = req.params.id;

    let building = await Building.findById(buildingId);
    if (!building) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà với ID này",
      });
    }

    // Kiểm tra campus tồn tại nếu có thay đổi campus_id
    if (campus_id) {
      const campus = await Campus.findById(campus_id);
      if (!campus) {
        if (
          req.uploadedCloudinaryFile &&
          req.uploadedCloudinaryFile.public_id
        ) {
          await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
        }
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cơ sở với ID này",
        });
      }
    }

    // Kiểm tra mã tòa nhà đã tồn tại chưa (trừ tòa nhà hiện tại)
    const campusToCheck = campus_id || building.campus_id.toString();
    if (code) {
      const existingBuilding = await Building.findOne({
        code,
        campus_id: campusToCheck,
        _id: { $ne: buildingId },
      });

      if (existingBuilding) {
        if (
          req.uploadedCloudinaryFile &&
          req.uploadedCloudinaryFile.public_id
        ) {
          await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
        }
        return res.status(400).json({
          success: false,
          message: "Mã tòa nhà này đã tồn tại trong cơ sở đã chọn",
        });
      }
    }

    const updateData = { ...req.body };
    delete updateData.image_url;
    delete updateData.image_public_id;

    if (req.uploadedCloudinaryFile) {
      if (building.image_public_id) {
        await deleteImageFromCloudinary(building.image_public_id);
      }
      updateData.image_url = req.uploadedCloudinaryFile.url;
      updateData.image_public_id = req.uploadedCloudinaryFile.public_id;
    } else if (req.body.remove_image === "true" && building.image_public_id) {
      await deleteImageFromCloudinary(building.image_public_id);
      updateData.image_url = null;
      updateData.image_public_id = null;
    }

    const updatedBuilding = await Building.findByIdAndUpdate(
      buildingId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedBuilding,
      message: "Cập nhật tòa nhà thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật tòa nhà:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật tòa nhà",
      error: error.message,
    });
  }
};

// @desc    Xóa tòa nhà
// @route   DELETE /api/buildings/:id
// @access  Private (Admin)
exports.deleteBuilding = async (req, res) => {
  try {
    const building = await Building.findById(req.params.id);

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà với ID này",
      });
    }

    // Kiểm tra xem có phòng nào thuộc tòa nhà này không
    const roomsInBuilding = await Room.find({ building_id: building._id });
    if (roomsInBuilding.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa tòa nhà này vì còn ${roomsInBuilding.length} phòng đang trực thuộc. Vui lòng xóa các phòng trước.`,
      });
    }

    // Xóa ảnh trên Cloudinary nếu có
    if (building.image_public_id) {
      const deleteResult = await deleteImageFromCloudinary(
        building.image_public_id
      );
      if (deleteResult.result !== "ok" && deleteResult.result !== "not found") {
        console.warn(
          "Lỗi khi xóa ảnh building trên Cloudinary:",
          deleteResult.message || deleteResult.errorDetails
        );
      }
    }

    await Building.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Xóa tòa nhà thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa tòa nhà:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa tòa nhà",
      error: error.message,
    });
  }
};
