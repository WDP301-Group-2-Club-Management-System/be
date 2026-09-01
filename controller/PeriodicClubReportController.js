const service = require("../services/PeriodicClubReportService");
const recordService = require("../services/PeriodicClubReportRecordService");

const create = async (req, res) => {
  try {
    const item = await service.createOne(req.body);
    await recordService.createOne({
      report: item._id,
      title: req.body.title || "Nộp báo cáo lần đầu",
      comment: req.body.comment || "",
      status: item.status,
      createdBy: req.body.createdBy || (req.user ? req.user._id : null),
    });
    res.status(201).json({ message: "Created successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const items = await service.getAll();
    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const oldItem = await service.getById(req.params.id);
    if (!oldItem) return res.status(404).json({ error: "Not found" });

    // Cập nhật lại status thành PENDING nếu sửa (trừ khi có status khác truyền vào)
    if (!req.body.status) {
      req.body.status = "PENDING";
    }

    const item = await service.updateById(req.params.id, req.body);
    
    let feedbackTitle = req.body.title || "";
    if (!feedbackTitle) {
      if (req.body.status === "PENDING") {
        feedbackTitle = "Cập nhật báo cáo";
      } else if (req.body.status === "APPROVED") {
        feedbackTitle = "Phê duyệt báo cáo";
      } else if (req.body.status === "REJECTED") {
        feedbackTitle = "Từ chối báo cáo";
      } else {
        feedbackTitle = "Cập nhật trạng thái";
      }
    }

    await recordService.createOne({
      report: item._id,
      title: feedbackTitle,
      comment: req.body.comment || "",
      status: item.status,
      createdBy: req.body.createdBy || (req.user ? req.user._id : null),
    });

    res.status(200).json({ message: "Updated successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const item = await service.deleteById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getContext = async (req, res) => {
  try {
    const data = await service.getContext(req.params.clubId);
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const data = await recordService.getHistoryByReportId(req.params.id);
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { create, getAll, getById, update, remove, getContext, getHistory };
