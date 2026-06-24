const express = require("express");
const passport = require("passport");

const authRouter = express.Router();

const { validateSignUpData } = require("../utils/validation");
const {
  getInitialsAvatarUrl,
  getSafeUserData,
  normalizeSkills,
} = require("../utils/userProfile");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const rateLimit = require("../middlewares/rateLimit");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_MAX_AGE_MS = Number(process.env.COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};
const AUTH_RATE_LIMIT = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: "auth",
  message: "Too many authentication attempts. Please try again later.",
});

authRouter.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);
authRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    const user = req.user;

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie("token", token, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.redirect(CLIENT_URL);
  }
);

authRouter.post("/signup", AUTH_RATE_LIMIT, async (req, res) => {
  try {
    // Validation of data
    validateSignUpData(req);

    const { firstName,
      lastName,
      emailId,
      password,
      age,
      gender,
      skills,
      about,
      currentlyWorkingOn,
      availableFor, } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedSkills = normalizeSkills(skills);
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = (lastName || "").trim();

    const user = new User({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      emailId,
      password: passwordHash,
      age: age || undefined,
      gender: gender || undefined,
      photoUrl: getInitialsAvatarUrl(normalizedFirstName, normalizedLastName),
      skills: normalizedSkills,
      about: about?.trim() || "I am excited to connect with developers on DevConnect.",
      currentlyWorkingOn: currentlyWorkingOn?.trim() || "",
      availableFor: Array.isArray(availableFor) ? availableFor : [],
    });

    const savedUser = await user.save();
    const token = await savedUser.getJWT();

    res.cookie("token", token, {
      ...COOKIE_OPTIONS,
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.json({
      message: "User Added successfully!",
      data: getSafeUserData(savedUser),
    });
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

authRouter.post("/login", AUTH_RATE_LIMIT, async (req, res) => {
  try {
    const { emailId, password } = req.body;

    const user = await User.findOne({ emailId: emailId });

    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      const token = await user.getJWT();
      user.lastActiveAt = new Date();
      await user.save();

      res.cookie("token", token, {
        ...COOKIE_OPTIONS,
        maxAge: COOKIE_MAX_AGE_MS,
      });
      res.send(getSafeUserData(user));
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

authRouter.post("/logout", async (req, res) => {
  res.cookie("token", null, {
    ...COOKIE_OPTIONS,
    expires: new Date(0),
  });
  res.send("Logout Successful!!");
});

module.exports = authRouter;
