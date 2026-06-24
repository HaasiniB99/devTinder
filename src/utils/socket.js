const socket = require("socket.io");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Chat, getChatParticipantKey } = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
const { handleMessageForSummary } = require("./summarizer"); // ← ADD THIS

const parseAllowedOrigins = () => {
  const configuredOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL;
  if (!configuredOrigins) return ["http://localhost:5173"];

  return configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, part) => {
    const [key, ...valueParts] = part.trim().split("=");
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(valueParts.join("="));
    return cookies;
  }, {});

const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("$"))
    .digest("hex");
};

const findAcceptedConnection = async (userId, targetUserId) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) return null;

  return ConnectionRequest.findOne({
    status: "accepted",
    $or: [
      { fromUserId: userId, toUserId: targetUserId },
      { fromUserId: targetUserId, toUserId: userId },
    ],
  }).select("_id");
};

const findOrCreateChat = async (userId, targetUserId) => {
  const participantKey = getChatParticipantKey(userId, targetUserId);
  let chat = await Chat.findOne({
    $or: [
      { participantKey },
      { participants: { $all: [userId, targetUserId] } },
    ],
  });

  if (!chat) {
    chat = new Chat({
      participants: [userId, targetUserId],
      participantKey,
      messages: [],
    });
  } else if (!chat.participantKey) {
    chat.participantKey = participantKey;
  }

  return chat;
};

const initializeSocket = (server) => {
  const allowedOrigins = parseAllowedOrigins();
  const io = socket(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.token;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded._id).select("_id firstName");
      if (!user) return next(new Error("Unauthorized"));

      socket.user = user;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("joinChat", async ({ targetUserId }) => {
      const userId = socket.user._id.toString();
      const connection = await findAcceptedConnection(userId, targetUserId);
      if (!connection) {
        return socket.emit("chatError", {
          message: "You can only chat with accepted connections",
        });
      }

      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);
    });

    socket.on("typing", ({ targetUserId }) => {
      const userId = socket.user._id.toString();
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("typing");
    });

    socket.on("stopTyping", ({ targetUserId }) => {
      const userId = socket.user._id.toString();
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("stopTyping");
    });

    socket.on("sendMessage", async ({
      targetUserId,
      text,
      type,
      fileName,
      fileSize,
      mimeType,
      latitude,
      longitude,
      locationLabel,
    }) => {
      try {
        const userId = socket.user._id.toString();
        // Basic validation guard
        if (!targetUserId || typeof text !== "string" || !text.trim()) {
          return;
        }
        if (text.length > 2000) {
          return socket.emit("messageFailed", {
            message: "Message is too long",
          });
        }
        const allowedTypes = ["text", "image", "file", "location"];
        const messageType = allowedTypes.includes(type) ? type : "text";

        const roomId = getSecretRoomId(userId, targetUserId);
        const connection = await findAcceptedConnection(userId, targetUserId);

        if (!connection) {
          return socket.emit("messageFailed", {
            message: "You can only message accepted connections",
          });
        }

        const chat = await findOrCreateChat(userId, targetUserId);

        const message = {
          senderId: userId,
          text: text.trim(),
          type: messageType,
          fileName: fileName || "",
          fileSize: Number(fileSize) || 0,
          mimeType: mimeType || "",
          latitude,
          longitude,
          locationLabel: locationLabel || "",
          status: "sent",
          createdAt: new Date(),
        };

        chat.messages.push(message);
        await chat.save();

        void User.findByIdAndUpdate(userId, { lastActiveAt: new Date() }).catch(
          () => null
        );

        const savedMessage = chat.messages[chat.messages.length - 1];

        io.to(roomId).emit("messageReceived", savedMessage);

        savedMessage.status = "delivered";
        await chat.save();
        io.to(roomId).emit("messageStatusUpdate", {
          messageId: savedMessage._id,
          status: "delivered",
        });

        // Feed message into summarizer (use provided firstName or fallback to userId)
        const summaryText =
          messageType === "image"
            ? "[Photo]"
            : messageType === "file"
              ? `[File: ${fileName || "attachment"}]`
              : messageType === "location"
                ? "[Location shared]"
                : text;
        handleMessageForSummary(io, roomId, {
          senderName: socket.user.firstName || userId,
          text: summaryText,
        });

      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("messageFailed", {
          message: "Message could not be sent",
        });
      }
    });

    socket.on("markAsSeen", async ({ targetUserId }) => {
      try {
        const userId = socket.user._id.toString();
        const roomId = getSecretRoomId(userId, targetUserId);
        const connection = await findAcceptedConnection(userId, targetUserId);
        if (!connection) return;

        const participantKey = getChatParticipantKey(userId, targetUserId);
        const chat = await Chat.findOne({
          $or: [
            { participantKey },
            { participants: { $all: [userId, targetUserId] } },
          ],
        });

        if (!chat) return;

        let updated = false;

        chat.messages.forEach((msg) => {
          if (
            msg.senderId.toString() === targetUserId &&
            msg.status !== "seen"
          ) {
            msg.status = "seen";
            updated = true;
          }
        });

        if (updated) await chat.save();

        io.to(roomId).emit("messagesSeen");

      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", () => {});
  });
};

module.exports = initializeSocket;
