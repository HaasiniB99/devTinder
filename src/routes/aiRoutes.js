const express = require("express");
const { getDrafts } = require("../controllers/aiController");
const { userAuth } = require("../middlewares/auth");
const rateLimit = require("../middlewares/rateLimit");

const router = express.Router();

router.post(
  "/generate-drafts",
  userAuth,
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    keyPrefix: "ai-drafts",
    message: "AI usage limit reached. Please try again later.",
  }),
  getDrafts
);

module.exports = router;
