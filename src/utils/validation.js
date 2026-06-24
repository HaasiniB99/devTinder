const validator = require("validator");

const validateSignUpData = (req) => {
  const { firstName, emailId, password, age, gender, skills, about, photoUrl } = req.body;
  const skillList = Array.isArray(skills)
    ? skills.filter((skill) => typeof skill === "string" && skill.trim())
    : typeof skills === "string"
      ? skills.split(",").filter((skill) => skill.trim())
      : [];

  if (!firstName || firstName.trim().length < 2) {
    throw new Error("Name is not valid!");
  } else if (!validator.isEmail(emailId)) {
    throw new Error("Email is not valid!");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error("Please enter a strong Password!");
  } else if (!age || Number(age) < 18 || Number(age) > 100) {
    throw new Error("Age must be between 18 and 100");
  } else if (gender && !["male", "female", "other"].includes(gender)) {
    throw new Error("Gender is not valid");
  } else if (photoUrl && !validator.isURL(photoUrl)) {
    throw new Error("Photo URL is not valid");
  } else if (skills !== undefined && !Array.isArray(skills) && typeof skills !== "string") {
    throw new Error("Skills must be a list");
  } else if (skillList.length === 0) {
    throw new Error("Please add at least one skill");
  } else if (typeof about !== "string" || about.trim().length < 10) {
    throw new Error("Please add a short bio");
  }
};

const validateEditProfileData = (req) => {
  const allowedEditFields = [
    "firstName",
    "lastName",
    "photoUrl",
    "age",
    "gender",
    "skills",
    "about",
    "currentlyWorkingOn",
    "availableFor",
  ];

  const isEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field)
  );

  if (!isEditAllowed) return false;

  const availableForOptions = [
    "pair programming",
    "code review",
    "system design discussion",
    "project collaboration",
    "mentoring",
    "being mentored",
    "hackathon",
    "just talking tech",
  ];

  const { firstName, lastName, photoUrl, age, gender, skills, about, currentlyWorkingOn, availableFor } = req.body;

  if (
    firstName !== undefined &&
    (typeof firstName !== "string" ||
      firstName.trim().length < 2 ||
      firstName.trim().length > 50)
  ) {
    return false;
  }
  if (
    lastName !== undefined &&
    (typeof lastName !== "string" || lastName.trim().length > 50)
  ) {
    return false;
  }
  if (photoUrl !== undefined && photoUrl && !validator.isURL(photoUrl)) {
    return false;
  }
  if (age !== undefined && (Number(age) < 18 || Number(age) > 100)) {
    return false;
  }
  if (gender !== undefined && gender && !["male", "female", "other"].includes(gender)) {
    return false;
  }
  if (skills !== undefined && !Array.isArray(skills) && typeof skills !== "string") {
    return false;
  }
  if (Array.isArray(skills) && skills.length > 20) {
    return false;
  }
  if (about !== undefined && (typeof about !== "string" || about.trim().length < 10)) {
    return false;
  }
  if (
    currentlyWorkingOn !== undefined &&
    (typeof currentlyWorkingOn !== "string" || currentlyWorkingOn.length > 200)
  ) {
    return false;
  }
  if (
    availableFor !== undefined &&
    (!Array.isArray(availableFor) ||
      availableFor.some((option) => !availableForOptions.includes(option)))
  ) {
    return false;
  }

  return true;
};

module.exports = {
  validateSignUpData,
  validateEditProfileData,
};
