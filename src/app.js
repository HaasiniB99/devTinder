require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const session = require("express-session");
const { userAuth } = require("./middlewares/auth");
const uploadRoute = require("./routes/upload");
const aiRoutes = require("./routes/aiRoutes");
const securityHeaders = require("./middlewares/securityHeaders");
const rateLimit = require("./middlewares/rateLimit");

require("./utils/cronjob");

const parseAllowedOrigins = () => {
  const configuredOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL;
  if (!configuredOrigins) return ["http://localhost:5173"];

  return configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    keyPrefix: "app",
  })
);
app.use(express.json());
app.use(cookieParser());


const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const initializeSocket = require("./utils/socket");
const chatRouter = require("./routes/chat");
const rightNowRouter = require("./routes/rightNow");
const fieldMatchRouter = require("./routes/fieldMatch");
const passport = require("passport");
require("./config/googleAuth");


app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// Passport init
app.use(passport.initialize());
app.use(passport.session());



app.use("/", authRouter);
app.use("/profile", profileRouter); //app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", chatRouter);
app.use("/", rightNowRouter);
app.use("/", fieldMatchRouter);
app.use("/upload", uploadRoute);
app.use("/ai",aiRoutes);


const server = http.createServer(app);
initializeSocket(server);

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 7777;
    server.listen(PORT, () => {
      if (process.env.NODE_ENV !== "production") {
        console.info(`Server is successfully listening on port ${PORT}`);
      }
    });
  })
  .catch((err) => {
    console.error("Database cannot be connected!!",err);
  });
