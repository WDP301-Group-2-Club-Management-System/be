const service = require("../services/RecruitmentApplicationService");
const UserClubService = require("../services/UserClubService");
const NotificationService = require("../services/NotificationService");
const RecruitmentCampaigns = require("../models/RecruitmentCampaign");
const Clubs = require("../models/Club");

const create = async (req, res) => {
  try {
    const { campaign, introduction, cvLink } = req.body;
    const user = req.user.id;

    if (!campaign) {
      return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin ứng tuyển." });
    }

    const campaignDoc = await RecruitmentCampaigns.findById(campaign);
    if (!campaignDoc) return res.status(404).json({ error: "Không tìm thấy đợt tuyển quân." });

    // Chặn thành viên đã gia nhập CLB không được đăng ký tuyển quân lại
    const UserClubs = require("../models/UserClub");
    const existingMembership = await UserClubs.findOne({ user, club: campaignDoc.club, isActive: true });
    if (existingMembership) {
      return res.status(400).json({ error: "Bạn đã là thành viên của câu lạc bộ này, không cần đăng ký tuyển quân." });
    }

    const item = await service.createOne({
      user,
      campaign,
      introduction,
      cvLink,
      status: 'NEW'
    });

    res.status(201).json({ message: "Nộp đơn thành công", data: item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Bạn đã nộp đơn cho đợt tuyển quân này rồi." });
    }
    res.status(400).json({ error: error.message });
  }
};

const checkApplication = async (req, res) => {
  try {
    const user = req.user.id;
    const campaignId = req.params.campaignId;
    const RecruitmentApplications = require("../models/RecruitmentApplication");
    const application = await RecruitmentApplications.findOne({ user, campaign: campaignId });
    res.status(200).json({ hasApplied: !!application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.campaign) filter.campaign = req.query.campaign;
    if (req.query.user) filter.user = req.query.user;

    const items = await service.getAll(filter);
    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status, rejectReason } = req.body;
    const item = await service.updateById(req.params.id, { status, rejectReason });
    if (!item) return res.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." });

    // Lấy thông tin application để gửi thông báo
    const application = await service.getById(req.params.id);
    console.log("application populated:", application);
    if (application && application.campaign) {
      const clubDoc = await Clubs.findById(application.campaign.club);
      console.log("clubDoc found:", clubDoc);
      if (clubDoc) {
        let title = "Cập nhật trạng thái ứng tuyển";
        let content = `Đơn ứng tuyển của bạn vào Câu lạc bộ ${clubDoc.clubName} đã được cập nhật trạng thái mới.`;
        
        if (status === 'REJECTED') {
          title = "Thông báo kết quả tuyển quân";
          content = `Rất tiếc, đơn ứng tuyển của bạn vào Câu lạc bộ ${clubDoc.clubName} đã bị từ chối. Cảm ơn bạn đã quan tâm đến câu lạc bộ!`;
        } else if (status === 'INTERVIEW') {
          title = "Thông báo vòng Phỏng vấn";
          content = `Chúc mừng! Đơn ứng tuyển của bạn vào Câu lạc bộ ${clubDoc.clubName} đã vượt qua vòng hồ sơ. Bạn đã được chuyển sang vòng Phỏng vấn.`;
        } else if (status === 'CHALLENGE') {
          title = "Thông báo vòng Thử thách";
          content = `Chúc mừng! Bạn đã xuất sắc vượt qua vòng phỏng vấn của Câu lạc bộ ${clubDoc.clubName}. Bạn đã được chuyển sang vòng Thử thách.`;
        }

        console.log("Creating notification for user:", application.user._id, "with priority:", status === 'REJECTED' ? "LOW" : "HIGH");
        await NotificationService.createOne({
          title,
          content,
          receiver: application.user._id,
          sender: req.user.id,
          priority: status === 'REJECTED' ? "LOW" : "HIGH",
        });
        console.log("Notification created successfully");
      }
    }

    res.status(200).json({ message: "Cập nhật trạng thái thành công", data: item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const approveApplication = async (req, res) => {
  try {
    const { department, role } = req.body; // Chairman sets department and role
    const application = await service.getById(req.params.id);
    if (!application) return res.status(404).json({ error: "Không tìm thấy đơn ứng tuyển." });

    const campaign = await RecruitmentCampaigns.findById(application.campaign);
    if (!campaign) return res.status(404).json({ error: "Không tìm thấy đợt tuyển quân." });

    // Update status to ACCEPTED
    await service.updateById(req.params.id, { status: 'ACCEPTED' });

    const roleName = role || "Thành viên";

    // Kiểm tra xem user đã là thành viên CLB chưa trước khi tạo bản ghi mới
    const UserClubs = require("../models/UserClub");
    const existingMembership = await UserClubs.findOne({ user: application.user._id, club: campaign.club, isActive: true });
    if (!existingMembership) {
      // Chỉ tạo UserClub khi chưa là thành viên
      const userClubData = {
        user: application.user._id,
        club: campaign.club,
        role: roleName,
        joinDate: new Date(),
        isActive: true
      };
      if (department) userClubData.department = department;
      await UserClubService.createOne(userClubData);
    }

    // Send notification
    const clubDoc = await Clubs.findById(campaign.club);
    if (clubDoc) {
      await NotificationService.createOne({
        title: "Chúc mừng bạn đã trúng tuyển!",
        content: `Bạn đã xuất sắc vượt qua các vòng tuyển quân và chính thức trở thành ${roleName} của Câu lạc bộ ${clubDoc.clubName}.`,
        receiver: application.user._id,
        sender: req.user.id,
        priority: "HIGH",
      });
    }

    res.status(200).json({ message: "Duyệt ứng viên thành công!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { create, checkApplication, getAll, updateStatus, approveApplication };
