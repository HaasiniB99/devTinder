const mongoose = require("mongoose");

const rightNowMatchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  query: {
    type: String,
    required: true,
    trim: true,
  },
  matches: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      matchReason: {
        type: String,
        required: true,
      },
      relevanceScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
    },
  ],
  servedFromCache: {
    type: Boolean,
    default: false,
  },
  queriedAt: {
    type: Date,
    default: Date.now,
  },
});

rightNowMatchSchema.index({ userId: 1, queriedAt: -1 });

module.exports = mongoose.model("RightNowMatch", rightNowMatchSchema);
