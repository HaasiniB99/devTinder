const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const getInitialsAvatarUrl = (firstName = "User", lastName = "") => {
  const name = `${firstName} ${lastName}`.trim() || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=111827&color=ffffff&bold=true&size=256`;
};

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 2,
      maxLength: 50,
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    emailId: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address: " + value);
        }
      },
    },
    isGoogleUser: {
  type: Boolean,
  default: false
},
    password: {
  type: String,
  required: function () {
    return !this.isGoogleUser; // password required only for normal users
  },
  validate(value) {
    if (this.isGoogleUser) return true; // skip validation for Google users

    if (!validator.isStrongPassword(value)) {
      throw new Error("Enter a Strong Password: " + value);
    }
  },
},
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: `{VALUE} is not a valid gender type`,
      },
      // validate(value) {
      //   if (!["male", "female", "others"].includes(value)) {
      //     throw new Error("Gender data is not valid");
      //   }
      // },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
    },
    photoUrl: {
      type: String,
      default: "",
      validate(value) {
        if (value && !validator.isURL(value)) {
          throw new Error("Invalid Photo URL: " + value);
        }
      },
    },
    about: {
      type: String,
      default: "This is a default about of the user!",
    },
    skills: {
      type: [String],
      default: [],
    },
    currentlyWorkingOn: {
      type: String,
      default: "",
      trim: true,
      maxLength: 200,
    },
    recentSkillsUsed: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 5;
        },
        message: "recentSkillsUsed cannot contain more than 5 items",
      },
      set(value) {
        return Array.isArray(value) ? value.slice(-5) : value;
      },
    },
    availableFor: {
      type: [
        {
          type: String,
          enum: [
            "pair programming",
            "code review",
            "system design discussion",
            "project collaboration",
            "mentoring",
            "being mentored",
            "hackathon",
            "just talking tech",
          ],
        },
      ],
      default: [],
    },
    primaryField: {
      type: String,
      default: "",
      trim: true,
    },
    relatedFields: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 4;
        },
        message: "relatedFields cannot contain more than 4 items",
      },
      set(value) {
        return Array.isArray(value) ? value.slice(0, 4) : value;
      },
    },
    fieldLastAnalyzed: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("validate", function (next) {
  if (!this.photoUrl) {
    this.photoUrl = getInitialsAvatarUrl(this.firstName, this.lastName);
  }
  next();
});

userSchema.methods.getJWT = async function () {
  const user = this;

  const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return token;
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  const isPasswordValid = await bcrypt.compare(
    passwordInputByUser,
    passwordHash
  );

  return isPasswordValid;
};

module.exports = mongoose.model("User", userSchema);
