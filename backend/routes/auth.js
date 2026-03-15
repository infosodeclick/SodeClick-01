const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const User = require('../models/User');
const TemporaryRegistration = require('../models/TemporaryRegistration');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const crypto = require('crypto');
const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-2025';

// Generate random 6-digit OTP (no repeating digits, no sequential, e.g., 165792, 254986, 034588)
const generateRandomOTP = () => {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const usedDigits = [];
  let code = '';
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  // Generate 6 unique random digits
  while (code.length < 6 && attempts < maxAttempts) {
    attempts++;
    
    // Shuffle digits array for better randomness
    const shuffledDigits = [...digits].sort(() => Math.random() - 0.5);
    
    for (const digit of shuffledDigits) {
      // Skip if already used
      if (usedDigits.includes(digit)) {
        continue;
      }
      
      // Check if sequential with last digit (avoid patterns like 1-2, 2-3, etc.)
      if (code.length > 0) {
        const lastDigit = parseInt(code[code.length - 1]);
        const diff = Math.abs(digit - lastDigit);
        
        // Reject if sequential (difference is exactly 1)
        if (diff === 1) {
          continue;
        }
      }
      
      // Check if sequential with second-to-last digit (avoid patterns like 1-2-3)
      if (code.length > 1) {
        const secondLastDigit = parseInt(code[code.length - 2]);
        const lastDigit = parseInt(code[code.length - 1]);
        
        // Check if adding this digit would create a sequential pattern
        // e.g., if we have "1-2" and trying to add "3", reject it
        if (Math.abs(lastDigit - secondLastDigit) === 1 && Math.abs(digit - lastDigit) === 1) {
          continue;
        }
      }
      
      // Valid digit found
      usedDigits.push(digit);
      code += digit;
      break;
    }
  }
  
  // If couldn't generate 6 digits, regenerate
  if (code.length !== 6) {
    return generateRandomOTP();
  }
  
  // Final validation: ensure no repeating digits and no sequential pattern
  const codeArray = code.split('').map(Number);
  
  // Check for repeating digits
  const digitCounts = {};
  for (const digit of codeArray) {
    digitCounts[digit] = (digitCounts[digit] || 0) + 1;
    if (digitCounts[digit] > 1) {
      // Has repeating digits, regenerate
      return generateRandomOTP();
    }
  }
  
  // Check for sequential patterns (consecutive numbers)
  for (let i = 1; i < codeArray.length; i++) {
    const diff = Math.abs(codeArray[i] - codeArray[i - 1]);
    if (diff === 1) {
      // Has sequential pattern, regenerate
      return generateRandomOTP();
    }
  }
  
  // Check for reverse sequential patterns (e.g., 2-1, 3-2)
  for (let i = 1; i < codeArray.length; i++) {
    const diff = codeArray[i] - codeArray[i - 1];
    if (diff === 1 || diff === -1) {
      // Has sequential pattern (forward or reverse), regenerate
      return generateRandomOTP();
    }
  }
  
  console.log('✅ [OTP] Generated OTP:', code);
  return code;
};

// Generate reference code (8 characters: mix of uppercase letters and numbers)
const generateReferenceCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      dateOfBirth, 
      gender, 
      lookingFor, 
      location 
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Validate username: ต้องเป็นภาษาอังกฤษเท่านั้น และมีความยาวไม่ต่ำกว่า 6 ตัวอักษร
    const usernameRegex = /^[a-zA-Z0-9]+$/
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น'
      });
    }

    if (username.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'ชื่อผู้ใช้ต้องมีความยาวไม่ต่ำกว่า 6 ตัวอักษร'
      });
    }

    // Validate password: ต้องมี 8 ตัวอักษรขึ้นไป, มีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข, ต้องเป็นภาษาอังกฤษเท่านั้น
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      });
    }

    // ตรวจสอบรหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น
    const passwordEnglishRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/
    if (!passwordEnglishRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น'
      });
    }

    // ตรวจสอบรหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email }, 
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว'
      });
    }

    // Validate age (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

    if (actualAge < 18) {
      return res.status(400).json({
        success: false,
        message: 'คุณต้องมีอายุ 18 ปีขึ้นไป'
      });
    }

    // Check if there's already a pending registration for this email
    const existingPending = await TemporaryRegistration.findOne({ email: email.toLowerCase() });
    if (existingPending) {
      // Delete old pending registration
      await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
    }

    // Generate random OTP (6 digits, no repeating, no sequential) and reference code
    const verificationCode = generateRandomOTP();
    const referenceCode = generateReferenceCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15); // 15 minutes

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store registration data temporarily (NOT in User collection)
    const tempRegistration = new TemporaryRegistration({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      lookingFor,
      location,
      verificationCode,
      referenceCode,
      verificationExpires,
      verificationAttempts: 0
    });

    await tempRegistration.save();
    console.log('📝 [REGISTRATION] Temporary registration saved, preparing to send email...');
    
    try {
      console.log('📧 [REGISTRATION] Sending verification email to:', email);
      console.log('🔐 [REGISTRATION] Verification code:', verificationCode);
      console.log('🔑 [REGISTRATION] Reference code:', referenceCode);
      
      const emailResult = await sendVerificationEmail(email, verificationCode, `${firstName} ${lastName}`, referenceCode);
      console.log('✅ [REGISTRATION] Verification email sent successfully');
      
      // Email sent successfully - return success response (user NOT created yet)
      // Note: Registration is NOT complete yet - user must verify email first
      return res.status(201).json({
        success: true,
        message: 'กรุณายืนยันอีเมลของคุณเพื่อลงทะเบียน',
        data: {
          requiresEmailVerification: true,
          email: email,
          referenceCode: referenceCode, // Send reference code to frontend
          emailSent: true,
          registrationIncomplete: true // Indicate that registration is not complete yet
        }
      });
      
    } catch (emailError) {
      console.error('❌ [REGISTRATION] Error sending verification email:', emailError);
      
      // Email failed - DELETE the temporary registration
      console.error('🗑️ [REGISTRATION] Email failed, deleting temporary registration');
      try {
        await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
        console.log('✅ [REGISTRATION] Temporary registration deleted successfully');
      } catch (deleteError) {
        console.error('❌ [REGISTRATION] Error deleting temporary registration:', deleteError);
      }
      
      // Return error - registration failed because email couldn't be sent
      return res.status(500).json({
        success: false,
        message: 'ลงทะเบียนไม่สำเร็จ ไม่สามารถส่งอีเมลยืนยันได้ กรุณาติดต่อผู้ดูแลระบบหรือลองใหม่อีกครั้ง',
        error: 'Email service unavailable',
        emailError: emailError.message,
        registrationFailed: true
      });
    }

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      error: error.message
    });
  }
});

// Verify email with code and reference code
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code, referenceCode } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลและรหัสยืนยัน'
      });
    }

    // Find temporary registration by email
    const tempRegistration = await TemporaryRegistration.findOne({ email: email.toLowerCase() });

    if (!tempRegistration) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการลงทะเบียน กรุณาลงทะเบียนใหม่'
      });
    }

    // Check if reference code matches (if provided)
    if (referenceCode && tempRegistration.referenceCode !== referenceCode) {
      return res.status(400).json({
        success: false,
        message: 'รหัสอ้างอิงไม่ถูกต้อง'
      });
    }

    // Check if code expired
    if (tempRegistration.isExpired()) {
      await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
      return res.status(400).json({
        success: false,
        message: 'รหัสยืนยันหมดอายุแล้ว กรุณาลงทะเบียนใหม่',
        expired: true
      });
    }

    // Check verification attempts (max 5 attempts)
    if (tempRegistration.hasMaxAttempts()) {
      await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
      return res.status(429).json({
        success: false,
        message: 'คุณได้ลองยืนยันเกินจำนวนครั้งที่กำหนด กรุณาลงทะเบียนใหม่'
      });
    }

    // Verify code
    console.log('🔐 [VERIFY] Verifying code for email:', email);
    console.log('🔐 [VERIFY] Code received:', code);
    console.log('🔐 [VERIFY] Code stored:', tempRegistration.verificationCode);
    console.log('🔐 [VERIFY] Reference code:', tempRegistration.referenceCode);
    console.log('🔐 [VERIFY] Codes match:', tempRegistration.verificationCode === code);
    
    if (tempRegistration.verificationCode !== code) {
      tempRegistration.verificationAttempts += 1;
      await tempRegistration.save();

      const remainingAttempts = 5 - tempRegistration.verificationAttempts;
      console.log('❌ [VERIFY] Code mismatch. Remaining attempts:', remainingAttempts);
      return res.status(400).json({
        success: false,
        message: `รหัสยืนยันไม่ถูกต้อง (เหลือ ${remainingAttempts} ครั้ง)`,
        remainingAttempts
      });
    }
    
    console.log('✅ [VERIFY] Code verified successfully! Creating user...');

    // Check if user already exists (shouldn't happen, but safety check)
    const existingUser = await User.findOne({
      $or: [
        { email: tempRegistration.email },
        { username: { $regex: new RegExp(`^${tempRegistration.username}$`, 'i') } }
      ]
    });

    if (existingUser) {
      // User already exists, delete temp registration
      await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว'
      });
    }

    // Code is correct - CREATE USER NOW (not before verification)
    const userData = {
      username: tempRegistration.username,
      email: tempRegistration.email,
      password: tempRegistration.password, // Already hashed
      firstName: tempRegistration.firstName,
      lastName: tempRegistration.lastName,
      dateOfBirth: tempRegistration.dateOfBirth,
      gender: tempRegistration.gender,
      lookingFor: tempRegistration.lookingFor,
      location: tempRegistration.location,
      role: 'user',
      emailVerified: true, // Verified now
      coordinates: {
        type: 'Point',
        coordinates: tempRegistration.phone ? [100.5018, 13.7563] : [0, 0] // Bangkok for phone registration
      },
      displayName: `${tempRegistration.firstName} ${tempRegistration.lastName}`,
      profileImages: [],
      lifestyle: {
        smoking: null,
        drinking: null,
        exercise: null,
        diet: null
      },
      membership: {
        tier: 'member',
        startDate: new Date()
      }
    };

    // Add phone if exists (for phone registration)
    if (tempRegistration.phone) {
      userData.phone = tempRegistration.phone;
      userData.coins = 1000;
      userData.votes = 100;
      userData.dailyUsage = {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      };
    }

    const user = new User(userData);

    await user.save();
    console.log('✅ [VERIFY] User created successfully:', user._id);

    // Delete temporary registration
    await TemporaryRegistration.deleteOne({ email: email.toLowerCase() });
    console.log('✅ [VERIFY] Temporary registration deleted');

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);
      console.log('✅ [VERIFY] Welcome email sent');
    } catch (emailError) {
      console.error('❌ [VERIFY] Error sending welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'ยืนยันอีเมลสำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('❌ [VERIFY] Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยันอีเมล',
      error: error.message
    });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมล'
      });
    }

    // Find temporary registration by email
    const tempRegistration = await TemporaryRegistration.findOne({ email: email.toLowerCase() });

    if (!tempRegistration) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการลงทะเบียน กรุณาลงทะเบียนใหม่'
      });
    }

    // Rate limiting: Check if resend was requested too recently (within 1 minute)
    const lastResendTime = tempRegistration.verificationExpires;
    if (lastResendTime) {
      const timeSinceLastResend = new Date() - lastResendTime;
      const oneMinute = 60 * 1000;
      if (timeSinceLastResend < oneMinute) {
        const secondsRemaining = Math.ceil((oneMinute - timeSinceLastResend) / 1000);
        return res.status(429).json({
          success: false,
          message: `กรุณารอ ${secondsRemaining} วินาที ก่อนขอรหัสใหม่`,
          retryAfter: secondsRemaining
        });
      }
    }

    // Generate new random OTP and reference code
    const verificationCode = generateRandomOTP();
    const referenceCode = generateReferenceCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15); // 15 minutes

    // Update temporary registration
    tempRegistration.verificationCode = verificationCode;
    tempRegistration.referenceCode = referenceCode;
    tempRegistration.verificationExpires = verificationExpires;
    tempRegistration.verificationAttempts = 0; // Reset attempts
    await tempRegistration.save();

    // Send verification email
    try {
      console.log('📧 [RESEND] Sending verification email to:', tempRegistration.email);
      console.log('🔐 [RESEND] Verification code:', verificationCode);
      console.log('🔑 [RESEND] Reference code:', referenceCode);
      await sendVerificationEmail(tempRegistration.email, verificationCode, `${tempRegistration.firstName} ${tempRegistration.lastName}`, referenceCode);
    } catch (emailError) {
      console.error('❌ [RESEND] Error sending verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองใหม่อีกครั้ง'
      });
    }

    res.json({
      success: true,
      message: 'ส่งรหัสยืนยันไปที่อีเมลของคุณแล้ว',
      data: {
        email: tempRegistration.email,
        referenceCode: referenceCode,
        expiresIn: 15 // minutes
      }
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งรหัสยืนยัน',
      error: error.message
    });
  }
});

// Register with phone (ต้องยืนยันอีเมล)
router.post('/register-phone', async (req, res) => {
  try {
    const { 
      phone, 
      email,
      password,
      firstName, 
      lastName, 
      dateOfBirth, 
      gender, 
      lookingFor, 
      location 
    } = req.body;

    // Validate required fields
    if (!phone || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบอีเมลไม่ถูกต้อง'
      });
    }

    // Validate password: ต้องมี 8 ตัวอักษรขึ้นไป, มีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข, ต้องเป็นภาษาอังกฤษเท่านั้น
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      });
    }

    // ตรวจสอบรหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น
    const passwordEnglishRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/
    if (!passwordEnglishRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้น'
      });
    }

    // ตรวจสอบรหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข'
      });
    }

    // Check if user already exists (by phone or email)
    const existingUser = await User.findOne({
      $or: [
        { phone },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      if (existingUser.phone === phone) {
        return res.status(409).json({
          success: false,
          message: 'เบอร์โทรนี้ได้ถูกใช้งานแล้ว'
        });
      }
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({
          success: false,
          message: 'อีเมลนี้ได้ถูกใช้งานแล้ว'
        });
      }
    }

    // Check if there's already a pending registration for this email or phone
    const existingPending = await TemporaryRegistration.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone }
      ]
    });
    if (existingPending) {
      // Delete old pending registration
      await TemporaryRegistration.deleteOne({
        $or: [
          { email: email.toLowerCase() },
          { phone: phone }
        ]
      });
    }

    // Generate random OTP (6 digits, no repeating, no sequential) and reference code
    const verificationCode = generateRandomOTP();
    const referenceCode = generateReferenceCode();
    const verificationExpires = new Date();
    verificationExpires.setMinutes(verificationExpires.getMinutes() + 15); // 15 minutes

    // Generate username from phone (remove first 0, add prefix)
    const username = 'user_' + phone.replace(/^0/, '');

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate age (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

    if (actualAge < 18) {
      return res.status(400).json({
        success: false,
        message: 'คุณต้องมีอายุ 18 ปีขึ้นไป'
      });
    }

    // Store registration data temporarily (NOT in User collection)
    const tempRegistration = new TemporaryRegistration({
      username,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth: birthDate,
      gender,
      lookingFor,
      location,
      verificationCode,
      referenceCode,
      verificationExpires,
      verificationAttempts: 0
    });

    await tempRegistration.save();
    console.log('📝 [PHONE REGISTRATION] Temporary registration saved, preparing to send email...');
    
    try {
      console.log('📧 [PHONE REGISTRATION] Sending verification email to:', email);
      console.log('🔐 [PHONE REGISTRATION] Verification code:', verificationCode);
      console.log('🔑 [PHONE REGISTRATION] Reference code:', referenceCode);
      
      const emailResult = await sendVerificationEmail(email, verificationCode, `${firstName} ${lastName}`, referenceCode);
      console.log('✅ [PHONE REGISTRATION] Verification email sent successfully');
      
      // Email sent successfully - return success response (user NOT created yet)
      // Note: Registration is NOT complete yet - user must verify email first
      return res.status(201).json({
        success: true,
        message: 'กรุณายืนยันอีเมลของคุณเพื่อลงทะเบียน',
        data: {
          requiresEmailVerification: true,
          email: email,
          referenceCode: referenceCode, // Send reference code to frontend
          emailSent: true,
          registrationIncomplete: true // Indicate that registration is not complete yet
        }
      });
      
    } catch (emailError) {
      console.error('❌ [PHONE REGISTRATION] Error sending verification email:', emailError);
      
      // Email failed - DELETE the temporary registration
      console.error('🗑️ [PHONE REGISTRATION] Email failed, deleting temporary registration');
      try {
        await TemporaryRegistration.deleteOne({
          $or: [
            { email: email.toLowerCase() },
            { phone: phone }
          ]
        });
        console.log('✅ [PHONE REGISTRATION] Temporary registration deleted successfully');
      } catch (deleteError) {
        console.error('❌ [PHONE REGISTRATION] Error deleting temporary registration:', deleteError);
      }
      
      // Return error - registration failed because email couldn't be sent
      return res.status(500).json({
        success: false,
        message: 'ลงทะเบียนไม่สำเร็จ ไม่สามารถส่งอีเมลยืนยันได้ กรุณาติดต่อผู้ดูแลระบบหรือลองใหม่อีกครั้ง',
        error: 'Email service unavailable',
        emailError: emailError.message,
        registrationFailed: true
      });
    }

  } catch (error) {
    console.error('Phone register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
  }
});

// Login with email/password
// Login with phone (ไม่ต้องใช้ OTP)
router.post('/login-phone', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์'
      });
    }

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้นี้'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update login history and online status
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'phone',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    user.lastActive = new Date(); // อัปเดต lastActive เมื่อเข้าสู่ระบบ
    user.isOnline = true; // ตั้งค่าสถานะออนไลน์
    await user.save();

    // Return success response
    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log('🔐 Login attempt:', { email, username, hasPassword: !!password });
    console.log('🔐 Request body:', req.body);
    console.log('🔐 Request headers:', req.headers);

    if (!password) {
      console.log('❌ No password provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกรหัสผ่าน'
      });
    }

    if (!email && !username) {
      console.log('❌ No email or username provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลหรือชื่อผู้ใช้'
      });
    }

    // Find user by email or username
    let user;
    if (email) {
      user = await User.findOne({ email });
      console.log('🔍 Finding user by email:', email, 'Found:', !!user);
    } else {
      // Search username case-insensitive
      user = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      });
      console.log('🔍 Finding user by username (case-insensitive):', username, 'Found:', !!user);
    }

    if (!user) {
      console.log('❌ User not found');
      console.log('❌ Searched for:', email ? `email: ${email}` : `username: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      console.log('❌ User is banned:', user._id);
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณถูกระงับการใช้งาน',
        reason: user.banReason
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User is inactive:', user._id);
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณไม่สามารถใช้งานได้'
      });
    }

    // Verify password
    console.log('🔑 Verifying password for user:', user._id);
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔑 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user._id);
      console.log('❌ User details:', { username: user.username, email: user.email, isActive: user.isActive, isBanned: user.isBanned });
      return res.status(401).json({
        success: false,
        message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Generate token
    const token = generateToken(user);
    console.log('✅ Login successful for user:', user._id, 'Token generated:', !!token);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'email',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    user.lastActive = new Date(); // อัปเดต lastActive เมื่อเข้าสู่ระบบ
    user.isOnline = true; // ตั้งค่าสถานะออนไลน์
    await user.save();

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      error: error.message
    });
  }
});


// Phone verification - Send OTP
router.post('/phone/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์'
      });
    }

    // Validate phone number format (Thai)
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists
    let user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้ที่ลงทะเบียนด้วยเบอร์โทรศัพท์นี้'
      });
    }

    // Update OTP
    user.phoneVerificationCode = otp;
    user.phoneVerificationExpires = expiresAt;
    await user.save();

    // OTP SMS sending - placeholder for future SMS service integration
    // Note: Would send OTP via SMS service in production environment
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      success: true,
      message: 'ส่งรหัส OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว',
      data: {
        phone,
        expiresIn: 10 * 60 * 1000 // 10 minutes in milliseconds
      }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่ง OTP',
      error: error.message
    });
  }
});

// Phone verification - Verify OTP
router.post('/phone/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกเบอร์โทรศัพท์และรหัส OTP'
      });
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // Check if OTP is valid
    if (user.phoneVerificationCode !== otp) {
      return res.status(400).json({
        success: false,
        message: 'รหัส OTP ไม่ถูกต้อง'
      });
    }

    // Check if OTP is expired
    if (user.phoneVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'รหัส OTP หมดอายุแล้ว'
      });
    }

    // Verify phone
    user.phoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;

    // Generate token
    const token = generateToken(user);

    // Update login history
    if (!user.loginHistory) {
      user.loginHistory = [];
    }
    user.loginHistory.push({
      timestamp: new Date(),
      method: 'phone',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    user.lastLogin = new Date();
    user.lastActive = new Date(); // อัปเดต lastActive เมื่อเข้าสู่ระบบ
    user.isOnline = true; // ตั้งค่าสถานะออนไลน์
    await user.save();

    res.json({
      success: true,
      message: 'ยืนยันเบอร์โทรศัพท์สำเร็จ',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยัน OTP',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ token'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔍 JWT decoded:', { id: decoded.id, email: decoded.email, username: decoded.username });
    
    const user = await User.findById(decoded.id);
    console.log('🔍 User found:', { 
      _id: user?._id, 
      email: user?.email, 
      username: user?.username,
      displayName: user?.displayName,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีของคุณไม่สามารถใช้งานได้'
      });
    }

    const userProfile = user.getPublicProfile();
    console.log('👤 User profile data being sent:', {
      _id: userProfile._id,
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username,
      displayName: userProfile.displayName,
      coins: userProfile.coins, // เพิ่มการ log coins
      allKeys: Object.keys(userProfile)
    });

    res.json({
      success: true,
      data: {
        user: userProfile
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง',
      error: error.message
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user) {
          user.isOnline = false;
          user.lastActive = new Date();
          await user.save();
          console.log(`🔴 User ${user._id} logged out - online status set to false`);
        }
      } catch (jwtError) {
        console.error('JWT verification failed during logout:', jwtError);
        // Continue with logout even if JWT is invalid
      }
    }

    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      error: error.message
    });
  }
});

// Check if username is available
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check username case-insensitive
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    res.json({
      success: true,
      data: {
        available: !existingUser
      }
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้',
      error: error.message
    });
  }
});

// Check if email is available
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const existingUser = await User.findOne({ email });
    
    res.json({
      success: true,
      data: {
        available: !existingUser
      }
    });

  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบอีเมล',
      error: error.message
    });
  }
});

// ============ GOOGLE OAUTH ROUTES ============

// Only setup Google OAuth routes if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Google OAuth - Initiate authentication
  router.get('/google', 
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  // Google OAuth - Callback handler
  router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed&reason=passport_failed` }),
    async (req, res) => {
      try {
        console.log('🔍 Google OAuth callback received');
        console.log('🔍 Request user:', req.user);
        console.log('🔍 Request query:', req.query);
        console.log('🔍 Request body:', req.body);
        
        const user = req.user;
        
        if (!user) {
          console.log('❌ Google OAuth: No user returned from passport');
          console.log('❌ This usually means the Google OAuth strategy failed');
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed&reason=no_user`);
        }

        console.log('✅ Google OAuth user found:', {
          id: user._id,
          email: user.email,
          googleId: user.googleId,
          username: user.username
        });

        // Generate JWT token
        const token = generateToken(user);
        console.log('✅ JWT token generated:', !!token);

        // Update login history
        if (!user.loginHistory) {
          user.loginHistory = [];
        }
        user.loginHistory.push({
          timestamp: new Date(),
          method: 'google',
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        user.lastLogin = new Date();
        user.lastActive = new Date();
        user.isOnline = true;
        await user.save();

        console.log('✅ Google OAuth successful for user:', user._id);

        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}&login_success=true`;
        console.log('🔄 Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);

      } catch (error) {
        console.error('❌ Google OAuth callback error:', error);
        console.error('❌ Error stack:', error.stack);
        const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed&reason=callback_error&message=${encodeURIComponent(error.message)}`;
        res.redirect(errorUrl);
      }
    }
  );

  // Google OAuth - Get auth URL for frontend
  router.get('/google/url', (req, res) => {
    try {
      const authUrl = `${req.protocol}://${req.get('host')}/api/auth/google`;
      res.json({
        success: true,
        data: {
          authUrl
        }
      });
    } catch (error) {
      console.error('❌ Get Google auth URL error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้าง URL สำหรับ Google OAuth',
        error: error.message
      });
    }
  });
} else {
  // Provide fallback routes when Google OAuth is not configured
  router.get('/google', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured on this server'
    });
  });

  router.get('/google/callback', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured on this server'
    });
  });

  router.get('/google/url', (req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured on this server'
    });
  });
}

// Password Reset Routes - Must be before /login route
// Forgot Password - Request password reset
router.post('/forgot-password', async (req, res) => {
  console.log('🔔🔔🔔 [FORGOT PASSWORD] Route called - START');
  console.log('   Method:', req.method);
  console.log('   Path:', req.path);
  console.log('   URL:', req.url);
  console.log('   Request body:', JSON.stringify(req.body));
  console.log('   Headers:', JSON.stringify(req.headers));
  try {
    const { emailOrPhone } = req.body;
    console.log('   emailOrPhone received:', emailOrPhone);
    
    if (!emailOrPhone) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์'
      });
    }
    
    // Find user by email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{9,10}$/;
    const cleanPhone = emailOrPhone.replace(/[-\s]/g, '');
    
    let user;
    if (emailRegex.test(emailOrPhone)) {
      user = await User.findOne({ email: emailOrPhone.toLowerCase() });
    } else if (phoneRegex.test(cleanPhone)) {
      user = await User.findOne({ phone: cleanPhone });
    } else {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบอีเมลหรือเบอร์โทรศัพท์ไม่ถูกต้อง'
      });
    }
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบอีเมลหรือเบอร์โทรศัพท์นี้ในระบบ กรุณาตรวจสอบอีกครั้ง'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);
    
    // Save reset token to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    
    // Send reset email
    console.log('📧 [FORGOT PASSWORD] Preparing to send password reset email...');
    console.log('   User ID:', user._id);
    console.log('   User Email:', user.email);
    console.log('   User Name:', `${user.firstName} ${user.lastName}`);
    console.log('   Reset Token (first 20 chars):', resetToken.substring(0, 20) + '...');
    
    try {
      console.log('📧 [FORGOT PASSWORD] Calling sendPasswordResetEmail...');
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetToken,
        `${user.firstName} ${user.lastName}`
      );
      
      console.log('✅ [FORGOT PASSWORD] Password reset email sent successfully:', emailResult);
      
      return res.json({
        success: true,
        message: 'เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย'
      });
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      
      // Clear token if email failed
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง'
      });
    }
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน',
      error: error.message
    });
  }
});

// Verify reset token
router.get('/reset-password/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ Token'
      });
    }
    
    // Find user with matching token
    const users = await User.find({ passwordResetToken: { $exists: true } });
    let user = null;
    
    for (const u of users) {
      if (u.passwordResetToken && await bcrypt.compare(token, u.passwordResetToken)) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว'
      });
    }
    
    // Check if token expired
    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token หมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่'
      });
    }
    
    return res.json({
      success: true,
      message: 'Token ถูกต้อง'
    });
    
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ Token',
      error: error.message
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก Token และรหัสผ่านใหม่'
      });
    }
    
    // Validate password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
      });
    }
    
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const isEnglishOnly = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(newPassword);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีตัวอักษรใหญ่ ตัวเล็ก และตัวเลข'
      });
    }
    
    if (!isEnglishOnly) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องเป็นภาษาอังกฤษเท่านั้น'
      });
    }
    
    // Find user with matching token
    const users = await User.find({ passwordResetToken: { $exists: true } });
    let user = null;
    
    for (const u of users) {
      if (u.passwordResetToken && await bcrypt.compare(token, u.passwordResetToken)) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token ไม่ถูกต้องหรือหมดอายุแล้ว'
      });
    }
    
    // Check if token expired
    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token หมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่'
      });
    }
    
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    console.log('✅ Password reset successful for user:', user._id);
    
    return res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน',
      error: error.message
    });
  }
});

module.exports = router;
