const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");
const { getInitialsAvatarUrl } = require("../utils/userProfile");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:7777";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || `${SERVER_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const firstName = profile.name.givenName || "User";
        const lastName = profile.name.familyName || "";
        const googlePhotoUrl = profile.photos?.[0]?.value;
        const fallbackPhotoUrl = getInitialsAvatarUrl(firstName, lastName);

        // 1. Check if user already exists
        let user = await User.findOne({ emailId: profile.emails[0].value });

        // 2. If not → create user
        if (!user) {
          user = new User({
            firstName,
            lastName,
            emailId: profile.emails[0].value,
            photoUrl: googlePhotoUrl || fallbackPhotoUrl,
            isGoogleUser: true,
          });

          await user.save();
        } else if (user.isGoogleUser) {
          const nextPhotoUrl = googlePhotoUrl || fallbackPhotoUrl;
          if (user.photoUrl !== nextPhotoUrl) {
            user.photoUrl = nextPhotoUrl;
            await user.save();
          }
        }

        // 3. Return Mongo user
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
