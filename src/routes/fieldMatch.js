const express = require("express");
const fieldMatchRouter = express.Router();

const { userAuth } = require("../middlewares/auth");
const {
  detectUserField,
  findFieldMatches,
} = require("../services/fieldDetectionService");

fieldMatchRouter.get("/field/matches", userAuth, async (req, res) => {
  try {
    const result = await findFieldMatches(req.user);

    if (result.incompleteProfile) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Could not find field matches right now" });
  }
});

fieldMatchRouter.get("/field/myfield", userAuth, async (req, res) => {
  try {
    const detectedFields = await detectUserField(req.user);

    if (!detectedFields) {
      return res.status(400).json({
        message: "Add more skills and a bio to your profile so we can detect your field",
      });
    }

    res.json(detectedFields);
  } catch (err) {
    res.status(500).json({ message: "Could not detect your field right now" });
  }
});

fieldMatchRouter.post("/field/reanalyze", userAuth, async (req, res) => {
  try {
    const detectedFields = await detectUserField(req.user, true);

    if (!detectedFields) {
      return res.status(400).json({
        message: "Add more skills and a bio to your profile so we can detect your field",
      });
    }

    res.json(detectedFields);
  } catch (err) {
    res.status(500).json({ message: "Could not reanalyze your field right now" });
  }
});

module.exports = fieldMatchRouter;
