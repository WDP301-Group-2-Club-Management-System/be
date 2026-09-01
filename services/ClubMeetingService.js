const ClubMeetings = require("../models/ClubMeeting");

const createOne = async (data) => {
  const item = new ClubMeetings(data);
  return await item.save();
};

const getAll = async (clubId) => {
  const filter = {};
  if (clubId) {
    filter.club = clubId;
  }
  const meetings = await ClubMeetings.find(filter)
    .populate("club", "clubName")
    .populate("department", "departmentName")
    .populate("participants.user", "fullName email")
    .sort({ createdAt: -1 });

  // Lazy update: auto start/end meetings
  const now = new Date();
  for (let m of meetings) {
    let newStatus = null;
    
    if (m.status === 'UPCOMING' && m.startedTime && m.startedTime <= now) {
      newStatus = 'ONGOING';
    }
    
    if ((m.status === 'UPCOMING' || m.status === 'ONGOING' || newStatus === 'ONGOING') && m.endTime && m.endTime <= now) {
      newStatus = 'COMPLETED';
    }
    
    if (newStatus) {
      m.status = newStatus;
      await ClubMeetings.findByIdAndUpdate(m._id, { status: newStatus });
    }
  }

  return meetings;
};

const getById = async (id) => {
  return await ClubMeetings.findById(id)
    .populate("club", "clubName")
    .populate("department", "departmentName")
    .populate("participants.user", "fullName email");
};

const updateById = async (id, data) => {
  return await ClubMeetings.findByIdAndUpdate(id, data, { new: true });
};

const deleteById = async (id) => {
  return await ClubMeetings.findByIdAndDelete(id);
};

module.exports = { createOne, getAll, getById, updateById, deleteById };
