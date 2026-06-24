const express = require("express");
const rightNowRouter = express.Router();

const { userAuth } = require("../middlewares/auth");
const RightNowMatch = require("../models/rightNowMatch");
const { findRightNowMatches } = require("../services/rightNowService");

const AVAILABLE_FOR_OPTIONS = [
  "pair programming",
  "code review",
  "system design discussion",
  "project collaboration",
  "mentoring",
  "being mentored",
  "hackathon",
  "just talking tech",
];

const SAFE_STATUS_FIELDS =
  "firstName lastName photoUrl about skills currentlyWorkingOn recentSkillsUsed availableFor age gender";

const stripHtml = (value) => value.replace(/<[^>]*>/g, "").trim();

rightNowRouter.post("/rightnow/search", userAuth, async (req, res) => {
  try {
    const { query } = req.body;

    if (typeof query !== "string") {
      return res.status(400).json({ message: "Query must be a string" });
    }

    const sanitizedQuery = stripHtml(query);
    if (sanitizedQuery.length < 2) {
      return res
        .status(400)
        .json({ message: "Query must be at least 2 characters long" });
    }
    if (sanitizedQuery.length > 300) {
      return res
        .status(400)
        .json({ message: "Query must be no longer than 300 characters" });
    }

    const result = await findRightNowMatches(req.user, sanitizedQuery);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Search failed, please try again" });
  }
});

rightNowRouter.patch("/rightnow/status", userAuth, async (req, res) => {
  try {
    const { currentlyWorkingOn, availableFor, recentSkillsUsed } = req.body;

    if (
      currentlyWorkingOn !== undefined &&
      (typeof currentlyWorkingOn !== "string" || currentlyWorkingOn.length > 200)
    ) {
      return res
        .status(400)
        .json({ message: "currentlyWorkingOn must be a string up to 200 characters" });
    }
    if (
      availableFor !== undefined &&
      (!Array.isArray(availableFor) ||
        availableFor.some((option) => !AVAILABLE_FOR_OPTIONS.includes(option)))
    ) {
      return res.status(400).json({ message: "availableFor contains an invalid option" });
    }
    if (
      recentSkillsUsed !== undefined &&
      (!Array.isArray(recentSkillsUsed) || recentSkillsUsed.length > 5)
    ) {
      return res
        .status(400)
        .json({ message: "recentSkillsUsed must contain at most 5 items" });
    }

    const user = req.user;
    if (currentlyWorkingOn !== undefined) user.currentlyWorkingOn = currentlyWorkingOn;
    if (availableFor !== undefined) user.availableFor = availableFor;
    if (recentSkillsUsed !== undefined) user.recentSkillsUsed = recentSkillsUsed;
    await user.save();

    const safeUser = user.toObject();
    const data = SAFE_STATUS_FIELDS.split(" ").reduce((result, field) => {
      result[field] = safeUser[field];
      return result;
    }, { _id: safeUser._id });

    res.json({ message: "Status updated successfully", data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

rightNowRouter.get("/rightnow/history", userAuth, async (req, res) => {
  try {
    const history = await RightNowMatch.find({ userId: req.user._id })
      .sort({ queriedAt: -1 })
      .limit(10)
      .select("query queriedAt");

    res.json({ data: history });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = rightNowRouter;
