const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../models/schemas");
require("dotenv").config();

module.exports = (passport) => {
  // JWT Strategy
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  };

  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id);

        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        console.error(error);
        return done(error, false);
      }
    })
  );

  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
        proxy: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          console.log("Google profile:", profile);

          // Kiểm tra xem người dùng đã tồn tại
          let user = await User.findOne({ google_id: profile.id });

          if (user) {
            return done(null, user);
          }

          // Đảm bảo profile.emails tồn tại
          if (!profile.emails || profile.emails.length === 0) {
            return done(
              new Error("Không thể lấy email từ tài khoản Google"),
              null
            );
          }

          // Kiểm tra email đã tồn tại chưa
          const existingUser = await User.findOne({
            email: profile.emails[0].value,
          });

          if (existingUser) {
            // Cập nhật thông tin Google cho người dùng hiện có
            existingUser.google_id = profile.id;

            // Kiểm tra trước khi truy cập photos
            if (profile.photos && profile.photos.length > 0) {
              existingUser.avatar_url = profile.photos[0].value;
            }

            await existingUser.save();

            return done(null, existingUser);
          }

          // KHÔNG tự động tạo người dùng mới
          // Thay vào đó trả về thông tin Google để controller xử lý
          return done(null, {
            id: profile.id,
            email: profile.emails[0].value,
            displayName: profile.displayName,
            photos: profile.photos || [],
            isNewUser: true, // Đánh dấu đây là người dùng mới
          });
        } catch (error) {
          console.error("Lỗi xác thực Google:", error);
          return done(error, false);
        }
      }
    )
  );
};
