const service = require("../services/ClubMeetingService");
const UserClub = require("../models/UserClub");
const NotificationService = require("../services/NotificationService");
const Club = require("../models/Club");

const create = async (req, res) => {
  try {
    const item = await service.createOne(req.body);
    
    // Gửi thông báo cho tất cả thành viên trong CLB
    const clubId = req.body.club;
    const meetingTitle = req.body.meetingTitle || 'Cuộc họp mới';
    const urlMeeting = req.body.urlMeeting || '';
    
    const members = await UserClub.find({ club: clubId, isActive: true });
    if (members.length > 0) {
      const clubDoc = await Club.findById(clubId);
      const clubName = clubDoc ? clubDoc.clubName : 'Câu lạc bộ';
      
      let content = `Bạn có một cuộc họp mới: ${meetingTitle} từ ${clubName}.`;
      if (urlMeeting) {
        content += `\nLink tham gia họp: ${urlMeeting}`;
      }

      const notifications = members.map(member => ({
        title: "Thông báo cuộc họp mới",
        content: content,
        receiver: member.user,
        sender: req.user ? req.user.id : null,
        priority: "HIGH"
      }));

      // Chạy vòng lặp hoặc promise all (có thể viết hàm createMany nếu có, nhưng hiện tại cứ lặp createOne)
      await Promise.all(notifications.map(noti => NotificationService.createOne(noti)));
    }

    res.status(201).json({ message: "Created successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const clubId = req.query.clubId;
    const items = await service.getAll(clubId);
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

module.exports = { create, getAll, getById, update, remove };
