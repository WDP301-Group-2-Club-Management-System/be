const service = require("../services/TaskService");

const create = async (req, res) => {
  try {
    const item = await service.createOne(req.body);
    res.status(201).json({ message: "Created successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.club) filter.club = req.query.club;
    if (req.query.event) filter.event = req.query.event;
    if (req.query.term) filter.term = req.query.term;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.assigneeType) filter.assigneeType = req.query.assigneeType;
    if (req.query.parentTaskId) filter.parentTaskId = req.query.parentTaskId;
    if (req.query.user) filter.user = req.query.user;

    if (req.query.semesterId) {
      const Semesters = require("../models/Semester");
      const currentSemester = await Semesters.findById(req.query.semesterId);
      if (currentSemester) {
        filter.createdAt = {
          $gte: currentSemester.startDate,
          $lte: currentSemester.endDate
        };
      }
    }

    const items = await service.getAll(filter);
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
    const { status } = req.body;
    if (status !== undefined) {
      if (!status || !status.trim()) {
        return res.status(400).json({ error: "Vui lòng chọn trạng thái" });
      }
      const { TASK_STATUS } = require("../constrant/schema");
      if (!TASK_STATUS.includes(status)) {
        return res.status(400).json({ error: "Trạng thái không hợp lệ." });
      }
    }
    const oldItem = await service.getById(req.params.id);
    const item = await service.updateById(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });

    if (req.body.status || req.body.reviewComment || req.body.submitComment || req.body.title || req.body.content) {
      const feedbackService = require("../services/TaskFeedbackService");
      
      let feedbackTitle = "";
      let feedbackComment = "";

      if (req.body.status === "Review") {
        // Sinh viên nộp bài: Lấy submitComment làm Title in đậm trong Lịch sử
        feedbackTitle = req.body.submitComment || "Nộp báo cáo / Kết quả";
        feedbackComment = "";
      } else if (req.body.status === "Done" || req.body.status === "Rejected") {
        // Trưởng ban duyệt: Lấy reviewComment làm Comment in nhạt
        feedbackTitle = "";
        feedbackComment = req.body.reviewComment || "";
      } else {
        // Fallback
        feedbackTitle = req.body.title || "";
        feedbackComment = req.body.submitComment || "";
      }

      await feedbackService.createOne({
        task: item._id,
        title: feedbackTitle,
        comment: feedbackComment,
        status: req.body.status || oldItem.status,
      });
    }
    if (!item) return res.status(404).json({ error: "Not found" });
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

module.exports = { create, getAll, getById, update, remove };
