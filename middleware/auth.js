const { verifyTokenString } = require("../utils/jwt");
const Users = require("../models/User");
const UserClubs = require("../models/UserClub");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Missing authentication token" });
    }

    const decoded = verifyTokenString(token);
    const user = await Users.findById(decoded.sub);
    if (!user || !user.status) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    req.user = {
      id: user._id.toString(),
      permission: user.permission,
      email: user.email,
      fullName: user.fullName,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireClubRole = (roles) => {
  return async (req, res, next) => {
    try {
      const club = req.params.clubId || req.body.club || req.query.club;
      if (!club) {
        return res.status(400).json({ error: "club is required" });
      }
      const membership = await UserClubs.findOne({
        user: req.user.id,
        club,
        role: { $in: roles },
        isActive: true,
      });
      if (!membership) {
        return res.status(403).json({ error: "You do not have permission for this club" });
      }
      req.membership = membership;
      next();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
};

const requireClubMembership = async (req, res, next) => {
  try {
    const club = req.params.clubId || req.body.club || req.query.club;
    if (!club) {
      return res.status(400).json({ error: "club is required" });
    }
    const membership = await UserClubs.findOne({
      user: req.user.id,
      club,
      isActive: true,
    });
    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this club" });
    }
    req.membership = membership;
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { authenticate, requireClubRole, requireClubMembership };
