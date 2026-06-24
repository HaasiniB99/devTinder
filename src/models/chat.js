const mongoose = require("mongoose");

const getChatParticipantKey = (userId, targetUserId) =>
  [userId.toString(), targetUserId.toString()].sort().join(":");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "location"],
      default: "text",
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "",
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    locationLabel: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
);

const chatSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ],
  participantKey: {
    type: String,
    trim: true,
  },
  messages: [messageSchema],
});

chatSchema.index({ participantKey: 1 }, { unique: true, sparse: true });

chatSchema.pre("validate", function (next) {
  if (this.participants?.length === 2) {
    this.participantKey = getChatParticipantKey(
      this.participants[0],
      this.participants[1]
    );
  }
  next();
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = { Chat, getChatParticipantKey };
