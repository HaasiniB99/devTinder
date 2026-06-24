const getInitialsAvatarUrl = (firstName = "User", lastName = "") => {
  const name = `${firstName} ${lastName}`.trim() || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=111827&color=ffffff&bold=true&size=256`;
};

const normalizeSkills = (skills) => {
  if (Array.isArray(skills)) {
    return skills
      .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
      .filter(Boolean)
      .slice(0, 20);
  }

  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  return [];
};

const getSafeUserData = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  photoUrl: user.photoUrl,
  age: user.age,
  gender: user.gender,
  about: user.about,
  skills: user.skills || [],
  currentlyWorkingOn: user.currentlyWorkingOn,
  recentSkillsUsed: user.recentSkillsUsed || [],
  availableFor: user.availableFor || [],
  primaryField: user.primaryField,
  relatedFields: user.relatedFields || [],
  fieldLastAnalyzed: user.fieldLastAnalyzed,
  isPremium: user.isPremium,
  membershipType: user.membershipType,
});

module.exports = {
  getInitialsAvatarUrl,
  getSafeUserData,
  normalizeSkills,
};
