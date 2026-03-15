const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Email configuration from environment variables (trim quotes and whitespace)
const EMAIL_HOST = (process.env.EMAIL_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, '');
const EMAIL_PORT = parseInt((process.env.EMAIL_PORT || '587').trim().replace(/^["']|["']$/g, '')) || 587;
const EMAIL_USER = (process.env.EMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
const EMAIL_PASS = (process.env.EMAIL_PASS || '').trim().replace(/^["']|["']$/g, '');
const EMAIL_FROM = (process.env.EMAIL_FROM || EMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim().replace(/^["']|["']$/g, '');
const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || EMAIL_FROM || 'noreply@sodeclick.com').trim().replace(/^["']|["']$/g, '');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Initialize Resend client (will be re-initialized with current env vars when needed)
let resendClient = null;

// Function to get or create Resend client
const getResendClient = () => {
  const currentResendApiKey = (process.env.RESEND_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (currentResendApiKey) {
    if (!resendClient) {
      resendClient = new Resend(currentResendApiKey);
      console.log('✅ Resend API client initialized');
    }
    return resendClient;
  }
  return null;
};

// Helper function to get safe frontend URL
// - In development: always use localhost (safety check)
// - In production: always use https://sodeclick.com (safety check)
const getSafeFrontendUrl = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  let url = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  console.log('🔍 [getSafeFrontendUrl] Checking URL...');
  console.log('   NODE_ENV:', NODE_ENV);
  console.log('   FRONTEND_URL from env:', process.env.FRONTEND_URL);
  console.log('   Current URL:', url);
  
  if (NODE_ENV === 'development') {
    // Safety check: In development mode, ALWAYS use localhost (force override)
    console.log('🔍 [getSafeFrontendUrl] Development mode detected - forcing localhost');
    if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
      console.warn('⚠️ [getSafeFrontendUrl] Development mode but FRONTEND_URL is not localhost!');
      console.warn('   Original URL:', url);
      console.warn('   Overriding to localhost for safety');
      url = 'http://localhost:5173';
    } else {
      // Even if it contains localhost, ensure it's exactly http://localhost:5173
      url = 'http://localhost:5173';
      console.log('✅ [getSafeFrontendUrl] Using localhost:', url);
    }
  } else if (NODE_ENV === 'production') {
    // Safety check: In production mode, always use https://sodeclick.com
    console.log('🔍 [getSafeFrontendUrl] Production mode detected - forcing sodeclick.com');
    if (!url.includes('sodeclick.com')) {
      console.warn('⚠️ [getSafeFrontendUrl] Production mode but FRONTEND_URL is not sodeclick.com!');
      console.warn('   Overriding to https://sodeclick.com for safety');
      url = 'https://sodeclick.com';
    }
    // Ensure it's HTTPS in production
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
      console.warn('⚠️ [getSafeFrontendUrl] Production URL was HTTP, changed to HTTPS');
    }
    console.log('✅ [getSafeFrontendUrl] Using production URL:', url);
  }
  
  console.log('🔍 [getSafeFrontendUrl] Final URL:', url);
  return url;
};

// Create transporter
let transporter = null;

// Function to initialize transporter (lazy initialization - no verification on load)
const initializeTransporter = () => {
  // Re-check environment variables at runtime
  const currentEmailUser = (process.env.EMAIL_USER || EMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailPass = (process.env.EMAIL_PASS || EMAIL_PASS || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailHost = (process.env.EMAIL_HOST || EMAIL_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, '');
  const currentEmailPort = parseInt(String(process.env.EMAIL_PORT || EMAIL_PORT || '587').trim().replace(/^["']|["']$/g, '')) || 587;
  const currentEmailFrom = (process.env.EMAIL_FROM || EMAIL_FROM || currentEmailUser || '').trim().replace(/^["']|["']$/g, '');
  
  if (currentEmailUser && currentEmailPass) {
    console.log('📧 Initializing email service (lazy initialization)...');
    console.log('  Host:', currentEmailHost);
    console.log('  Port:', currentEmailPort);
    console.log('  User:', currentEmailUser ? `${currentEmailUser.substring(0, 3)}***` : 'NOT SET');
    console.log('  From:', currentEmailFrom);
    
    transporter = nodemailer.createTransport({
      host: currentEmailHost,
      port: currentEmailPort,
      secure: currentEmailPort === 465, // true for 465, false for other ports
      requireTLS: currentEmailPort === 587, // Require TLS for port 587
      auth: {
        user: currentEmailUser,
        pass: currentEmailPass
      },
      // Increase timeout settings for Railway/cloud environments
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
      // Add retry options
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      // Additional options for better connection stability
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates if needed
      }
    });

    // Don't verify on module load - verify only when actually sending email
    // This prevents connection timeout errors during server startup
    console.log('✅ Email service transporter created (will verify on first use)');
    
    return true;
  } else {
    console.warn('⚠️ Email service not configured. EMAIL_USER and EMAIL_PASS are required.');
    console.warn('   EMAIL_USER:', currentEmailUser ? 'SET' : 'NOT SET');
    console.warn('   EMAIL_PASS:', currentEmailPass ? 'SET' : 'NOT SET');
    console.warn('   Checking process.env.EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.warn('   Checking process.env.EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    return false;
  }
};

// Initialize on module load (without verification)
initializeTransporter();

/**
 * Send verification email with code
 * @param {string} email - Recipient email
 * @param {string} code - Verification code (6 digits alternating)
 * @param {string} name - User's name
 * @param {string} referenceCode - Reference code (8 characters)
 * @returns {Promise<Object>}
 */
const sendVerificationEmail = async (email, code, name = 'ผู้ใช้', referenceCode = '') => {
  console.log('🚀 [sendVerificationEmail] FUNCTION CALLED!');
  console.log('🚀 [sendVerificationEmail] Parameters:', { email, code, name, referenceCode });
  console.log('🚀 [sendVerificationEmail] Function is executing...');
  
  // Re-check environment variables and trim quotes/whitespace
  const currentResendApiKey = (process.env.RESEND_API_KEY || RESEND_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const currentResendFromEmail = (process.env.RESEND_FROM_EMAIL || RESEND_FROM_EMAIL || 'noreply@sodeclick.com').trim().replace(/^["']|["']$/g, '');
  const currentEmailUser = (process.env.EMAIL_USER || EMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailPass = (process.env.EMAIL_PASS || EMAIL_PASS || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailHost = (process.env.EMAIL_HOST || EMAIL_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, '');
  const currentEmailPort = parseInt(String(process.env.EMAIL_PORT || EMAIL_PORT || '587').trim().replace(/^["']|["']$/g, '')) || 587;
  const currentEmailFrom = (process.env.EMAIL_FROM || EMAIL_FROM || currentEmailUser || '').trim().replace(/^["']|["']$/g, '');
  
  console.log('📧 [sendVerificationEmail] Preparing to send email...');
  console.log('   To:', email);
  console.log('   Code:', code);
  console.log('   Reference:', referenceCode);
  console.log('   Name:', name);
  console.log('   RESEND_API_KEY:', currentResendApiKey ? '***SET***' : 'NOT SET');
  console.log('   RESEND_FROM_EMAIL:', currentResendFromEmail);

  // Create HTML and text content
  const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #e91e63;
            margin-bottom: 10px;
          }
          .code-box {
            background-color: #f8f9fa;
            border: 2px dashed #e91e63;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #e91e63;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #e91e63;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💕 SodeClick</div>
            <h2>ยืนยันอีเมลของคุณ</h2>
          </div>
          
          <p>สวัสดี <strong>${name}</strong>,</p>
          
          <p>ขอบคุณที่สมัครสมาชิกกับ SodeClick! กรุณายืนยันอีเมลของคุณโดยใช้รหัสยืนยันด้านล่าง:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          
          ${referenceCode ? `
          <div style="background-color: #f0f0f0; border-left: 4px solid #e91e63; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>รหัสอ้างอิง:</strong> <span style="font-family: 'Courier New', monospace; font-weight: bold; color: #e91e63;">${referenceCode}</span>
            </p>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">
              (เก็บรหัสอ้างอิงไว้เพื่อใช้ในการติดต่อสนับสนุน)
            </p>
          </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px;">
            <strong>หมายเหตุ:</strong> รหัสยืนยันนี้จะหมดอายุใน 15 นาที
          </p>
          
          <p>หากคุณไม่ได้สมัครสมาชิกกับ SodeClick กรุณาเพิกเฉยต่ออีเมลนี้</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SodeClick. สงวนลิขสิทธิ์</p>
            <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน</p>
          </div>
        </div>
      </body>
      </html>`;

  const textContent = `ยืนยันอีเมลของคุณ - SodeClick

สวัสดี ${name},

ขอบคุณที่สมัครสมาชิกกับ SodeClick! กรุณายืนยันอีเมลของคุณโดยใช้รหัสยืนยัน:

${code}

${referenceCode ? `รหัสอ้างอิง: ${referenceCode}\n(เก็บรหัสอ้างอิงไว้เพื่อใช้ในการติดต่อสนับสนุน)\n\n` : ''}หมายเหตุ: รหัสยืนยันนี้จะหมดอายุใน 15 นาที

หากคุณไม่ได้สมัครสมาชิกกับ SodeClick กรุณาเพิกเฉยต่ออีเมลนี้

© ${new Date().getFullYear()} SodeClick. สงวนลิขสิทธิ์`;

  // Try Resend API first (if available)
  const resend = getResendClient();
  if (currentResendApiKey && resend) {
    try {
      console.log('📧 [sendVerificationEmail] Attempting to send via Resend API...');
      const resendResult = await resend.emails.send({
        from: currentResendFromEmail || `SodeClick <${currentResendFromEmail}>`,
        to: email,
        subject: 'ยืนยันอีเมลของคุณ - SodeClick',
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ [sendVerificationEmail] Email sent successfully via Resend API!');
      console.log('   Message ID:', resendResult.data?.id);
      console.log('   To:', email);
      console.log('   Code:', code);
      console.log('   Reference:', referenceCode);
      return { success: true, messageId: resendResult.data?.id, method: 'resend' };
    } catch (resendError) {
      console.error('❌ [sendVerificationEmail] Resend API failed:', resendError.message);
      console.error('   Falling back to SMTP...');
      // Fall through to SMTP fallback
    }
  } else {
    console.log('⚠️ [sendVerificationEmail] Resend API not configured, using SMTP...');
  }
  
  // Fallback to SMTP
  // Ensure transporter is ready before sending
  if (!transporter) {
    // Recreate transporter if needed
    if (!currentEmailUser || !currentEmailPass) {
      console.error('❌ Email service not configured - EMAIL_USER and EMAIL_PASS are required');
      throw new Error('Email service is not configured. Please set RESEND_API_KEY or EMAIL_USER and EMAIL_PASS environment variables.');
    }
    
    transporter = nodemailer.createTransport({
      host: currentEmailHost,
      port: currentEmailPort,
      secure: currentEmailPort === 465,
      requireTLS: currentEmailPort === 587,
      auth: {
        user: currentEmailUser,
        pass: currentEmailPass
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  const mailOptions = {
    from: `"SodeClick" <${currentEmailFrom}>`,
    to: email,
    subject: 'ยืนยันอีเมลของคุณ - SodeClick',
    html: htmlContent,
    text: textContent
  };

  try {
    console.log('📧 [sendVerificationEmail] Attempting to send via SMTP...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ [sendVerificationEmail] Email sent successfully via SMTP!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    console.log('   Code:', code);
    console.log('   Reference:', referenceCode);
    return { success: true, messageId: info.messageId, method: 'smtp' };
  } catch (error) {
    console.error('❌ [sendVerificationEmail] Error sending email via SMTP:', error);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error command:', error.command);
    console.error('   Error response:', error.response);
    console.error('   Error responseCode:', error.responseCode);
    throw error;
  }
};

/**
 * Send welcome email after verification
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @returns {Promise<Object>}
 */
const sendWelcomeEmail = async (email, name = 'ผู้ใช้') => {
  // Re-check environment variables and trim quotes/whitespace
  const currentResendApiKey = (process.env.RESEND_API_KEY || RESEND_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const currentResendFromEmail = (process.env.RESEND_FROM_EMAIL || RESEND_FROM_EMAIL || 'noreply@sodeclick.com').trim().replace(/^["']|["']$/g, '');
  const currentEmailUser = (process.env.EMAIL_USER || EMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailPass = (process.env.EMAIL_PASS || EMAIL_PASS || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailHost = (process.env.EMAIL_HOST || EMAIL_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, '');
  const currentEmailPort = parseInt(String(process.env.EMAIL_PORT || EMAIL_PORT || '587').trim().replace(/^["']|["']$/g, '')) || 587;
  const currentEmailFrom = (process.env.EMAIL_FROM || EMAIL_FROM || currentEmailUser || '').trim().replace(/^["']|["']$/g, '');

  // Create HTML and text content
  const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #e91e63;
            margin-bottom: 10px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #e91e63;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💕 SodeClick</div>
            <h2>ยินดีต้อนรับ! 🎉</h2>
          </div>
          
          <p>สวัสดี <strong>${name}</strong>,</p>
          
          <p>ยินดีต้อนรับสู่ SodeClick! อีเมลของคุณได้รับการยืนยันเรียบร้อยแล้ว</p>
          
          <p>ตอนนี้คุณสามารถ:</p>
          <ul>
            <li>สร้างโปรไฟล์ของคุณ</li>
            <li>ค้นหาคนที่ใช่</li>
            <li>เริ่มการสนทนา</li>
            <li>และอีกมากมาย!</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${getSafeFrontendUrl()}" class="button">เริ่มต้นใช้งาน</a>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SodeClick. สงวนลิขสิทธิ์</p>
            <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน</p>
          </div>
        </div>
      </body>
      </html>`;

  const textContent = `ยินดีต้อนรับสู่ SodeClick! 🎉

สวัสดี ${name},

ยินดีต้อนรับสู่ SodeClick! อีเมลของคุณได้รับการยืนยันเรียบร้อยแล้ว

ตอนนี้คุณสามารถ:
- สร้างโปรไฟล์ของคุณ
- ค้นหาคนที่ใช่
- เริ่มการสนทนา
- และอีกมากมาย!

เริ่มต้นใช้งาน: ${getSafeFrontendUrl()}

© ${new Date().getFullYear()} SodeClick. สงวนลิขสิทธิ์`;

  // Try Resend API first (if available)
  const resend = getResendClient();
  if (currentResendApiKey && resend) {
    try {
      console.log('📧 [sendWelcomeEmail] Attempting to send via Resend API...');
      const resendResult = await resend.emails.send({
        from: currentResendFromEmail || `SodeClick <${currentResendFromEmail}>`,
        to: email,
        subject: 'ยินดีต้อนรับสู่ SodeClick! 🎉',
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ [sendWelcomeEmail] Email sent successfully via Resend API!');
      console.log('   Message ID:', resendResult.data?.id);
      console.log('   To:', email);
      return { success: true, messageId: resendResult.data?.id, method: 'resend' };
    } catch (resendError) {
      console.error('❌ [sendWelcomeEmail] Resend API failed:', resendError.message);
      console.error('   Falling back to SMTP...');
      // Fall through to SMTP fallback
    }
  } else {
    console.log('⚠️ [sendWelcomeEmail] Resend API not configured, using SMTP...');
  }
  
  // Fallback to SMTP
  if (!currentEmailUser || !currentEmailPass) {
    console.warn('⚠️ Email service not configured, skipping welcome email');
    return { success: false, message: 'Email service not configured' };
  }
  
  // Recreate transporter if needed
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: currentEmailHost,
      port: currentEmailPort,
      secure: currentEmailPort === 465,
      requireTLS: currentEmailPort === 587,
      auth: {
        user: currentEmailUser,
        pass: currentEmailPass
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  const mailOptions = {
    from: `"SodeClick" <${currentEmailFrom}>`,
    to: email,
    subject: 'ยินดีต้อนรับสู่ SodeClick! 🎉',
    html: htmlContent,
    text: textContent
  };

  try {
    console.log('📧 [sendWelcomeEmail] Attempting to send via SMTP...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ [sendWelcomeEmail] Email sent successfully via SMTP!');
    console.log('   Message ID:', info.messageId);
    return { success: true, messageId: info.messageId, method: 'smtp' };
  } catch (error) {
    console.error('❌ [sendWelcomeEmail] Error sending email via SMTP:', error);
    // Don't throw error for welcome email, just log it
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email with reset link
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} name - User's name
 * @returns {Promise<Object>}
 */
const sendPasswordResetEmail = async (email, resetToken, name = 'ผู้ใช้') => {
  // Re-check environment variables and trim quotes/whitespace
  const currentResendApiKey = (process.env.RESEND_API_KEY || RESEND_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  const currentResendFromEmail = (process.env.RESEND_FROM_EMAIL || RESEND_FROM_EMAIL || 'noreply@sodeclick.com').trim().replace(/^["']|["']$/g, '');
  const currentEmailUser = (process.env.EMAIL_USER || EMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailPass = (process.env.EMAIL_PASS || EMAIL_PASS || '').trim().replace(/^["']|["']$/g, '');
  const currentEmailHost = (process.env.EMAIL_HOST || EMAIL_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, '');
  const currentEmailPort = parseInt(String(process.env.EMAIL_PORT || EMAIL_PORT || '587').trim().replace(/^["']|["']$/g, '')) || 587;
  const currentEmailFrom = (process.env.EMAIL_FROM || EMAIL_FROM || currentEmailUser || '').trim().replace(/^["']|["']$/g, '');
  
  console.log('🔍 [sendPasswordResetEmail] Checking email configuration...');
  console.log('   RESEND_API_KEY:', currentResendApiKey ? '***SET***' : 'NOT SET');
  console.log('   RESEND_FROM_EMAIL:', currentResendFromEmail);
  console.log('   EMAIL_USER:', currentEmailUser ? `${currentEmailUser.substring(0, 3)}***` : 'NOT SET');
  console.log('   EMAIL_PASS:', currentEmailPass ? '***SET***' : 'NOT SET');
  console.log('   EMAIL_HOST:', currentEmailHost);
  console.log('   EMAIL_PORT:', currentEmailPort);
  console.log('   EMAIL_FROM:', currentEmailFrom);
  console.log('   Transporter exists:', !!transporter);
  
  // Recreate transporter if needed
  if (!transporter || !currentEmailUser || !currentEmailPass) {
    if (!currentEmailUser || !currentEmailPass) {
      console.error('❌ Email service not configured - EMAIL_USER and EMAIL_PASS are required');
      console.error('   EMAIL_USER:', currentEmailUser ? 'SET' : 'NOT SET');
      console.error('   EMAIL_PASS:', currentEmailPass ? 'SET' : 'NOT SET');
      console.error('   process.env.EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
      console.error('   process.env.EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
      throw new Error('Email service is not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.');
    }
    
    console.log('📧 [sendPasswordResetEmail] Creating new transporter...');
    transporter = nodemailer.createTransport({
      host: currentEmailHost,
      port: currentEmailPort,
      secure: currentEmailPort === 465, // true for 465, false for other ports
      requireTLS: currentEmailPort === 587, // Require TLS for port 587
      auth: {
        user: currentEmailUser,
        pass: currentEmailPass
      },
      // Increase timeout settings for Railway/cloud environments
      connectionTimeout: 30000, // 30 seconds (increased from 10)
      greetingTimeout: 30000, // 30 seconds (increased from 10)
      socketTimeout: 30000, // 30 seconds (increased from 10)
      // Add retry options
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      // Add debug option for development
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
      // Additional options for better connection stability
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates if needed
      }
    });
    
    // Verify the transporter before sending (with retry logic)
    let verifyAttempts = 0;
    const maxVerifyAttempts = 3;
    let verifyError = null;
    
    while (verifyAttempts < maxVerifyAttempts) {
      try {
        console.log(`🔍 [sendPasswordResetEmail] Verifying transporter connection (attempt ${verifyAttempts + 1}/${maxVerifyAttempts})...`);
        await transporter.verify();
        console.log('✅ [sendPasswordResetEmail] Transporter verified successfully');
        verifyError = null;
        break;
      } catch (error) {
        verifyAttempts++;
        verifyError = error;
        console.error(`❌ [sendPasswordResetEmail] Transporter verification failed (attempt ${verifyAttempts}/${maxVerifyAttempts}):`, error.message);
        
        if (verifyAttempts < maxVerifyAttempts) {
          console.log(`⏳ [sendPasswordResetEmail] Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // If verification failed after all attempts, log but don't throw (try to send anyway)
    if (verifyError) {
      console.error('⚠️ [sendPasswordResetEmail] Transporter verification failed after all attempts');
      console.error('   Error name:', verifyError.name);
      console.error('   Error message:', verifyError.message);
      console.error('   Error code:', verifyError.code);
      console.error('   Error command:', verifyError.command);
      console.error('   Error response:', verifyError.response);
      console.error('   Error responseCode:', verifyError.responseCode);
      console.warn('⚠️ [sendPasswordResetEmail] Will attempt to send email anyway (verification may fail due to network issues)');
      // Don't throw - try to send email anyway as verification can fail due to network issues
    }
  }
  
  // Use safe frontend URL (ensures localhost in development mode)
  const frontendUrl = getSafeFrontendUrl();
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  console.log('📧 [sendPasswordResetEmail] Preparing to send email...');
  console.log('   Environment:', process.env.NODE_ENV || 'development');
  console.log('   To:', email);
  console.log('   Reset Token:', resetToken);
  console.log('   Frontend URL:', frontendUrl);
  console.log('   Reset Link:', resetLink);
  console.log('   Name:', name);
  
  // Create HTML and text content
  const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #e91e63;
            margin-bottom: 10px;
          }
          .button-link {
            display: inline-block;
            padding: 15px 40px;
            background-color: #e91e63;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
          }
          .button-link:hover {
            background-color: #c2185b;
          }
          .link-box {
            background-color: #f8f9fa;
            border: 2px dashed #e91e63;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
            word-break: break-all;
          }
          .reset-link {
            color: #e91e63;
            text-decoration: none;
            font-size: 14px;
            word-break: break-all;
          }
          .warning-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box {
            background-color: #d1ecf1;
            border-left: 4px solid #0dcaf0;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💕 SodeClick</div>
            <h2>รีเซ็ตรหัสผ่านของคุณ</h2>
          </div>
          
          <p>สวัสดี <strong>${name}</strong>,</p>
          
          <p>คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี SodeClick ของคุณ</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" class="button-link">
              🔐 คลิกเพื่อรีเซ็ตรหัสผ่าน
            </a>
          </div>
          
          <div class="link-box">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">หรือคัดลอกลิงก์นี้:</p>
            <a href="${resetLink}" class="reset-link">${resetLink}</a>
          </div>
          
          <div class="warning-box">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ คำเตือน:</strong> ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง
            </p>
            <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">
              กรุณาคลิกลิงก์ทันทีหลังจากได้รับอีเมลนี้
            </p>
          </div>
          
          <div class="info-box">
            <p style="margin: 0; color: #055160; font-size: 14px;">
              <strong>📝 วิธีใช้งาน:</strong>
            </p>
            <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #055160; font-size: 14px;">
              <li>คลิกปุ่ม "รีเซ็ตรหัสผ่าน" ด้านบน</li>
              <li>ตั้งรหัสผ่านใหม่ที่คุณต้องการ</li>
              <li>เข้าสู่ระบบด้วยรหัสผ่านใหม่</li>
            </ol>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>🔒 ความปลอดภัย:</strong> อย่าแชร์ลิงก์นี้กับใคร หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาติดต่อทีมสนับสนุนทันที
          </p>
          
          <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} SodeClick. สงวนลิขสิทธิ์</p>
            <p>หากมีคำถาม กรุณาติดต่อทีมสนับสนุน</p>
          </div>
        </div>
      </body>
      </html>`;

  const textContent = `รีเซ็ตรหัสผ่านของคุณ - SodeClick

สวัสดี ${name},

คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี SodeClick ของคุณ

คลิกลิงก์นี้เพื่อรีเซ็ตรหัสผ่าน:
${resetLink}

⚠️ คำเตือน: ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง
กรุณาคลิกลิงก์ทันทีหลังจากได้รับอีเมลนี้

📝 วิธีใช้งาน:
1. คลิกลิงก์ด้านบน
2. ตั้งรหัสผ่านใหม่ที่คุณต้องการ
3. เข้าสู่ระบบด้วยรหัสผ่านใหม่

🔒 ความปลอดภัย: อย่าแชร์ลิงก์นี้กับใคร
หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาติดต่อทีมสนับสนุนทันที

หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

ทีมงาน SodeClick
© ${new Date().getFullYear()} SodeClick. สงวนลิขสิทธิ์`;

  // Try Resend API first (if available)
  const resend = getResendClient();
  if (currentResendApiKey && resend) {
    try {
      console.log('📧 [sendPasswordResetEmail] Attempting to send via Resend API...');
      const resendResult = await resend.emails.send({
        from: currentResendFromEmail || `SodeClick <${currentResendFromEmail}>`,
        to: email,
        subject: 'รีเซ็ตรหัสผ่านของคุณ - SodeClick',
        html: htmlContent,
        text: textContent
      });
      
      console.log('✅ [sendPasswordResetEmail] Email sent successfully via Resend API!');
      console.log('   Message ID:', resendResult.data?.id);
      console.log('   To:', email);
      return { success: true, messageId: resendResult.data?.id, method: 'resend' };
    } catch (resendError) {
      console.error('❌ [sendPasswordResetEmail] Resend API failed:', resendError.message);
      console.error('   Falling back to SMTP...');
      // Fall through to SMTP fallback
    }
  } else {
    console.log('⚠️ [sendPasswordResetEmail] Resend API not configured, using SMTP...');
  }
  
  // Fallback to SMTP
  if (!currentEmailUser || !currentEmailPass) {
    throw new Error('Email service is not configured. Please set RESEND_API_KEY or EMAIL_USER and EMAIL_PASS environment variables.');
  }
  
  const mailOptions = {
    from: `"SodeClick" <${currentEmailFrom}>`,
    to: email,
    subject: 'รีเซ็ตรหัสผ่านของคุณ - SodeClick',
    html: htmlContent,
    text: textContent
  };
  
  // Try to send email with retry logic
  let sendAttempts = 0;
  const maxSendAttempts = 3;
  let sendError = null;
  
  while (sendAttempts < maxSendAttempts) {
    try {
      console.log(`📧 [sendPasswordResetEmail] Attempting to send via SMTP (attempt ${sendAttempts + 1}/${maxSendAttempts})...`);
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ [sendPasswordResetEmail] Email sent successfully via SMTP!');
      console.log('   Message ID:', info.messageId);
      console.log('   To:', email);
      return { success: true, messageId: info.messageId, method: 'smtp' };
    } catch (error) {
      sendAttempts++;
      sendError = error;
      console.error(`❌ [sendPasswordResetEmail] Error sending email via SMTP (attempt ${sendAttempts}/${maxSendAttempts}):`, error.message);
      console.error('   Error name:', error.name);
      console.error('   Error code:', error.code);
      console.error('   Error command:', error.command);
      
      // If it's a timeout error and we have more attempts, retry
      if (sendAttempts < maxSendAttempts && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ESOCKETTIMEDOUT')) {
        const waitTime = sendAttempts * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`⏳ [sendPasswordResetEmail] Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // If it's not a retryable error or we've exhausted attempts, break
        break;
      }
    }
  }
  
  // If all attempts failed, throw the last error
  console.error('❌ [sendPasswordResetEmail] Failed to send email after all attempts');
  console.error('   Final error:', sendError);
  throw sendError;
};

// Function to check if email service is properly configured
const isConfigured = () => {
  const currentEmailUser = process.env.EMAIL_USER || EMAIL_USER;
  const currentEmailPass = process.env.EMAIL_PASS || EMAIL_PASS;
  const hasTransporter = !!transporter;
  const hasEnvVars = !!(currentEmailUser && currentEmailPass);
  
  console.log('🔍 [isConfigured] Checking email service configuration...');
  console.log('   transporter exists:', hasTransporter);
  console.log('   EMAIL_USER:', currentEmailUser ? 'SET' : 'NOT SET');
  console.log('   EMAIL_PASS:', currentEmailPass ? 'SET' : 'NOT SET');
  console.log('   hasEnvVars:', hasEnvVars);
  console.log('   isConfigured:', hasTransporter && hasEnvVars);
  
  return hasTransporter && hasEnvVars;
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  isConfigured
};

