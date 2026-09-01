const mongoose = require("mongoose");
const { DOCUMENT_TYPE } = require("../constrant/schema");

const documentSchema = new mongoose.Schema(
  {
    documentName: { type: String, required: true },
    description: { type: String },
    documentUrl: { type: String, required: true },
    documentType: { type: String, enum: DOCUMENT_TYPE, required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Clubs" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Departments" },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Events" },
  },
  { timestamps: true },
);

const Documents = mongoose.model("Documents", documentSchema);
module.exports = Documents;
