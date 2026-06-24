const { generateDrafts } = require("../services/aiServices");

const getDrafts = async (req, res) => {
  try {
    const { myProfile, targetProfile, chatHistory, tone } = req.body;

    const result = await generateDrafts({
      myProfile,
      targetProfile,
      chatHistory,
      tone,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "AI failed",
    });
  }
};

module.exports = { getDrafts };