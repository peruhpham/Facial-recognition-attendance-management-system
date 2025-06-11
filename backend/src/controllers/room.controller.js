const { Room, Building } = require("../models/schemas");
const { deleteImageFromCloudinary } = require("../utils/cloudinary");

/**
 * Controller quản lý phòng học
 */

// @desc    Lấy danh sách tất cả phòng học
// @route   GET /api/rooms
// @access  Private
exports.getAllRooms = async (req, res) => {
  try {
    const { building_id, floor, room_type, status, search } = req.query;
    const query = {};

    if (building_id) query.building_id = building_id;
    if (floor) query.floor = floor;
    if (room_type) query.room_type = room_type;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { room_number: { $regex: search, $options: "i" } },
        // Có thể tìm theo mô tả tiện ích nếu cần, nhưng sẽ phức tạp hơn
      ];
    }

    const rooms = await Room.find(query)
      .populate({
        path: "building_id",
        select: "name code campus_id floors_count", // Thêm floors_count để validate tầng
        populate: {
          path: "campus_id",
          select: "name code",
        },
      })
      .sort({ room_number: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phòng học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách phòng học",
      error: error.message,
    });
  }
};

// @desc    Lấy phòng học theo ID
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate({
      path: "building_id",
      select: "name code campus_id floors_count address", // Thêm floors_count, address
      populate: {
        path: "campus_id",
        select: "name code address",
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng học với ID này",
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin phòng học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin phòng học",
      error: error.message,
    });
  }
};

// @desc    Tạo phòng học mới
// @route   POST /api/rooms
// @access  Private (Admin)
exports.createRoom = async (req, res) => {
  try {
    const {
      room_number,
      building_id,
      floor,
      room_type,
      capacity,
      area,
      equipment,
      status,
      // image_url  // Sẽ lấy từ req.uploadedCloudinaryFile
    } = req.body;

    // Kiểm tra building tồn tại
    const building = await Building.findById(building_id);
    if (!building) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà với ID này",
      });
    }

    // Kiểm tra số tầng hợp lệ
    if (floor > building.floors_count) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: `Tòa nhà ${building.name} chỉ có ${building.floors_count} tầng. Tầng ${floor} không hợp lệ.`,
      });
    }

    // Kiểm tra phòng học đã tồn tại trong tòa nhà chưa
    const existingRoom = await Room.findOne({
      building_id,
      room_number,
    });

    if (existingRoom) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: "Phòng học này đã tồn tại trong tòa nhà",
      });
    }

    const roomData = {
      room_number,
      building_id,
      floor,
      room_type,
      capacity,
      area,
      equipment: equipment || [],
      status: status || "available",
    };

    if (req.uploadedCloudinaryFile) {
      roomData.image_url = req.uploadedCloudinaryFile.url;
      roomData.image_public_id = req.uploadedCloudinaryFile.public_id;
    }

    const room = await Room.create(roomData);

    res.status(201).json({
      success: true,
      data: room,
      message: "Tạo phòng học thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo phòng học mới:", error);
    if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
      await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
    }
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo phòng học mới",
      error: error.message,
    });
  }
};

// @desc    Cập nhật phòng học
// @route   PUT /api/rooms/:id
// @access  Private (Admin)
exports.updateRoom = async (req, res) => {
  try {
    const {
      room_number,
      building_id, // building_id có thể thay đổi
      floor,
      room_type,
      capacity,
      area,
      equipment,
      status,
      // image_url
    } = req.body;
    const roomId = req.params.id;

    let room = await Room.findById(roomId);
    if (!room) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng học với ID này",
      });
    }

    let targetBuildingId = building_id || room.building_id.toString();
    const building = await Building.findById(targetBuildingId);
    if (!building) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà với ID này để cập nhật phòng học.",
      });
    }

    // Kiểm tra số tầng hợp lệ với tòa nhà (mới hoặc cũ)
    const floorToCheck = floor || room.floor;
    if (floorToCheck > building.floors_count) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: `Tòa nhà ${building.name} chỉ có ${building.floors_count} tầng. Tầng ${floorToCheck} không hợp lệ.`,
      });
    }

    // Kiểm tra phòng học đã tồn tại trong tòa nhà chưa (trừ phòng hiện tại)
    // Chỉ kiểm tra nếu room_number hoặc building_id thay đổi
    if (
      room_number &&
      (room_number !== room.room_number ||
        targetBuildingId !== room.building_id.toString())
    ) {
      const existingRoom = await Room.findOne({
        building_id: targetBuildingId,
        room_number,
        _id: { $ne: roomId },
      });

      if (existingRoom) {
        if (
          req.uploadedCloudinaryFile &&
          req.uploadedCloudinaryFile.public_id
        ) {
          await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
        }
        return res.status(400).json({
          success: false,
          message: "Phòng học này đã tồn tại trong tòa nhà được chọn",
        });
      }
    }

    const updateData = { ...req.body };
    delete updateData.image_url;
    delete updateData.image_public_id;

    if (req.uploadedCloudinaryFile) {
      if (room.image_public_id) {
        await deleteImageFromCloudinary(room.image_public_id);
      }
      updateData.image_url = req.uploadedCloudinaryFile.url;
      updateData.image_public_id = req.uploadedCloudinaryFile.public_id;
    } else if (req.body.remove_image === "true" && room.image_public_id) {
      await deleteImageFromCloudinary(room.image_public_id);
      updateData.image_url = null;
      updateData.image_public_id = null;
    }

    const updatedRoom = await Room.findByIdAndUpdate(roomId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedRoom,
      message: "Cập nhật phòng học thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật phòng học:", error);
    // Cân nhắc rollback ảnh mới upload
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật phòng học",
      error: error.message,
    });
  }
};

// @desc    Xóa phòng học
// @route   DELETE /api/rooms/:id
// @access  Private (Admin)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng học với ID này",
      });
    }

    // TODO: Kiểm tra xem phòng này có đang được sử dụng trong lịch nào không trước khi xóa
    // Ví dụ: const schedules = await RoomSchedule.find({ room_id: room._id });
    // if (schedules.length > 0) { return res.status(400).json(...)}

    if (room.image_public_id) {
      const deleteResult = await deleteImageFromCloudinary(
        room.image_public_id
      );
      if (deleteResult.result !== "ok" && deleteResult.result !== "not found") {
        console.warn(
          "Lỗi khi xóa ảnh room trên Cloudinary:",
          deleteResult.message || deleteResult.errorDetails
        );
      }
    }

    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Xóa phòng học thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa phòng học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa phòng học",
      error: error.message,
    });
  }
};
