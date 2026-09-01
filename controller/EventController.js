const eventService = require("../services/EventService");

const create = async (req, res) => {
  try {
    const { eventName, capacity, defenseDate } = req.body;
    if (eventName && eventName.length > 100) {
      return res.status(400).json({ success: false, error: "Tên sự kiện quá dài (tối đa 100 ký tự)." });
    }
    if (capacity !== undefined) {
      const cap = parseInt(capacity);
      if (isNaN(cap) || cap <= 0 || cap > 10000) {
        return res.status(400).json({ success: false, error: "Số lượng tối đa phải lớn hơn 0 và nhỏ hơn 10000 người." });
      }
    }
    if (defenseDate) {
      const defDate = new Date(defenseDate);
      defDate.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      if (defDate < tomorrow) {
        return res.status(400).json({ success: false, error: "Ngày bảo vệ đề án phải bắt đầu từ ngày mai trở đi." });
      }
    }
    const eventData = { ...req.body };
    if (req.file) {
      eventData.eventImg = req.file.path;
    }
    const newEvent = await eventService.createOne(eventData);

    return res.status(201).json({
      success: true,
      message: "Created successfully",
      data: newEvent,
    });
  } catch (err) {
    const status = (err.message.includes("giới hạn tối đa") || err.message.includes("đang ACTIVE")) ? 400 : 500;
    return res.status(status).json({
      success: false,
      error: err.message,
    });
  }
};

const getAll = async (req, res) => {
  try {
    const { clubId, approvalStatus } = req.query;
    const filter = {};
    if (clubId) {
      filter.club = clubId;
    }
    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }
    const events = await eventService.getAll(filter);

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventService.getById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { eventName, capacity, defenseDate } = req.body;
    if (eventName && eventName.length > 100) {
      return res.status(400).json({ success: false, error: "Tên sự kiện quá dài (tối đa 100 ký tự)." });
    }
    if (capacity !== undefined) {
      const cap = parseInt(capacity);
      if (isNaN(cap) || cap <= 0 || cap > 10000) {
        return res.status(400).json({ success: false, error: "Số lượng tối đa phải lớn hơn 0 và nhỏ hơn 10000 người." });
      }
    }
    if (defenseDate) {
      const defDate = new Date(defenseDate);
      defDate.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      if (defDate < tomorrow) {
        return res.status(400).json({ success: false, error: "Ngày bảo vệ đề án phải bắt đầu từ ngày mai trở đi." });
      }
    }
    const eventData = { ...req.body };
    if (req.file) {
      eventData.eventImg = req.file.path;
    }
    const updatedEvent = await eventService.updateById(id, eventData);

    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Updated successfully",
      data: updatedEvent,
    });
  } catch (err) {
    const status = (err.message.includes("giới hạn tối đa") || err.message.includes("đang ACTIVE")) ? 400 : 500;
    return res.status(status).json({
      success: false,
      error: err.message,
    });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await eventService.deleteById(id);

    if (!deletedEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
};