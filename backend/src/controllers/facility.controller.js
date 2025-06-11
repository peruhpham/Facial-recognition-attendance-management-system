const { Campus, Building, Room, RoomSchedule } = require("../models/schemas");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const { deleteImageFromCloudinary } = require("../utils/cloudinary");

/**
 * Controller quản lý cơ sở vật chất
 */

// =================== CAMPUS CONTROLLERS ===================

// @desc    Lấy danh sách tất cả cơ sở
// @route   GET /api/campus
// @access  Private (Admin)
exports.getAllCampuses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Campus.countDocuments(query);
    const campuses = await Campus.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: campuses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: campuses,
    });
  } catch (error) {
    console.error("Error in getAllCampuses:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách cơ sở",
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
        message: "Không tìm thấy cơ sở",
      });
    }

    res.status(200).json({
      success: true,
      data: campus,
    });
  } catch (error) {
    console.error("Error in getCampusById:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thông tin cơ sở",
      error: error.message,
    });
  }
};

// @desc    Tạo cơ sở mới
// @route   POST /api/campus
// @access  Private (Admin)
exports.createCampus = async (req, res) => {
  try {
    // Khi sử dụng multer với FormData, các trường text sẽ nằm trong req.body
    // req.body.data sẽ không tồn tại nếu frontend gửi FormData phẳng
    const { name, code, address, description, status } = req.body;
    let { location } = req.body; // location có thể là string JSON, cần parse

    // Kiểm tra các trường bắt buộc (schema đã làm nhưng kiểm tra sớm vẫn tốt)
    if (!name || !code || !address) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        // Nếu đã upload ảnh thì xóa đi do lỗi input
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: "Tên, mã và địa chỉ cơ sở là bắt buộc.",
      });
    }

    // Kiểm tra cơ sở đã tồn tại chưa
    const existingCampus = await Campus.findOne({ code });
    if (existingCampus) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: "Mã cơ sở đã tồn tại",
      });
    }

    // Xử lý location nếu nó là string JSON
    let parsedLocation = null;
    if (typeof location === "string") {
      try {
        parsedLocation = JSON.parse(location);
      } catch (parseError) {
        console.warn("Không thể parse location JSON:", location, parseError);
        // Có thể trả lỗi hoặc bỏ qua tùy yêu cầu
      }
    } else if (typeof location === "object" && location !== null) {
      parsedLocation = location;
    }

    const campusData = {
      name,
      code,
      address,
      description,
      status: status || "active",
    };

    if (parsedLocation && parsedLocation.latitude && parsedLocation.longitude) {
      campusData.location = {
        latitude: parseFloat(parsedLocation.latitude),
        longitude: parseFloat(parsedLocation.longitude),
      };
    }

    if (req.uploadedCloudinaryFile) {
      campusData.image_url = req.uploadedCloudinaryFile.url;
      campusData.image_public_id = req.uploadedCloudinaryFile.public_id;
    }

    const campus = await Campus.create(campusData);

    res.status(201).json({
      success: true,
      data: campus,
      message: "Tạo cơ sở mới thành công",
    });
  } catch (error) {
    console.error("Error in createCampus:", error);
    // Nếu có lỗi và đã upload ảnh, cần xóa ảnh đã upload trên Cloudinary
    if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
      try {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      } catch (cloudinaryDeleteError) {
        console.error(
          "Lỗi khi xóa ảnh Cloudinary sau khi tạo campus thất bại:",
          cloudinaryDeleteError
        );
      }
    }
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tạo cơ sở mới",
      error: error.message, // Giữ nguyên message lỗi từ Mongoose/DB
    });
  }
};

// @desc    Cập nhật cơ sở
// @route   PUT /api/facilities/campuses/:id
// @access  Private (Admin)
exports.updateCampus = async (req, res) => {
  try {
    const { name, code, address, description, status } = req.body;
    let { location } = req.body;
    const campusId = req.params.id;

    let campus = await Campus.findById(campusId);
    if (!campus) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở",
      });
    }

    // Kiểm tra mã cơ sở đã tồn tại chưa (trừ cơ sở hiện tại)
    if (code && code !== campus.code) {
      const existingCampus = await Campus.findOne({
        code,
        _id: { $ne: campusId },
      });
      if (existingCampus) {
        if (
          req.uploadedCloudinaryFile &&
          req.uploadedCloudinaryFile.public_id
        ) {
          await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
        }
        return res.status(400).json({
          success: false,
          message: "Mã cơ sở đã tồn tại",
        });
      }
    }

    // Xử lý location nếu nó là string JSON
    let parsedLocation = null;
    if (location) {
      // Chỉ xử lý nếu location được cung cấp
      if (typeof location === "string") {
        try {
          parsedLocation = JSON.parse(location);
        } catch (parseError) {
          console.warn(
            "Không thể parse location JSON khi cập nhật:",
            location,
            parseError
          );
        }
      } else if (typeof location === "object") {
        parsedLocation = location;
      }
    }

    const updateData = { ...req.body }; // Lấy tất cả các trường từ body
    delete updateData.imageFile; // Xóa các trường không thuộc schema hoặc đã xử lý
    delete updateData.remove_image; // remove_image không lưu vào DB

    // Cập nhật location nếu có
    if (parsedLocation && parsedLocation.latitude && parsedLocation.longitude) {
      updateData.location = {
        latitude: parseFloat(parsedLocation.latitude),
        longitude: parseFloat(parsedLocation.longitude),
      };
    } else if (location === null || location === "") {
      // Cho phép xóa location
      updateData.location = undefined; // Hoặc null tùy theo schema cho phép không
    }

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
    console.error("Error in updateCampus:", error);
    // Quan trọng: Nếu lỗi xảy ra SAU KHI ảnh mới đã được upload nhưng TRƯỚC KHI DB update thành công,
    // thì ảnh mới đó có thể trở thành mồ côi. Cần cân nhắc xóa ảnh mới nếu update DB lỗi.
    // Tuy nhiên, việc xác định chính xác thời điểm này và rollback có thể phức tạp.
    // Một giải pháp đơn giản hơn là chỉ log lỗi, hoặc nếu đã có public_id của ảnh mới thì thử xóa.
    if (
      req.uploadedCloudinaryFile &&
      req.uploadedCloudinaryFile.public_id &&
      error.name !== "ValidationError"
    ) {
      // Chỉ cố gắng xóa nếu đó không phải lỗi validation (vì nếu lỗi validation, ta đã xóa ở trên rồi)
      // Và nếu campus chưa được update thành công với ảnh mới.
      // Logic này cần xem xét cẩn thận để tránh xóa nhầm ảnh đã được gán nếu update thành công một phần.
      // Tạm thời không rollback ảnh mới ở đây để tránh phức tạp không cần thiết nếu lỗi là từ DB sau khi ảnh đã xử lý.
    }
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật cơ sở",
      error: error.message,
    });
  }
};

// @desc    Xóa cơ sở
// @route   DELETE /api/facilities/campuses/:id
// @access  Private (Admin)
exports.deleteCampus = async (req, res) => {
  try {
    const campusId = req.params.id;

    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở",
      });
    }

    // Xóa tất cả các building và room thuộc campus này, bao gồm cả ảnh của chúng
    const buildingsInCampus = await Building.find({ campus_id: campusId });
    for (const building of buildingsInCampus) {
      const roomsInBuilding = await Room.find({ building_id: building._id });
      for (const room of roomsInBuilding) {
        // Kiểm tra xem có lịch sử dụng phòng nào không
        const scheduleCount = await RoomSchedule.countDocuments({
          room_id: room._id,
        });
        if (scheduleCount > 0) {
          return res.status(400).json({
            success: false,
            message: `Không thể xóa cơ sở vì phòng ${room.room_number} trong tòa nhà ${building.name} đang có lịch sử dụng. Vui lòng xóa lịch trước.`,
          });
        }
        if (room.image_public_id) {
          try {
            await deleteImageFromCloudinary(room.image_public_id);
          } catch (cloudinaryError) {
            console.warn(
              `Lỗi khi xóa ảnh room ${room.room_number} (ID: ${room._id}) trên Cloudinary khi xóa campus:`,
              cloudinaryError
            );
          }
        }
        await Room.findByIdAndDelete(room._id);
      }

      if (building.image_public_id) {
        try {
          await deleteImageFromCloudinary(building.image_public_id);
        } catch (cloudinaryError) {
          console.warn(
            `Lỗi khi xóa ảnh building ${building.name} (ID: ${building._id}) trên Cloudinary khi xóa campus:`,
            cloudinaryError
          );
        }
      }
      await Building.findByIdAndDelete(building._id);
    }

    // Xóa ảnh của campus trên Cloudinary nếu có
    if (campus.image_public_id) {
      try {
        await deleteImageFromCloudinary(campus.image_public_id);
      } catch (cloudinaryError) {
        console.warn(
          `Lỗi khi xóa ảnh campus ${campus.name} (ID: ${campus._id}) trên Cloudinary:`,
          cloudinaryError
        );
      }
    }

    await Campus.findByIdAndDelete(campusId);

    res.status(200).json({
      success: true,
      message: "Xóa cơ sở và tất cả các mục liên quan thành công",
    });
  } catch (error) {
    console.error("Error in deleteCampus:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa cơ sở",
      error: error.message,
    });
  }
};

// =================== BUILDING CONTROLLERS ===================

// @desc    Lấy danh sách tất cả tòa nhà
// @route   GET /api/buildings
// @access  Private (Admin)
exports.getAllBuildings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const campusId = req.query.campus_id || "";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    if (campusId) {
      query.campus_id = campusId;
    }

    const total = await Building.countDocuments(query);
    const buildings = await Building.find(query)
      .populate("campus_id", "name code")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: buildings.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: buildings,
    });
  } catch (error) {
    console.error("Error in getAllBuildings:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách tòa nhà",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách tòa nhà theo campus
// @route   GET /api/buildings/campus/:campusId
// @access  Private
exports.getBuildingsByCampus = async (req, res) => {
  try {
    const campusId = req.params.campusId;

    const buildings = await Building.find({ campus_id: campusId })
      .populate("campus_id", "name code")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: buildings.length,
      data: buildings,
    });
  } catch (error) {
    console.error("Error in getBuildingsByCampus:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách tòa nhà theo campus",
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
      "name code"
    );

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà",
      });
    }

    res.status(200).json({
      success: true,
      data: building,
    });
  } catch (error) {
    console.error("Error in getBuildingById:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thông tin tòa nhà",
      error: error.message,
    });
  }
};

// @desc    Tạo tòa nhà mới
// @route   POST /api/facilities/buildings
// @access  Private (Admin)
exports.createBuilding = async (req, res) => {
  try {
    const {
      name,
      code,
      campus_id,
      floors_count,
      year_built,
      status,
      facilities,
    } = req.body;

    if (!name || !code || !campus_id) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: "Tên, mã tòa nhà và mã cơ sở là bắt buộc.",
      });
    }

    // Kiểm tra tòa nhà đã tồn tại chưa (theo code và campus_id)
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

    // Kiểm tra campus_id có phải là ObjectId hợp lệ không và campus có tồn tại không
    if (!mongoose.Types.ObjectId.isValid(campus_id)) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: "Mã cơ sở không hợp lệ",
      });
    }
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

    const buildingData = {
      name,
      code,
      campus_id,
      floors_count: floors_count ? parseInt(floors_count) : 1,
      year_built: year_built ? parseInt(year_built) : undefined,
      status: status || "active",
      facilities: Array.isArray(facilities)
        ? facilities
        : facilities
        ? facilities.split(",").map((f) => f.trim())
        : [],
    };

    if (req.uploadedCloudinaryFile) {
      buildingData.image_url = req.uploadedCloudinaryFile.url;
      buildingData.image_public_id = req.uploadedCloudinaryFile.public_id;
    }

    const building = await Building.create(buildingData);

    res.status(201).json({
      success: true,
      data: building,
      message: "Tạo tòa nhà mới thành công",
    });
  } catch (error) {
    console.error("Error in createBuilding:", error);
    if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
      try {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      } catch (cloudinaryDeleteError) {
        console.error(
          "Lỗi khi xóa ảnh Cloudinary sau khi tạo building thất bại:",
          cloudinaryDeleteError
        );
      }
    }
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tạo tòa nhà mới",
      error: error.message,
    });
  }
};

// @desc    Cập nhật tòa nhà
// @route   PUT /api/facilities/buildings/:id
// @access  Private (Admin)
exports.updateBuilding = async (req, res) => {
  try {
    const { name, code, campus_id, floors_count, year_built, status } =
      req.body;
    let { facilities } = req.body; // Lấy facilities riêng để xử lý
    const buildingId = req.params.id;

    let building = await Building.findById(buildingId);
    if (!building) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà",
      });
    }

    const campusToUpdate = campus_id || building.campus_id.toString();

    if (
      code &&
      (code !== building.code ||
        (campus_id && campus_id !== building.campus_id.toString()))
    ) {
      const existingBuilding = await Building.findOne({
        code,
        campus_id: campusToUpdate,
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

    if (campus_id && campus_id !== building.campus_id.toString()) {
      if (!mongoose.Types.ObjectId.isValid(campus_id)) {
        if (
          req.uploadedCloudinaryFile &&
          req.uploadedCloudinaryFile.public_id
        ) {
          await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
        }
        return res
          .status(400)
          .json({ success: false, message: "Mã cơ sở không hợp lệ" });
      }
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
          message: "Không tìm thấy cơ sở được chỉ định",
        });
      }
    }

    const updateData = { ...req.body };
    delete updateData.imageFile;
    delete updateData.remove_image;

    // Xử lý facilities, đảm bảo nó là mảng
    let processedFacilities = []; // Mặc định là mảng rỗng
    if (facilities) {
      if (Array.isArray(facilities)) {
        processedFacilities = facilities
          .map((f) => String(f).trim())
          .filter((f) => f); // Đảm bảo là string và không rỗng
      } else if (typeof facilities === "string") {
        if (facilities.trim() === "") {
          // Nếu frontend gửi facilities="" cho mảng rỗng
          processedFacilities = [];
        } else {
          processedFacilities = facilities
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f);
        }
      }
    } else if (req.body.hasOwnProperty("facilities") && facilities === null) {
      // Trường hợp gửi facilities: null (explicitly to clear)
      processedFacilities = [];
    } else if (!req.body.hasOwnProperty("facilities")) {
      // Nếu key 'facilities' hoàn toàn không có trong request body, giữ lại giá trị cũ từ DB
      processedFacilities = building.facilities;
    }
    updateData.facilities = processedFacilities;

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
    console.error("Error in updateBuilding:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật tòa nhà",
      error: error.message,
    });
  }
};

// @desc    Xóa tòa nhà
// @route   DELETE /api/facilities/buildings/:id
// @access  Private (Admin)
exports.deleteBuilding = async (req, res) => {
  try {
    const buildingId = req.params.id;

    const building = await Building.findById(buildingId);
    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tòa nhà",
      });
    }

    // Xóa tất cả các room thuộc building này, bao gồm cả ảnh của chúng
    const roomsInBuilding = await Room.find({ building_id: buildingId });
    for (const room of roomsInBuilding) {
      // Kiểm tra xem có lịch sử dụng phòng nào không
      const scheduleCount = await RoomSchedule.countDocuments({
        room_id: room._id,
      });
      if (scheduleCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa tòa nhà vì phòng ${room.room_number} đang có lịch sử dụng. Vui lòng xóa lịch trước.`,
        });
      }
      if (room.image_public_id) {
        try {
          await deleteImageFromCloudinary(room.image_public_id);
        } catch (cloudinaryError) {
          console.warn(
            `Lỗi khi xóa ảnh room ${room.room_number} (ID: ${room._id}) trên Cloudinary khi xóa building:`,
            cloudinaryError
          );
        }
      }
      await Room.findByIdAndDelete(room._id);
    }

    // Xóa ảnh của building trên Cloudinary nếu có
    if (building.image_public_id) {
      try {
        await deleteImageFromCloudinary(building.image_public_id);
      } catch (cloudinaryError) {
        console.warn(
          `Lỗi khi xóa ảnh building ${building.name} (ID: ${building._id}) trên Cloudinary:`,
          cloudinaryError
        );
      }
    }

    await Building.findByIdAndDelete(buildingId);

    res.status(200).json({
      success: true,
      message: "Xóa tòa nhà và các phòng liên quan thành công",
    });
  } catch (error) {
    console.error("Error in deleteBuilding:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa tòa nhà",
      error: error.message,
    });
  }
};

// =================== ROOM CONTROLLERS ===================

// @desc    Lấy danh sách tất cả phòng học
// @route   GET /api/rooms
// @access  Private
exports.getAllRooms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const buildingId = req.query.building_id || "";
    const roomType = req.query.room_type || "";
    const capacity = parseInt(req.query.capacity) || 0;
    const status = req.query.status || "";

    const query = {};

    if (search) {
      query.$or = [{ room_number: { $regex: search, $options: "i" } }];
    }

    if (buildingId) {
      query.building_id = buildingId;
    }

    if (roomType) {
      query.room_type = roomType;
    }

    if (capacity > 0) {
      query.capacity = { $gte: capacity };
    }

    if (status) {
      query.status = status;
    }

    const total = await Room.countDocuments(query);
    const rooms = await Room.find(query)
      .populate({
        path: "building_id",
        select: "name code campus_id",
        populate: {
          path: "campus_id",
          select: "name code",
        },
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ room_number: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: rooms,
    });
  } catch (error) {
    console.error("Error in getAllRooms:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách phòng học",
      error: error.message,
    });
  }
};

// @desc    Lấy danh sách phòng học theo tòa nhà
// @route   GET /api/rooms/building/:buildingId
// @access  Private
exports.getRoomsByBuilding = async (req, res) => {
  try {
    const buildingId = req.params.buildingId;

    const rooms = await Room.find({ building_id: buildingId })
      .populate("building_id", "name code")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    console.error("Error in getRoomsByBuilding:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy danh sách phòng học theo tòa nhà",
      error: error.message,
    });
  }
};

// @desc    Lấy phòng học theo ID
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate(
      "building_id",
      "name code campus_id"
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng học",
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Error in getRoomById:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy thông tin phòng học",
      error: error.message,
    });
  }
};

// @desc    Tạo phòng học mới
// @route   POST /api/facilities/rooms
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
    } = req.body;

    if (!room_number || !building_id || !floor || !room_type || !capacity) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message:
          "Số phòng, ID tòa nhà, tầng, loại phòng và sức chứa là bắt buộc.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(building_id)) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res
        .status(400)
        .json({ success: false, message: "Mã tòa nhà không hợp lệ" });
    }
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

    const floorNumber = parseInt(floor);
    if (floorNumber > building.floors_count || floorNumber < 1) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: `Tòa nhà ${building.name} chỉ có ${building.floors_count} tầng. Tầng ${floorNumber} không hợp lệ.`,
      });
    }

    const existingRoom = await Room.findOne({
      room_number,
      building_id,
    });
    if (existingRoom) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: "Phòng học này đã tồn tại trong tòa nhà đã chọn",
      });
    }

    let processedEquipment = [];
    if (Array.isArray(equipment)) {
      processedEquipment = equipment.map((item) => {
        if (typeof item === "string") {
          return { name: item, quantity: 1, status: "working" }; // Chuyển đổi string ID thành object
        }
        return item; // Nếu đã là object thì giữ nguyên (cần đảm bảo cấu trúc đúng)
      });
    } else if (typeof equipment === "string" && equipment.trim() !== "") {
      // Trường hợp equipment là chuỗi JSON của mảng object, hoặc chuỗi các ID ngăn cách bởi dấu phẩy
      try {
        const parsed = JSON.parse(equipment);
        if (Array.isArray(parsed)) {
          processedEquipment = parsed
            .map((item) => {
              if (typeof item === "string") {
                return { name: item, quantity: 1, status: "working" };
              } else if (typeof item === "object" && item.name) {
                return { quantity: 1, status: "working", ...item }; // Thêm default nếu thiếu
              }
              return null; // Bỏ qua phần tử không hợp lệ
            })
            .filter((item) => item !== null);
        }
      } catch (e) {
        // Nếu không phải JSON, thử split theo dấu phẩy (ví dụ: "projector,computer")
        processedEquipment = equipment
          .split(",")
          .map((id) => ({ name: id.trim(), quantity: 1, status: "working" }));
        console.warn(
          "Equipment được gửi dưới dạng chuỗi, đã thử split theo dấu phẩy. Kiểm tra lại định dạng."
        );
      }
    }

    const roomData = {
      room_number,
      building_id,
      floor: floorNumber,
      room_type,
      capacity: parseInt(capacity),
      area: area ? parseFloat(area) : undefined,
      equipment: processedEquipment,
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
      message: "Tạo phòng học mới thành công",
    });
  } catch (error) {
    console.error("Error in createRoom:", error);
    if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
      try {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      } catch (cloudinaryDeleteError) {
        console.error(
          "Lỗi khi xóa ảnh Cloudinary sau khi tạo room thất bại:",
          cloudinaryDeleteError
        );
      }
    }
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tạo phòng học mới",
      error: error.message,
    });
  }
};

// @desc    Cập nhật phòng học
// @route   PUT /api/facilities/rooms/:id
// @access  Private (Admin)
exports.updateRoom = async (req, res) => {
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
    } = req.body;
    const roomId = req.params.id;

    let room = await Room.findById(roomId);
    if (!room) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng học",
      });
    }

    const targetBuildingId = building_id || room.building_id.toString();
    let building = await Building.findById(targetBuildingId);
    if (!building) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res
        .status(404)
        .json({ success: false, message: "Tòa nhà tham chiếu không tồn tại." });
    }

    const floorNumber = floor ? parseInt(floor) : room.floor;
    if (floorNumber > building.floors_count || floorNumber < 1) {
      if (req.uploadedCloudinaryFile && req.uploadedCloudinaryFile.public_id) {
        await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
      }
      return res.status(400).json({
        success: false,
        message: `Tòa nhà ${building.name} chỉ có ${building.floors_count} tầng. Tầng ${floorNumber} không hợp lệ.`,
      });
    }

    if (
      (room_number && room_number !== room.room_number) ||
      (building_id && building_id !== room.building_id.toString()) ||
      (floor && parseInt(floor) !== room.floor)
    ) {
      const query = {
        room_number: room_number || room.room_number,
        building_id: targetBuildingId,
        floor: floorNumber,
        _id: { $ne: roomId },
      };
      const existingRoom = await Room.findOne(query);

      if (existingRoom) {
        if (
          req.uploadedCloudinaryFile &&
          req.uploadedCloudinaryFile.public_id
        ) {
          await deleteImageFromCloudinary(req.uploadedCloudinaryFile.public_id);
        }
        return res.status(400).json({
          success: false,
          message: "Thông tin phòng (số phòng, tòa nhà, tầng) đã tồn tại.",
        });
      }
    }

    let processedEquipment = room.equipment; // Mặc định giữ lại giá trị cũ
    if (req.body.hasOwnProperty("equipment")) {
      // Chỉ xử lý nếu equipment được gửi trong body
      if (Array.isArray(equipment)) {
        processedEquipment = equipment
          .map((item) => {
            if (typeof item === "string") {
              return { name: item, quantity: 1, status: "working" };
            } else if (typeof item === "object" && item.name) {
              // Đảm bảo có các trường default nếu thiếu, giữ lại các trường đã có
              return { quantity: 1, status: "working", ...item };
            }
            return null; // Hoặc bỏ qua nếu item không hợp lệ
          })
          .filter((item) => item !== null);
      } else if (typeof equipment === "string") {
        try {
          const parsed = JSON.parse(equipment);
          if (Array.isArray(parsed)) {
            processedEquipment = parsed
              .map((item) => {
                if (typeof item === "string") {
                  return { name: item, quantity: 1, status: "working" };
                } else if (typeof item === "object" && item.name) {
                  return { quantity: 1, status: "working", ...item };
                }
                return null;
              })
              .filter((item) => item !== null);
          }
        } catch (e) {
          if (equipment.trim() === "") {
            // Nếu gửi chuỗi rỗng là muốn xóa hết equipment
            processedEquipment = [];
          } else {
            // Nếu không phải JSON, thử split theo dấu phẩy
            processedEquipment = equipment.split(",").map((id) => ({
              name: id.trim(),
              quantity: 1,
              status: "working",
            }));
            console.warn(
              "Equipment được gửi dưới dạng chuỗi cho update, đã thử split theo dấu phẩy. Kiểm tra lại định dạng."
            );
          }
        }
      } else if (equipment === null) {
        // Nếu gửi null là muốn xóa hết equipment
        processedEquipment = [];
      }
    }

    const updateData = { ...req.body };
    delete updateData.imageFile;
    delete updateData.remove_image;
    updateData.equipment = processedEquipment;
    updateData.floor = floorNumber;

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
    console.error("Error in updateRoom:", error);
    // Cân nhắc xóa ảnh mới nếu đã upload và DB update lỗi (tương tự các hàm khác)
    // Tạm thời chưa rollback ở đây để tránh phức tạp thêm
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi cập nhật phòng học",
      error: error.message,
    });
  }
};

// @desc    Xóa phòng học
// @route   DELETE /api/facilities/rooms/:id
// @access  Private (Admin)
exports.deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng học",
      });
    }

    // Kiểm tra xem có lịch sử dụng phòng nào không
    const scheduleCount = await RoomSchedule.countDocuments({
      room_id: roomId,
    });
    if (scheduleCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa phòng này vì đã có lịch sử dụng phòng. Vui lòng hủy các lịch đặt trước.",
      });
    }

    // Xóa ảnh của room trên Cloudinary nếu có
    if (room.image_public_id) {
      try {
        await deleteImageFromCloudinary(room.image_public_id);
      } catch (cloudinaryError) {
        console.warn(
          `Lỗi khi xóa ảnh room ${room.room_number} (ID: ${room._id}) trên Cloudinary:`,
          cloudinaryError
        );
      }
    }

    await Room.findByIdAndDelete(roomId);

    res.status(200).json({
      success: true,
      message: "Xóa phòng học thành công",
    });
  } catch (error) {
    console.error("Error in deleteRoom:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xóa phòng học",
      error: error.message,
    });
  }
};

// =================== ROOM SCHEDULE CONTROLLERS ===================

// @desc    Lấy lịch sử dụng phòng
// @route   GET /api/facilities/rooms/:id/schedule
// @access  Private
exports.getRoomSchedule = async (req, res) => {
  try {
    const roomId = req.params.id;
    const startDate = req.query.start_date
      ? new Date(req.query.start_date)
      : new Date();
    const endDate = req.query.end_date
      ? new Date(req.query.end_date)
      : new Date(startDate);

    // Nếu không có end_date, mặc định là 7 ngày sau start_date
    if (!req.query.end_date) {
      endDate.setDate(startDate.getDate() + 7);
    }

    const schedule = await RoomSchedule.find({
      room_id: roomId,
      $or: [
        {
          start_time: { $gte: startDate, $lte: endDate },
        },
        {
          end_time: { $gte: startDate, $lte: endDate },
        },
      ],
    })
      .populate("teaching_class_id", "class_name class_code")
      .populate("created_by", "full_name email")
      .sort({ start_time: 1 });

    res.status(200).json({
      success: true,
      count: schedule.length,
      data: schedule,
    });
  } catch (error) {
    console.error("Error in getRoomSchedule:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi lấy lịch sử dụng phòng",
      error: error.message,
    });
  }
};

// @desc    Đặt lịch sử dụng phòng
// @route   POST /api/facilities/rooms/:id/schedule
// @access  Private
exports.scheduleRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const {
      teaching_class_id,
      event_name,
      start_time,
      end_time,
      day_of_week,
      repeat_type,
    } = req.body;

    // Kiểm tra phòng có tồn tại không
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng học",
      });
    }

    // Kiểm tra thời gian đặt phòng
    const startDateTime = new Date(start_time);
    const endDateTime = new Date(end_time);

    if (startDateTime >= endDateTime) {
      return res.status(400).json({
        success: false,
        message: "Thời gian bắt đầu phải trước thời gian kết thúc",
      });
    }

    // Kiểm tra xung đột lịch
    const conflictingSchedule = await RoomSchedule.findOne({
      room_id: roomId,
      $or: [
        {
          start_time: { $lt: endDateTime },
          end_time: { $gt: startDateTime },
        },
        {
          start_time: { $eq: startDateTime },
        },
        {
          end_time: { $eq: endDateTime },
        },
      ],
      day_of_week: day_of_week,
      status: { $ne: "cancelled" },
    });

    if (conflictingSchedule) {
      return res.status(400).json({
        success: false,
        message: "Phòng học đã được đặt trong khoảng thời gian này",
      });
    }

    const schedule = await RoomSchedule.create({
      room_id: roomId,
      teaching_class_id,
      event_name: !teaching_class_id ? event_name : undefined,
      start_time: startDateTime,
      end_time: endDateTime,
      day_of_week,
      repeat_type: repeat_type || "weekly",
      created_by: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: schedule,
      message: "Đặt lịch sử dụng phòng thành công",
    });
  } catch (error) {
    console.error("Error in scheduleRoom:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi đặt lịch sử dụng phòng",
      error: error.message,
    });
  }
};

// @desc    Hủy lịch sử dụng phòng
// @route   PUT /api/facilities/schedule/:id/cancel
// @access  Private
exports.cancelRoomSchedule = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const { reason } = req.body;

    const schedule = await RoomSchedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch sử dụng phòng",
      });
    }

    // Kiểm tra quyền
    if (
      schedule.created_by.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy lịch này",
      });
    }

    schedule.status = "cancelled";
    schedule.cancelReason = reason;
    schedule.cancelledAt = new Date();
    schedule.cancelledBy = req.user.id;

    await schedule.save();

    res.status(200).json({
      success: true,
      data: schedule,
      message: "Hủy lịch sử dụng phòng thành công",
    });
  } catch (error) {
    console.error("Error in cancelRoomSchedule:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi hủy lịch sử dụng phòng",
      error: error.message,
    });
  }
};

// @desc    Tìm phòng trống theo thời gian
// @route   GET /api/facilities/rooms/available
// @access  Private
exports.findAvailableRooms = async (req, res) => {
  try {
    const {
      start_time,
      end_time,
      day_of_week,
      building_id,
      capacity,
      room_type,
    } = req.query;

    if (!start_time || !end_time || !day_of_week) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin thời gian tìm kiếm",
      });
    }

    const startDateTime = new Date(start_time);
    const endDateTime = new Date(end_time);
    const dayOfWeek = parseInt(day_of_week);

    if (startDateTime >= endDateTime) {
      return res.status(400).json({
        success: false,
        message: "Thời gian bắt đầu phải trước thời gian kết thúc",
      });
    }

    // Tìm các phòng đã đặt trong khoảng thời gian này
    const bookedRooms = await RoomSchedule.find({
      $or: [
        {
          start_time: { $lt: endDateTime },
          end_time: { $gt: startDateTime },
        },
        {
          start_time: { $eq: startDateTime },
        },
        {
          end_time: { $eq: endDateTime },
        },
      ],
      day_of_week: dayOfWeek,
      status: { $ne: "cancelled" },
    }).distinct("room_id");

    // Tìm các phòng trống
    let query = {
      _id: { $nin: bookedRooms },
      status: "available",
    };

    if (building_id) {
      query.building_id = building_id;
    }

    if (capacity) {
      query.capacity = { $gte: parseInt(capacity) };
    }

    if (room_type) {
      query.room_type = room_type;
    }

    const availableRooms = await Room.find(query)
      .populate("building_id", "name code campus_id")
      .sort({ building_id: 1, floor: 1, room_number: 1 });

    res.status(200).json({
      success: true,
      count: availableRooms.length,
      data: availableRooms,
    });
  } catch (error) {
    console.error("Error in findAvailableRooms:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi tìm phòng trống",
      error: error.message,
    });
  }
};
