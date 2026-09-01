const express = require("express");
require("dotenv").config();
const morgan = require("morgan");
const db = require("./config/database");

// Import all routes
const ActivityRouter = require("./routes/ActivityRoutes");
const ActiveMemberRouter = require("./routes/ActiveMemberRoutes");
const AgendaRouter = require("./routes/AgendaRoutes");
const ClubRouter = require("./routes/ClubRoutes");
const ClubApprovalHistoryRouter = require("./routes/ClubApprovalHistoryRoutes");
const ClubMeetingRouter = require("./routes/ClubMeetingRoutes");
const DepartmentRouter = require("./routes/DepartmentRoutes");
const DocumentRouter = require("./routes/DocumentRoutes");
const EventRouter = require("./routes/EventRoutes");
const EventScheduleRouter = require("./routes/EventScheduleRoutes");
const EventTermRouter = require("./routes/EventTermRoutes");
const ExpenseRouter = require("./routes/ExpenseRoutes");
const IncomeRouter = require("./routes/IncomeRoutes");
const LocationRouter = require("./routes/LocationRoutes");
const NotificationRouter = require("./routes/NotificationRoutes");
const PaymentRouter = require("./routes/PaymentRoutes");
const NotificationTemplateRouter = require("./routes/NotificationTemplateRoutes");
const PeriodicClubReportRouter = require("./routes/PeriodicClubReportRoutes");
const RecruitmentCampaignRouter = require("./routes/RecruitmentCampaignRoutes");
const RecruitmentApplicationRouter = require("./routes/RecruitmentApplication");
const SemesterRouter = require("./routes/SemesterRoutes");
const TaskRouter = require("./routes/TaskRoutes");
const TaskFeedbackRouter = require("./routes/TaskFeedbackRoutes");
const TransactionRouter = require("./routes/TransactionRoutes");
const UserRouter = require("./routes/UserRoutes");
const UserClubRouter = require("./routes/UserClubRoutes");
const DefenseSlotRouter = require("./routes/DefenseSlotRoutes");

const cors = require('cors');
const loggerMiddleware = require('./middleware/loggerMiddleware');

const app = express();
app.use(cors());
app.use(loggerMiddleware);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Register all routes
app.use("/api/activity", ActivityRouter);
app.use("/api/active-members", ActiveMemberRouter);
app.use("/api/agendas", AgendaRouter);
app.use("/api/clubs", ClubRouter);
app.use("/api/club-approval-histories", ClubApprovalHistoryRouter);
app.use("/api/club-meetings", ClubMeetingRouter);
app.use("/api/departments", DepartmentRouter);
app.use("/api/documents", DocumentRouter);
app.use("/api/events", EventRouter);
app.use("/api/event-schedules", EventScheduleRouter);
app.use("/api/event-terms", EventTermRouter);
app.use("/api/expenses", ExpenseRouter);
app.use("/api/incomes", IncomeRouter);
app.use("/api/locations", LocationRouter);
app.use("/api/notifications", NotificationRouter);
app.use("/api/payments", PaymentRouter);
app.use("/api/notification-templates", NotificationTemplateRouter);
app.use("/api/periodic-club-reports", PeriodicClubReportRouter);
app.use("/api/recruitment-campaigns", RecruitmentCampaignRouter);
app.use("/api/recruitment-applications", RecruitmentApplicationRouter);
app.use("/api/semesters", SemesterRouter);
app.use("/api/tasks", TaskRouter);
app.use("/api/task-feedbacks", TaskFeedbackRouter);
app.use("/api/transactions", TransactionRouter);
app.use("/api/users", UserRouter);
app.use("/api/user-clubs", UserClubRouter);
app.use("/api/defense-slots", DefenseSlotRouter);

app.get("/", async (req, res, next) => {
  try {
    res.status(200).json({ message: "Welcome to Club Management API Server" });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("ERROR HANDLER:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message, stack: err.stack });
});

app.listen(process.env.PORT, () => {
  console.log(
    `Server running at: http://${process.env.BASE_URL}:${process.env.PORT}`,
  );
  db.connect();

  // Start background jobs
  const startCampaignJob = require("./jobs/campaignJob");
  startCampaignJob();
});
