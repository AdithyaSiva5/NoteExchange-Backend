const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

module.exports = function (passport) {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id).select("-password");
        if (!user || user.blocked) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    })
  );

  // Update the Google Strategy to save profile pictures
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/user/auth/google/callback`,
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          if (!profile.emails || !profile.emails[0].value) {
            return done(new Error("No email found from Google"), false);
          }

          const email = profile.emails[0].value;
          // Extract profile picture from Google profile
          let profilePicture = "";
          if (profile.photos && profile.photos.length > 0) {
            profilePicture = profile.photos[0].value;
          }

          // Check if user exists
          let user = await User.findOne({ email: email });

          if (user) {
            // Update Google ID and profile picture if not present
            if (!user.googleId || !user.profilePicture) {
              user.googleId = profile.id;
              if (profilePicture && !user.profilePicture) {
                user.profilePicture = profilePicture;
              }
              await user.save();
            }
          } else {
            // Create new user
            user = new User({
              email: email,
              name: profile.displayName,
              googleId: profile.id,
              password: require("crypto").randomBytes(32).toString("hex"),
              emailVerified: true, // Google emails are verified
              profilePicture: profilePicture,
            });
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          console.error("Google Strategy Error:", error);
          return done(error, false);
        }
      }
    )
  );

  // Add serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
