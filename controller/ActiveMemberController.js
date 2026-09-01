const service = require("../services/ActiveMemberService");
const ActiveMembers = require("../models/ActiveMember");
const UserClubs = require("../models/UserClub");
const Tasks = require("../models/Task");

// The member's own progress-point records (Member Dashboard, read-only —
// the assign/evaluate side is a separate feature owned by a teammate).
const getMine = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.club) filter.club = req.query.club;
    const items = await ActiveMembers.find(filter)
      .populate("club", "clubName")
      .populate("term", "termName")
      .sort({ createdAt: -1 });
    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEvaluationList = async (req, res) => {
  try {
    const { clubId, departmentId, termId } = req.query;
    if (!clubId || !departmentId || !termId) {
      return res.status(400).json({ error: "Missing required query parameters: clubId, departmentId, termId" });
    }

    // Lấy thành viên của ban trong câu lạc bộ (chỉ lấy role "Thành viên")
    const members = await UserClubs.find({ 
      club: clubId, 
      department: departmentId, 
      role: "Thành viên",
      isActive: true 
    }).populate("user", "fullName username mssv avatar email");

    // Lấy tất cả Tasks của câu lạc bộ, ban trong khoảng thời gian của học kỳ (Semester) có assigneeType là "User"
    const Semesters = require("../models/Semester");
    const currentSemester = await Semesters.findById(termId);
    
    let taskFilter = {
      club: clubId,
      department: departmentId,
      assigneeType: "User"
    };

    if (currentSemester) {
      taskFilter.createdAt = {
        $gte: currentSemester.startDate,
        $lte: currentSemester.endDate
      };
    }

    const tasks = await Tasks.find(taskFilter).populate("event", "eventName");

    // Lấy thông tin điểm đã chấm hiện tại trong ActiveMembers
    const activeMembers = await ActiveMembers.find({
      club: clubId,
      term: termId
    });

    const result = members.map(member => {
      const userObj = member.user || {};
      const memberTasks = tasks.filter(t => t.user && t.user.toString() === userObj._id?.toString());
      const totalTasks = memberTasks.length;
      const doneTasks = memberTasks.filter(t => t.status === "Done").length;

      // Tính Đánh giá chung dựa trên rating của tasks
      let generalRating = "Chưa có đánh giá";
      if (totalTasks > 0) {
        const ratingCounts = { Positive: 0, Neutral: 0, Negative: 0 };
        memberTasks.forEach(t => {
          if (t.rating && ratingCounts[t.rating] !== undefined) {
            ratingCounts[t.rating]++;
          }
        });
        
        const maxCount = Math.max(ratingCounts.Positive, ratingCounts.Neutral, ratingCounts.Negative);
        if (maxCount > 0) {
          if (ratingCounts.Positive === maxCount) generalRating = "Tích cực";
          else if (ratingCounts.Neutral === maxCount) generalRating = "Bình thường";
          else if (ratingCounts.Negative === maxCount) generalRating = "Tiêu cực";
        }
      }

      const activeRecord = activeMembers.find(a => a.user && userObj._id && a.user.toString() === userObj._id.toString());

      return {
        _id: userObj._id,
        name: userObj.fullName || userObj.username,
        mssv: userObj.mssv || "",
        avatar: userObj.avatar || "",
        generalRating,
        totalTasks,
        doneTasks,
        score: activeRecord ? activeRecord.progressPoint : null,
        comment: activeRecord ? activeRecord.comment : null,
        isActiveInTerm: !!activeRecord,
        tasks: memberTasks
      };
    });

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const batchEvaluate = async (req, res) => {
  try {
    const { clubId, termId, evaluations } = req.body;
    if (!clubId || !termId || !Array.isArray(evaluations)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const bulkOps = evaluations.map(ev => ({
      updateOne: {
        filter: { user: ev.userId, club: clubId, term: termId },
        update: {
          $set: {
            progressPoint: ev.score,
            comment: ev.comment,
            activeDate: new Date()
          }
        },
        // upsert: false để tránh tự động thêm thành viên không hoạt động vào bảng ActiveMembers
        upsert: false
      }
    }));

    if (bulkOps.length > 0) {
      await ActiveMembers.bulkWrite(bulkOps);
    }

    res.status(200).json({ message: "Đánh giá thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const create = async (req, res) => {
  try {
    const { club, term } = req.body;
    const userId = req.user.id;

    if (!club || !term) {
      return res.status(400).json({ error: "Thiếu thông tin câu lạc bộ hoặc học kỳ." });
    }

    // 1. Verify user is actually a member of the club
    const isMember = await UserClubs.findOne({ user: userId, club: club, isActive: true });
    if (!isMember) {
      return res.status(403).json({ error: "Bạn không phải là thành viên của câu lạc bộ này." });
    }

    // 2. Check if already registered for this term
    const existing = await ActiveMembers.findOne({ user: userId, club: club, term: term });
    if (existing) {
      return res.status(400).json({ error: "Bạn đã xác nhận tham gia hoạt động cho học kỳ này rồi." });
    }

    // 3. Create active member record
    const item = await service.createOne({
      user: userId,
      club: club,
      term: term,
      activeDate: new Date(),
      isActive: true
    });

    res.status(201).json({ message: "Xác nhận hoạt động thành công!", data: item });
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
    const item = await service.updateById(req.params.id, req.body);
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

module.exports = { create, getAll, getById, update, remove, getMine, getEvaluationList, batchEvaluate };
