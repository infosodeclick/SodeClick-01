const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Configure Google OAuth Strategy only if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('🔧 Configuring Google OAuth Strategy');
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('🔍 Google OAuth Profile received:', {
                id: profile.id,
                displayName: profile.displayName,
                emails: profile.emails,
                name: profile.name,
                photos: profile.photos
            });

            // Validate profile data
            if (!profile.id) {
                console.error('❌ Google OAuth: No profile ID received');
                return done(new Error('No profile ID received from Google'), null);
            }

            if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
                console.error('❌ Google OAuth: No email received');
                return done(new Error('No email received from Google'), null);
            }

            // Check if user already exists with this Google ID
            let user = await User.findOne({ googleId: profile.id });
            
            if (user) {
                console.log('✅ Existing Google user found:', user._id);
                return done(null, user);
            }

            // Check if user exists with the same email
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
                // Link Google account to existing user and update display info
                user.googleId = profile.id;
                
                // อัพเดทชื่อจาก Google profile หากยังไม่มี displayName
                if (!user.displayName || user.displayName.includes('google_')) {
                    const firstName = profile.name.givenName || user.firstName;
                    const lastName = profile.name.familyName || user.lastName;
                    const displayName = `${firstName} ${lastName}`.trim();
                    
                    user.firstName = firstName;
                    user.lastName = lastName;
                    user.displayName = displayName;
                    user.username = displayName || user.username;
                }
                
                await user.save();
                console.log('🔗 Linked Google account to existing user:', user._id);
                return done(null, user);
            }

            // Create new user
            const firstName = profile.name.givenName || 'User';
            const lastName = profile.name.familyName || '';
            const displayName = `${firstName} ${lastName}`.trim();
            
            console.log('🆕 Creating new Google user with data:', {
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName,
                lastName,
                displayName
            });
            
            const newUser = new User({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: firstName,
                lastName: lastName,
                username: displayName || `google_user_${Date.now()}`, // ใช้ชื่อจริงแทน Google ID
                displayName: displayName,
                profileImages: profile.photos && profile.photos.length > 0 ? [profile.photos[0].value] : [],
                isVerified: true, // Google accounts are considered verified
                // Set default required fields
                dateOfBirth: new Date('1990-01-01'), // Default date - user will need to update
                gender: 'other', // Default - user will need to update
                lookingFor: 'both', // Default - user will need to update
                location: 'ไม่ระบุ', // Default - user will need to update
                coordinates: {
                    type: 'Point',
                    coordinates: [100.5018, 13.7563] // Default Bangkok coordinates
                }
            });

            await newUser.save();
            console.log('✅ New Google user created successfully:', newUser._id);
            return done(null, newUser);

        } catch (error) {
            console.error('❌ Google OAuth Strategy Error:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            return done(error, null);
        }
    }));
} else {
    console.log('⚠️  Google OAuth credentials not provided, skipping Google authentication setup');
}

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
