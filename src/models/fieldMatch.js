const mongoose = require("mongoose");

const fieldMatchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  matches: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      detectedField: {
        type: String,
        required: true,
        trim: true,
      },
      relevanceScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      matchReason: {
        type: String,
        required: true,
        trim: true,
      },
    },
  ],
  computedAt: {
    type: Date,
    default: Date.now,
  },
  isCached: {
    type: Boolean,
    default: false,
  },
});

fieldMatchSchema.index({ userId: 1, computedAt: -1 });

module.exports = mongoose.model("FieldMatch", fieldMatchSchema);
