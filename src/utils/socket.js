const socket = require("socket.io");
const crypto = require("crypto");
const { Chat } = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");

const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("$"))
    .digest("hex");
};

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    credentials: true, // ✅ REQUIRED
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected",socket.id);

    // ✅ JOIN ROOM
    socket.on("joinChat", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);

      console.log(`User ${userId} joined room ${roomId}`);
    });

    // ✅ TYPING
    socket.on("typing", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("typing");
    });

    socket.on("stopTyping", ({ userId, targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.to(roomId).emit("stopTyping");
    });

    // ✅ SEND MESSAGE (FIXED)
    socket.on("sendMessage", async ({ userId, targetUserId, text, type }) => {
  console.log("🔥 sendMessage triggered:", { userId, targetUserId, text, type });

  try {
    const roomId = getSecretRoomId(userId, targetUserId);

    // ✅ check connection
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
        { fromUserId: targetUserId, toUserId: userId, status: "accepted" },
      ],
    });

    if (!connection) return;

    // ✅ find or create chat
    let chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, targetUserId],
        messages: [],
      });
    }

    // 🔥 UPDATED MESSAGE OBJECT
    const message = {
      senderId: userId,
      text,
      type: type || "text", // ✅ NEW
      status: "sent",
      createdAt: new Date(),
    };

    chat.messages.push(message);

    await chat.save();

    const savedMessage = chat.messages[chat.messages.length - 1];

    // ✅ EMIT MESSAGE
    io.to(roomId).emit("messageReceived", savedMessage);

    // ✅ UPDATE STATUS → delivered
    savedMessage.status = "delivered";

    io.to(roomId).emit("messageStatusUpdate", {
      messageId: savedMessage._id,
      status: "delivered",
    });

  } catch (err) {
    console.log(err);
  }
});

    // ✅ MARK AS SEEN
    socket.on("markAsSeen", async ({ userId, targetUserId }) => {
      try {
        const roomId = getSecretRoomId(userId, targetUserId);

        const chat = await Chat.findOne({
          participants: { $all: [userId, targetUserId] },
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

        if (updated) {
          await chat.save();
        }

        io.to(roomId).emit("messagesSeen");

      } catch (err) {
        console.log(err);
      }
    });

    // ✅ DISCONNECT
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

module.exports = initializeSocket;