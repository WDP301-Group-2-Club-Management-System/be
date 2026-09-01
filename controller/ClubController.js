const service = require("../services/ClubService");
const ClubApprovalHistory = require("../models/ClubApprovalHistory");
const Clubs = require("../models/Club");
const UserClubs = require("../models/UserClub");
const Events = require("../models/Event");
const Departments = require("../models/Department");
const Documents = require("../models/Document");
const { isClubChairman } = require("../utils/clubAuth");

const create = async (req, res) => {
  try {
    console.log("HEADERS:", req.headers['content-type']);
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    
    // Default to empty object if req.body is undefined to prevent crash
    const body = req.body || {};
    const { clubName, contactGmail, contactPhone, departments, documents, clubImg, coverImg, ...rest } = body;

    let uploadedClubImg = clubImg;
    let uploadedCoverImg = coverImg;

    if (req.files) {
      if (req.files.clubImg && req.files.clubImg[0]) {
        uploadedClubImg = req.files.clubImg[0].path;
      }
      if (req.files.coverImg && req.files.coverImg[0]) {
        uploadedCoverImg = req.files.coverImg[0].path;
      }
    }

    // 1. Validate clubName uniqueness (case insensitive)
    if (!clubName || !clubName.trim()) {
      return res.status(400).json({ error: "Tên câu lạc bộ không được để trống." });
    }
    const nameTaken = await Clubs.findOne({
      clubName: { $regex: new RegExp("^" + clubName.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") }
    });
    if (nameTaken) {
      return res.status(400).json({ error: `Tên câu lạc bộ '${clubName}' đã được sử dụng. Vui lòng chọn tên khác.` });
    }

    // 2. Validate contactGmail uniqueness
    if (!contactGmail || !contactGmail.trim()) {
      return res.status(400).json({ error: "Email liên hệ không được để trống." });
    }
    const emailTaken = await Clubs.findOne({ contactGmail: contactGmail.trim() });
    if (emailTaken) {
      return res.status(400).json({ error: "Email liên hệ đã được sử dụng. Vui lòng chọn email khác." });
    }

    // 3. Validate contactPhone 10-digits
    if (contactPhone && contactPhone.trim()) {
      if (!/^\d{10}$/.test(contactPhone.trim())) {
        return res.status(400).json({ error: "Số điện thoại phải là 10 chữ số và không chứa chữ cái hoặc ký tự đặc biệt." });
      }
    }

    // 4. Create club
    const clubData = {
      ...rest,
      clubName: clubName.trim(),
      contactGmail: contactGmail.trim(),
      contactPhone: contactPhone ? contactPhone.trim() : "",
      clubImg: uploadedClubImg,
      coverImg: uploadedCoverImg,
      clubStatus: false,
      clubRequestStatus: "Pending",
      currentRequestType: "Create",
    };

    const item = await Clubs.create(clubData);

    // 5. Create Departments and Documents
    const deptIds = [];
    if (departments && Array.isArray(departments)) {
      for (const deptName of departments) {
        if (deptName && deptName.trim()) {
          const newDept = await Departments.create({
            departmentName: deptName.trim(),
            club: item._id,
          });
          deptIds.push(newDept._id);
        }
      }
    }

    const docIds = [];
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.documentName && doc.documentUrl) {
          const newDoc = await Documents.create({
            documentName: doc.documentName.trim(),
            documentUrl: doc.documentUrl.trim(),
                          documentType: "Other", // Default type for club registration docs
              club: item._id,
            });
            docIds.push(newDoc._id);
          }
        }
      }
  
      if (deptIds.length > 0 || docIds.length > 0) {
        item.departments = deptIds;
        item.documents = docIds;
        await item.save();
      }
  
      // 6. Create UserClub mapping for the creator (Chủ nhiệm)
      await UserClubs.create({
        user: req.user.id,
        club: item._id,
        role: "Chủ nhiệm",
        isActive: true,
      });
  
      // 7. Create ClubApprovalHistory record
      await ClubApprovalHistory.create({
        club: item._id,
        actionType: "Pending",
        requestType: "Create",
        title: "Đăng ký câu lạc bộ mới",
        reason: ""
      });
  
      res.status(201).json({ message: "Created successfully", data: item });
    } catch (error) {
      console.error("CREATE ERROR:", error);
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
    
    const clubObj = typeof item.toObject === 'function' ? item.toObject() : { ...item };
    
    // Fetch departments directly to ensure we get all of them even if the array is out of sync
    const departments = await Departments.find({ club: req.params.id });
    clubObj.departments = departments;

    res.status(200).json({ data: clubObj });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { clubName, contactPhone, updateRequestNote } = req.body;
    const clubId = req.params.id;

    // Only the Chairman may edit a club's general info/logo (UC27 BR-01).
    if (!(await isClubChairman(req.user.id, clubId))) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền chỉnh sửa thông tin câu lạc bộ." });
    }

    // 1. Validate clubName uniqueness (excluding current club)
    if (clubName && clubName.trim()) {
      const nameTaken = await Clubs.findOne({
        _id: { $ne: clubId },
        clubName: { $regex: new RegExp("^" + clubName.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") }
      });
      if (nameTaken) {
        return res.status(400).json({ error: `Tên câu lạc bộ '${clubName}' đã được sử dụng. Vui lòng chọn tên khác.` });
      }
    }

    // 2. Validate contactPhone
    if (contactPhone && contactPhone.trim()) {
      if (!/^\d{10}$/.test(contactPhone.trim())) {
        return res.status(400).json({ error: "Số điện thoại phải là 10 chữ số và không chứa chữ cái hoặc ký tự đặc biệt." });
      }
    }

    // 3. Validate updateRequestNote is present
    if (!updateRequestNote || !updateRequestNote.trim()) {
      return res.status(400).json({ error: "Ghi chú yêu cầu cập nhật không được để trống." });
    }

    // 4. Update club
    const item = await service.updateById(clubId, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });

    // 5. Create ClubApprovalHistory record
    await ClubApprovalHistory.create({
      club: item._id,
      actionType: "Pending",
      requestType: "Update",
      title: updateRequestNote.trim(),
      reason: ""
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

// PDP overview dashboard: real aggregated counts instead of the FE's old
// client-side guesses (Club has no memberCount/eventCount/status fields —
// those were always reading undefined and silently defaulting to 0/false).
const getPdpSummary = async (req, res) => {
  try {
    const [clubs, totalEvents, distinctMembers, pendingApprovals] = await Promise.all([
      Clubs.aggregate([
        {
          $lookup: {
            from: UserClubs.collection.name,
            localField: "_id",
            foreignField: "club",
            as: "members",
          },
        },
        {
          $lookup: {
            from: Events.collection.name,
            localField: "_id",
            foreignField: "club",
            as: "events",
          },
        },
        {
          $project: {
            clubName: 1,
            category: 1,
            clubStatus: 1,
            clubRequestStatus: 1,
            memberCount: { $size: "$members" },
            eventCount: { $size: "$events" },
          },
        },
      ]),
      Events.countDocuments(),
      UserClubs.distinct("user"),
      Clubs.countDocuments({ clubRequestStatus: "Pending" }),
    ]);

    res.status(200).json({
      data: {
        totalClubs: clubs.length,
        totalEvents,
        totalMembers: distinctMembers.length,
        pendingApprovals,
        clubs: clubs.map((c) => ({
          key: c._id,
          clubName: c.clubName,
          category: c.category,
          memberCount: c.memberCount,
          eventCount: c.eventCount,
          status: c.clubStatus ? "Hoạt động" : "Ngừng HĐ",
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Real disk-backed logo upload (replaces the FE's old preset-thumbnails/URL
// text box). Rides along the same Chairman-only + updateRequestNote-required
// workflow as general-info edits (UC27/UC26 treat logo as part of the same
// single edit+note submission, not a separate flow).
const uploadLogo = async (req, res) => {
  try {
    const clubId = req.params.id;
    const { updateRequestNote } = req.body;

    if (!(await isClubChairman(req.user.id, clubId))) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền chỉnh sửa logo câu lạc bộ." });
    }
    if (!updateRequestNote || !updateRequestNote.trim()) {
      return res.status(400).json({ error: "Ghi chú yêu cầu cập nhật không được để trống." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Vui lòng chọn một tệp ảnh để tải lên." });
    }

    const clubImg = `/uploads/clubs/${req.file.filename}`;
    const item = await service.updateById(clubId, { clubImg });
    if (!item) return res.status(404).json({ error: "Not found" });

    await ClubApprovalHistory.create({
      club: item._id,
      actionType: "Pending",
      requestType: "Update",
      title: updateRequestNote.trim(),
      reason: "",
    });

    res.status(200).json({ message: "C?p nh?t logo th�nh c�ng!", data: item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const reviewClubRequest = async (req, res) => {
  try {
    const { actionType, reason } = req.body;
    const clubId = req.params.id;

    if (!["Approved", "Rejected"].includes(actionType)) {
      return res.status(400).json({ error: "Invalid actionType" });
    }

    const club = await Clubs.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });
    if (club.clubRequestStatus !== "Pending") {
      return res.status(400).json({ error: "Club request is not pending" });
    }

    const originalReqType = club.currentRequestType;

    // Update club status based on action
    if (actionType === "Approved") {
      if (originalReqType === "Update" && club.parentClubId) {
        // Find parent and merge
        const parentClub = await Clubs.findById(club.parentClubId);
        if (parentClub) {
          parentClub.clubName = club.clubName;
          parentClub.contactGmail = club.contactGmail;
          parentClub.contactPhone = club.contactPhone;
          parentClub.slogan = club.slogan;
          parentClub.description = club.description;
          parentClub.contactUrl = club.contactUrl;
          if (club.clubImg) parentClub.clubImg = club.clubImg;
          if (club.coverImg) parentClub.coverImg = club.coverImg;
          parentClub.departments = club.departments;
          parentClub.documents = club.documents;
          
          await parentClub.save();

          // Move Departments and Documents ownership to parentClub
          await Departments.updateMany({ club: club._id }, { $set: { club: parentClub._id } });
          await Documents.updateMany({ club: club._id }, { $set: { club: parentClub._id } });

          // Mark Draft as Approved
          club.clubRequestStatus = "Approved";
          club.currentRequestType = null;
        }
      } else {
        // Create Request Approved
        club.clubRequestStatus = "Approved";
        club.currentRequestType = null;
        club.lastRejectReason = null;
        if (!club.clubStatus) {
          club.clubStatus = true; // Activate club if it was newly created
        }
      }
    } else if (actionType === "Rejected") {
      club.clubRequestStatus = "Rejected";
      club.lastRejectReason = reason;
    }

    await club.save();

    // Log history
    await ClubApprovalHistory.create({
      club: club._id,
      actionType,
      title: "",
      reason: reason || (actionType === "Approved" ? "PDP đã duyệt thành công" : ""),
      requestType: originalReqType,
    });

    res.status(200).json({ message: "Review processed successfully", data: club });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getClubHistory = async (req, res) => {
  try {
    const clubId = req.params.id;
    const history = await ClubApprovalHistory.find({ club: clubId }).sort({ actionAt: 1 });
    res.status(200).json({ data: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyClubRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userClubs = await UserClubs.find({ user: userId, role: { $in: ["Chủ nhiệm", "LEADER"] } }).populate("club").lean();
    
    const clubs = [];
    for (const uc of userClubs) {
      if (uc.club) {
        const club = uc.club;
        // Option B: If this club is Approved, check if it has a Draft
        if (club.clubRequestStatus === "Approved") {
          const draft = await Clubs.findOne({ parentClubId: club._id, clubRequestStatus: { $ne: "Approved" } }).lean();
          if (draft) {
            club.draftId = draft._id;
            club.draftStatus = draft.clubRequestStatus;
            club.draftRequestType = draft.currentRequestType;
          }
        }
        clubs.push(club);
      }
    }
    
    clubs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.status(200).json({ data: clubs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const submitEditRequest = async (req, res) => {
  try {
    console.log("HEADERS:", req.headers['content-type']);
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    
    const body = req.body || {};
    const { clubName, contactGmail, contactPhone, departments, documents, updateRequestNote, clubImg, coverImg, ...rest } = body;
    const clubId = req.params.id;

    let uploadedClubImg = clubImg;
    let uploadedCoverImg = coverImg;

    if (req.files) {
      if (req.files.clubImg && req.files.clubImg[0]) {
        uploadedClubImg = req.files.clubImg[0].path;
      }
      if (req.files.coverImg && req.files.coverImg[0]) {
        uploadedCoverImg = req.files.coverImg[0].path;
      }
    }

    if (!(await isClubChairman(req.user.id, clubId))) {
      return res.status(403).json({ error: "Ch? Ch? nhi?m m?i c� quy?n s?a d?i th�ng tin c�u l?c b?." });
    }

    const club = await Clubs.findById(clubId);
    if (!club) return res.status(404).json({ error: "Club not found" });

    // Validate clubName uniqueness
    if (clubName && clubName.trim()) {
      const nameTaken = await Clubs.findOne({
        _id: { $ne: clubId },
        parentClubId: { $ne: clubId },
        clubName: { $regex: new RegExp("^" + clubName.trim().replace(/[-\\/\\^$*+?.()|[\\]{}]/g, "\\$&") + "$", "i") }
      });
      if (nameTaken) {
        return res.status(400).json({ error: `T�n c�u l?c b? ${clubName} d� du?c s? d?ng. Vui l�ng ch?n t�n kh�c.` });
      }
    }

    // Prepare fields
    const clubData = {
      ...rest,
      clubName: clubName ? clubName.trim() : club.clubName,
      contactGmail: contactGmail ? contactGmail.trim() : club.contactGmail,
      contactPhone: contactPhone ? contactPhone.trim() : club.contactPhone,
      clubImg: uploadedClubImg || club.clubImg,
      coverImg: uploadedCoverImg || club.coverImg,
      clubRequestStatus: "Pending",
    };

    let targetClubId = clubId;
    let targetClub = club;

    if (club.clubRequestStatus === "Approved") {
      const existingDraft = await Clubs.findOne({ parentClubId: clubId, clubRequestStatus: { $ne: "Approved" } });
      if (existingDraft) {
        return res.status(400).json({ error: "Câu lạc bộ đang có một bản cập nhật chờ duyệt. Vui lòng chỉnh sửa bản cập nhật đó." });
      }

      clubData.parentClubId = clubId;
      clubData.currentRequestType = "Update";
      clubData.clubStatus = false;
      clubData.lastRejectReason = null;

      targetClub = await Clubs.create(clubData);
      targetClubId = targetClub._id;
    } else {
      targetClub = await Clubs.findByIdAndUpdate(clubId, clubData, { new: true });
    }

    // Sync Departments
    const deptIds = [];
    if (departments && Array.isArray(departments)) {
      const existingDepts = await Departments.find({ club: targetClubId });
      const newNames = departments.map(d => d.trim()).filter(Boolean);
      
      for (const ed of existingDepts) {
        if (!newNames.includes(ed.departmentName)) {
          await Departments.findByIdAndDelete(ed._id);
        }
      }

      for (const deptName of newNames) {
        let existing = existingDepts.find(ed => ed.departmentName === deptName);
        if (existing) {
          deptIds.push(existing._id);
        } else {
          const newDept = await Departments.create({ departmentName: deptName, club: targetClubId });
          deptIds.push(newDept._id);
        }
      }
    }

    // Sync Documents
    const docIds = [];
    if (documents && Array.isArray(documents)) {
      await Documents.deleteMany({ club: targetClubId, documentType: "Other" });
      for (const doc of documents) {
        if (doc.documentName && doc.documentUrl) {
          const newDoc = await Documents.create({
            documentName: doc.documentName.trim(),
            documentUrl: doc.documentUrl.trim(),
            documentType: "Other",
            club: targetClubId,
          });
          docIds.push(newDoc._id);
        }
      }
    }

    targetClub.departments = deptIds;
    if (docIds.length > 0) targetClub.documents = docIds;
    await targetClub.save();

    await ClubApprovalHistory.create({
      club: targetClubId,
      actionType: "Pending",
      requestType: targetClub.currentRequestType || "Update",
      title: updateRequestNote ? updateRequestNote.trim() : "Nộp lại đơn",
      reason: ""
    });

    res.status(200).json({ message: "Submitted successfully", data: targetClub });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



const deleteClubRequest = async (req, res) => {
  try {
    const clubId = req.params.id;
    const targetClub = await Clubs.findById(clubId);
    
    if (!targetClub) {
      return res.status(404).json({ error: "Không tìm thấy đơn." });
    }
    
    const permissionClubId = targetClub.parentClubId || targetClub._id;
    const isChairman = await UserClubs.findOne({ 
      user: req.user.id, 
      club: permissionClubId, 
      role: { $in: ["Chủ nhiệm", "LEADER"] } 
    });
    
    if (!isChairman) {
      return res.status(403).json({ error: "Chỉ Chủ nhiệm mới có quyền xóa đơn yêu cầu." });
    }
    
    if (targetClub.clubRequestStatus !== "Pending") {
      return res.status(400).json({ error: "Chỉ có thể xóa các đơn đang chờ duyệt (Pending)." });
    }
    
    // Xóa dữ liệu chung của đơn
    await Departments.deleteMany({ club: targetClub._id });
    await ClubApprovalHistory.deleteMany({ club: targetClub._id });
    const Documents = require("../models/Document");
    await Documents.deleteMany({ club: targetClub._id });
    
    // Nếu là đơn khởi tạo, xóa luôn UserClubs (người tạo đơn)
    if (targetClub.currentRequestType === "Create") {
      await UserClubs.deleteMany({ club: targetClub._id });
    }
    
    // Xóa đơn (bản thân document Clubs)
    await Clubs.findByIdAndDelete(targetClub._id);
    
    res.status(200).json({ message: "Xóa đơn yêu cầu thành công." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { deleteClubRequest, create, getAll, getById, update, remove, getPdpSummary, uploadLogo, reviewClubRequest, getClubHistory, getMyClubRequests, submitEditRequest };
