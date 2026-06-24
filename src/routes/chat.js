const express = require("express");
const { userAuth } = require("../middlewares/auth");
const mongoose = require("mongoose");
const { Chat, getChatParticipantKey } = require("../models/chat");
const ConnectionRequest = require("../models/connectionRequest");

const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  const { targetUserId } = req.params;
  const userId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid chat user" });
    }

    const connection = await ConnectionRequest.findOne({
      status: "accepted",
      $or: [
        { fromUserId: userId, toUserId: targetUserId },
        { fromUserId: targetUserId, toUserId: userId },
      ],
    }).select("_id");

    if (!connection) {
      return res.status(403).json({ message: "You can only chat with accepted connections" });
    }

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
      await chat.save();
    } else if (!chat.participantKey) {
      chat.participantKey = participantKey;
      await chat.save();
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const sortedMessages = chat.messages.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    ).slice(-limit);

    res.json({ messages: sortedMessages });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching chat" });
  }
});

module.exports = chatRouter;
