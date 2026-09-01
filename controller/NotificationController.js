const service = require("../services/NotificationService");
const Notifications = require("../models/Notification");

const create = async (req, res) => {
  try {
    if (req.user.permission === "Student") {
      return res.status(403).json({ error: "Bạn không có quyền gửi thông báo" });
    }
    const { receiver, title, content, priority } = req.body;
    const sender = req.user.id;
    if (receiver && sender.toString() === receiver.toString()) {
      return res.status(400).json({ error: "Không thể tự gửi mail cho bản thân" });
    }
    const item = await service.createOne({ receiver, title, content, priority, sender });
    res.status(201).json({ message: "Created successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const { page, pageSize, status, priority, mine } = req.query;
    // "mine=sent" lets a sender view their own Sent box; default is the inbox.
    const filter = mine === "sent" ? { sender: req.user.id } : { receiver: req.user.id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    const result = await service.getAll(filter, { page, pageSize });
    res.status(200).json({ data: result.items, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    const isOwner =
      item.receiver?._id?.toString() === req.user.id ||
      item.sender?._id?.toString() === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Forbidden" });
    res.status(200).json({ data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const noti = await Notifications.findById(req.params.id);
    if (!noti) return res.status(404).json({ error: "Not found" });
    if (noti.receiver.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    // Only the read/unread status can be changed by the receiver — everything
    // else about a notification is fixed by whoever sent it.
    const { status } = req.body;
    const item = await service.updateById(req.params.id, { status });
    res.status(200).json({ message: "Updated successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const noti = await service.getById(req.params.id);
    if (!noti) return res.status(404).json({ error: "Not found" });
    const isOwner =
      noti.receiver?._id?.toString() === req.user.id ||
      noti.sender?._id?.toString() === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Forbidden" });
    await service.deleteById(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeAll = async (req, res) => {
  try {
    const Notifications = require("../models/Notification");
    await Notifications.deleteMany({ receiver: req.user.id });
    res.status(200).json({ message: "Deleted all successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { create, getAll, getById, update, remove, removeAll };
