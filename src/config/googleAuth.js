const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:7777/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Check if user already exists
        let user = await User.findOne({ emailId: profile.emails[0].value });

        // 2. If not → create user
        if (!user) {
          user = new User({
            firstName: profile.name.givenName || "User",
            lastName: profile.name.familyName || "",
            emailId: profile.emails[0].value,
            photoUrl: profile.photos[0].value,
            isGoogleUser: true,
            password: "google_login", // dummy
          });

          await user.save();
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