const { Campus, Building, Room } = require("../models/schemas");
const { deleteImageFromCloudinary } = require("../utils/cloudinary"); // Import hàm xóa ảnh

/**
 * Controller quản lý cơ sở học tập
 */

// @desc    Lấy danh sách tất cả cơ sở
// @route   GET /api/campus
// @access  Private
exports.getAllCampuses = async (req, res) => {
  try {
    const campuses = await Campus.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: campuses.length,
      data: campuses,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách cơ sở:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách cơ sở",
      error: error.message,
    });
  }
};

// @desc    Lấy cơ sở theo ID
// @route   GET /api/campus/:id
// @access  Private
exports.getCampusById = async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);

    if (!campus) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở với ID này",
      });
    }

    res.status(200).json({
      success: true,
      data: campus,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin cơ sở:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin cơ sở",
      error: error.message,
    });
  }
};

// @desc    Tạo cơ sở mới
// @route   POST /api/campus
// @access  Private (Admin)
exports.createCampus = async (req, res) => {
  try {
    const { name, code, address, description, location, status } = req.body;

    // Kiểm tra mã cơ sở đã tồn tại chưa
    const existingCampus = await Campus.findOne({ code });
    if (existingCampus) {
      return res.status(400).json({
        success: false,
        message: "Mã cơ sở này đã tồn tại",
      });
    }

    const campusData = {
      name,
      code,
      address,
      description,
      location,
      status: status || "active",
    };

    // Xử lý ảnh nếu có
    if (req.uploadedCloudinaryFile) {
      campusData.image_url = req.uploadedCloudinaryFile.url;
      campusData.image_public_id = req.uploadedCloudinaryFile.public_id;
    }

    const campus = await Campus.create(campusData);

    res.status(201).json({
      success: true,
      data: campus,
      message: "Tạo cơ sở thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo cơ sở mới:", error);
    // Nếu có lỗi và đã upload ảnh, cần cân nhắc xóa ảnh đã upload trên Cloudinary (nếu có public_id)
    if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
      await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo cơ sở mới",
      error: error.message,
    });
  }
};

// @desc    Cập nhật cơ sở
// @route   PUT /api/campus/:id
// @access  Private (Admin)
exports.updateCampus = async (req, res) => {
  try {
    const { name, code, address, description, location, status } = req.body;
    const campusId = req.params.id;

    let campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở với ID này",
      });
    }

    // Kiểm tra mã cơ sở đã tồn tại chưa (trừ cơ sở hiện tại)
    if (code) {
      const existingCampus = await Campus.findOne({
        code,
        _id: { $ne: campusId },
      });

      if (existingCampus) {
        return res.status(400).json({
          success: false,
          message: "Mã cơ sở này đã tồn tại",
        });
      }
    }

    const updateData = {
      name,
      code,
      address,
      description,
      location,
      status,
    };

    // Xử lý ảnh nếu có file mới được upload
    if (req.uploadedCloudinaryFile) {
      // Nếu có ảnh cũ, xóa nó khỏi Cloudinary
      if (campus.image_public_id) {
        await deleteImageFromCloudinary(campus.image_public_id);
      }
      updateData.image_url = req.uploadedCloudinaryFile.url;
      updateData.image_public_id = req.uploadedCloudinaryFile.public_id;
    } else if (req.body.remove_image === "true" && campus.image_public_id) {
      // Trường hợp muốn xóa ảnh hiện tại mà không upload ảnh mới
      await deleteImageFromCloudinary(campus.image_public_id);
      updateData.image_url = null;
      updateData.image_public_id = null;
    }

    const updatedCampus = await Campus.findByIdAndUpdate(campusId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedCampus,
      message: "Cập nhật cơ sở thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật cơ sở:", error);
    // Nếu có lỗi trong quá trình update và đã upload ảnh MỚI, cân nhắc xóa ảnh MỚI đã upload
    // Tuy nhiên, logic này phức tạp vì không biết lỗi xảy ra trước hay sau khi update DB
    // Tạm thời chưa rollback ảnh mới nếu update DB lỗi.
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật cơ sở",
      error: error.message,
    });
  }
};

// @desc    Xóa cơ sở
// @route   DELETE /api/campus/:id
// @access  Private (Admin)
exports.deleteCampus = async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);

    if (!campus) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở với ID này",
      });
    }

    // Xóa tất cả các building và room thuộc campus này, bao gồm cả ảnh của chúng
    const buildingsInCampus = await Building.find({ campus_id: campus._id });
    for (const building of buildingsInCampus) {
      const roomsInBuilding = await Room.find({ building_id: building._id });
      for (const room of roomsInBuilding) {
        if (room.image_public_id) {
          try {
            const roomImageDeleteResult = await deleteImageFromCloudinary(
              room.image_public_id
            );
            if (
              roomImageDeleteResult.result !== "ok" &&
              roomImageDeleteResult.result !== "not found"
            ) {
              console.warn(
                `Lỗi khi xóa ảnh room ${room.room_number} (ID: ${room._id}) trên Cloudinary:`,
                roomImageDeleteResult.message ||
                  roomImageDeleteResult.errorDetails
              );
            }
          } catch (cloudinaryError) {
            console.warn(
              `Ngoại lệ khi xóa ảnh room ${room.room_number} (ID: ${room._id}) trên Cloudinary:`,
              cloudinaryError
            );
          }
        }
        await Room.findByIdAndDelete(room._id);
      }

      if (building.image_public_id) {
        try {
          const buildingImageDeleteResult = await deleteImageFromCloudinary(
            building.image_public_id
          );
          if (
            buildingImageDeleteResult.result !== "ok" &&
            buildingImageDeleteResult.result !== "not found"
          ) {
            console.warn(
              `Lỗi khi xóa ảnh building ${building.name} (ID: ${building._id}) trên Cloudinary:`,
              buildingImageDeleteResult.message ||
                buildingImageDeleteResult.errorDetails
            );
          }
        } catch (cloudinaryError) {
          console.warn(
            `Ngoại lệ khi xóa ảnh building ${building.name} (ID: ${building._id}) trên Cloudinary:`,
            cloudinaryError
          );
        }
      }
      await Building.findByIdAndDelete(building._id);
    }

    // Xóa ảnh của campus trên Cloudinary nếu có
    if (campus.image_public_id) {
      const deleteResult = await deleteImageFromCloudinary(
        campus.image_public_id
      );
      if (deleteResult.result !== "ok" && deleteResult.result !== "not found") {
        console.warn(
          "Lỗi khi xóa ảnh campus trên Cloudinary:",
          deleteResult.message || deleteResult.errorDetails
        );
        // Không chặn việc xóa campus nếu xóa ảnh lỗi, chỉ cảnh báo
      }
    }

    await Campus.findByIdAndDelete(req.params.id); // Sử dụng findByIdAndDelete cho nhất quán

    res.status(200).json({
      success: true,
      message: "Xóa cơ sở và tất cả các mục liên quan thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa cơ sở:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa cơ sở",
      error: error.message,
    });
  }
};
