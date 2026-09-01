const mongoose = require("mongoose");
const { TASK_STATUS } = require("../constrant/schema");

const taskFeedbackSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tasks",
      required: true,
    },
    title: { type: String, default: "" },
    comment: { type: String, default: "" },
    status: { type: String, enum: TASK_STATUS, default: "ToDo" },
  },
  { timestamps: true },
);

const TaskFeedbacks = mongoose.model("TaskFeedbacks", taskFeedbackSchema);
module.exports = TaskFeedbacks;
