const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { twiml: { VoiceResponse } } = require('twilio');
const { initializeDb, query } = require('./db');
const { zonedTimeToUtc } = require('date-fns-tz');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory reset tokens (for demo; use DB in production)
const resetTokens = {};

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Add Twilio setup at the top (after other requires)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || password !== user.password) { // simplified check for demo
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            message: 'Login successful',
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, credits } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'Email, password, and name are required' });
        }

        const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const result = await query(
            'INSERT INTO users (email, password, name, credits) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
            [email, password, name, typeof credits === 'number' ? credits : 0]
        );
        const newUser = result.rows[0];

        res.status(201).json({ success: true, message: 'User registered successfully', user: newUser });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Profile endpoint
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const result = await query('SELECT id, email, name, role, credits FROM users WHERE id = $1', [req.user.userId]);
        const user = result.rows[0];
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
        res.json({ success: true, user });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Admin: Get all users
app.get('/api/users', authenticateToken, async (req, res) => {
    // ... (logic for admin check needed)
    try {
        const result = await query('SELECT id, name, email, role, credits, created_at, last_login FROM users ORDER BY id ASC');
        res.json({ success: true, users: result.rows });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Admin: Update user
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    // ... (logic for admin check needed)
    const { id } = req.params;
    const { name, email, role, credits } = req.body;
    try {
        const result = await query(
            'UPDATE users SET name = $1, email = $2, role = $3, credits = $4 WHERE id = $5 RETURNING *',
            [name, email, role, credits, id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Admin: Delete user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    // ... (logic for admin check needed)
    const { id } = req.params;
    try {
        await query('DELETE FROM users WHERE id = $1', [id]);
            res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Forgot Password endpoint
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // ... (rest of the logic remains the same)
    const resetToken = Math.random().toString(36).substr(2, 8) + Date.now();
    resetTokens[resetToken] = { email, expires: Date.now() + 15 * 60 * 1000, userId: user.id };
    const resetUrl = `${process.env.RESET_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `<h2>Password Reset</h2><p>Click the link to reset: <a href="${resetUrl}">${resetUrl}</a></p>`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Reset email sent to', email);
    } catch (err) {
        console.error('Error sending reset email:', err);
    }
    return res.json({ success: true, message: 'If email is registered, a reset link will be sent.' });
});

// Reset Password endpoint
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password required' });
    
    const entry = resetTokens[token];
    if (!entry || entry.expires < Date.now()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
    
    await query('UPDATE users SET password = $1 WHERE email = $2', [newPassword, entry.email]); // Hash in production
    delete resetTokens[token];
    
    return res.json({ success: true, message: 'Password reset successful' });
});

// Schedule a call
app.post('/api/schedule-call', authenticateToken, async (req, res) => {
    const { name, phone, time } = req.body;
    if (!name || !phone || !time) return res.status(400).json({ success: false, message: 'All fields are required.' });

    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid phone number format. Please use the E.164 format (e.g., +14155552671).' 
        });
    }

    try {
        // The user provides time in their local timezone (assume IST for this app)
        // The input type="datetime-local" gives a string like "2024-07-26T14:00"
        const userTimeZone = 'Asia/Kolkata';
        const utcDate = zonedTimeToUtc(time, userTimeZone);

        const result = await query(
            'INSERT INTO calls (user_id, name, phone, "time") VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.userId, name, phone, utcDate]
        );
        res.json({ success: true, message: 'Call scheduled successfully.', call: result.rows[0] });
    } catch (error) {
        console.error('Schedule call error:', error);
        res.status(500).json({ success: false, message: 'Failed to schedule call.' });
    }
});

// Get scheduled calls for a user
app.get('/api/scheduled-calls', authenticateToken, async (req, res) => {
    try {
        const result = await query('SELECT * FROM calls WHERE user_id = $1 ORDER BY "time" DESC', [req.user.userId]);
        res.json({ success: true, calls: result.rows });
    } catch (error) {
        console.error('Fetch scheduled calls error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch calls.' });
    }
});

// GET /api/questions
app.get('/api/questions', authenticateToken, async (req, res) => {
    try {
        const result = await query("SELECT value FROM app_data WHERE key = 'questions'");
        res.json({ success: true, questions: result.rows[0]?.value || [] });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ success: false, message: 'Failed to get questions.' });
    }
});

// POST /api/questions
app.post('/api/questions', authenticateToken, async (req, res) => {
    const { questions } = req.body;
    if (!Array.isArray(questions)) return res.status(400).json({ success: false, message: 'Questions must be an array.' });

    try {
        const result = await query(
            "INSERT INTO app_data (key, value) VALUES ('questions', $1) ON CONFLICT (key) DO UPDATE SET value = $1 RETURNING value",
            [JSON.stringify(questions)]
        );
        res.json({ success: true, questions: result.rows[0].value });
    } catch (error) {
        console.error('Update questions error:', error);
        res.status(500).json({ success: false, message: 'Failed to save questions.' });
    }
});

// TwiML webhook to ask questions
app.post('/twiml/ask', express.urlencoded({ extended: false }), async (req, res) => {
    const { CallSid, SpeechResult, Digits } = req.body;
    const questionIndex = parseInt(req.query.questionIndex || '0', 10);
    const digits = SpeechResult || Digits;

    try {
        // Store response if this is not the first question
        if (digits !== undefined && questionIndex > 0) {
            await query(
                `INSERT INTO responses (call_sid, answers) VALUES ($1, $2)
                 ON CONFLICT (call_sid) DO UPDATE SET answers = responses.answers || $2`,
                [CallSid, JSON.stringify({ [questionIndex - 1]: digits })]
            );
        }

        const questionsResult = await query("SELECT value FROM app_data WHERE key = 'questions'");
        const questions = questionsResult.rows[0]?.value || [];

        const response = new VoiceResponse();
        if (questionIndex < questions.length) {
            const gather = response.gather({
                input: 'speech dtmf',
                numDigits: 1,
                action: `/twiml/ask?questionIndex=${questionIndex + 1}`,
                method: 'POST',
                timeout: 10
            });
            gather.say(questions[questionIndex]);
            response.say("We didn't receive any input. Let's try that again.");
            response.redirect({ method: 'POST' }, `/twiml/ask?questionIndex=${questionIndex}`);
        } else {
            response.say('Thank you for your responses. Goodbye!');
            response.hangup();
        }

        res.type('text/xml').send(response.toString());

    } catch (error) {
        console.error('TwiML webhook error:', error);
        const response = new VoiceResponse();
        response.say('An application error has occurred. Goodbye.');
        response.hangup();
        res.type('text/xml').send(response.toString());
    }
});

// Direct call endpoint
app.post('/api/direct-call', authenticateToken, async (req, res) => {
    // ... (logic is now fine)
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    try {
        await twilioClient.calls.create({
            url: `${process.env.APP_URL || 'https://js-ue5o.onrender.com'}/twiml/ask`,
            to: phone,
            from: TWILIO_PHONE_NUMBER
        });
        res.json({ success: true, message: 'Direct call initiated successfully.' });
    } catch (err) {
        console.error('Error making direct call with Twilio:', err);
        if (err.code === 21211) {
            return res.status(400).json({ success: false, message: 'The provided phone number is not valid. Please use E.164 format (e.g., +14155552671).' });
        }
        res.status(500).json({ success: false, message: 'Failed to initiate direct call.' });
    }
});

// Start server function
const startServer = async () => {
  try {
    await initializeDb();
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 