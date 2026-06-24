const express = require("express");
const profileRouter = express.Router();

const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData } = require("../utils/validation");
const {
  getInitialsAvatarUrl,
  getSafeUserData,
  normalizeSkills,
} = require("../utils/userProfile");

profileRouter.get("/view", userAuth, async (req, res) => {
  try {
    const user = req.user;

    res.send(getSafeUserData(user));
  } catch (err) {
    res.status(401).send("ERROR : " + err.message);
  }
});

profileRouter.patch("/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid Edit Request");
    }

    const loggedInUser = req.user;

    Object.keys(req.body).forEach((key) => {
      if (key === "skills") {
        loggedInUser.skills = normalizeSkills(req.body.skills);
      } else if (key === "photoUrl") {
        loggedInUser.photoUrl =
          req.body.photoUrl ||
          getInitialsAvatarUrl(loggedInUser.firstName, loggedInUser.lastName);
      } else {
        loggedInUser[key] = req.body[key];
      }
    });

    if (!loggedInUser.photoUrl) {
      loggedInUser.photoUrl = getInitialsAvatarUrl(
        loggedInUser.firstName,
        loggedInUser.lastName
      );
    }

    await loggedInUser.save();

    res.json({
      message: `${loggedInUser.firstName}, your profile updated successfuly`,
      data: getSafeUserData(loggedInUser),
    });
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

module.exports = profileRouter;
