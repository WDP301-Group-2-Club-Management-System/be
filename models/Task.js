const mongoose = require("mongoose");
const {
  TASK_STATUS,
  TASK_RATING,
  TASK_ASSIGNEE_TYPE,
} = require("../constrant/schema");

const taskSchema = new mongoose.Schema(
  {
    parentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tasks",
      default: null,
    },
    term: { type: mongoose.Schema.Types.ObjectId, ref: "EventTerms" },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Events" },
    assigneeType: { type: String, enum: TASK_ASSIGNEE_TYPE, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", default: null },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Departments",
      default: null,
    },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Clubs" },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Documents",
      default: null,
    },
    title: { type: String, required: true },
    description: { type: String },
    content: { type: String },
    submitComment: { type: String, default: null },
    status: { type: String, enum: TASK_STATUS, default: "ToDo" },
    rating: { type: String, enum: TASK_RATING, default: null },
    reviewComment: { type: String, default: null },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true },
);

const Tasks = mongoose.model("Tasks", taskSchema);
module.exports = Tasks;
