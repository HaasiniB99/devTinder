const express = require("express");
const { userAuth } = require("../middlewares/auth");
const { Chat } = require("../models/chat");

const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  const { targetUserId } = req.params;
  const userId = req.user._id;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    });

    // 🔥 create chat if not exists
    if (!chat) {
      chat = new Chat({
        participants: [userId, targetUserId],
        messages: [],
      });
      await chat.save();
    }

    // 🔥 IMPORTANT: sort messages by time
    const sortedMessages = chat.messages.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    // 🔥 send clean data (NO populate)
    res.json({ messages: sortedMessages });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching chat");
  }
});

module.exports = chatRouter;