const path = require('path');
const fs = require('fs');
const twilio = require('twilio');
require('dotenv').config();

const DATA_DIR = process.env.DATA_DIR || __dirname; // Use shared data directory if available
const callsFile = path.join(DATA_DIR, 'calls.json');
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const APP_URL = process.env.APP_URL || 'https://js-ue5o.onrender.com';
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

function loadCalls() {
    try {
        if (!fs.existsSync(callsFile)) {
            fs.writeFileSync(callsFile, JSON.stringify({ calls: [] }, null, 2));
        }
        const data = fs.readFileSync(callsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading calls:', error);
        return { calls: [] };
    }
}

function saveCalls(callsData) {
    try {
        fs.writeFileSync(callsFile, JSON.stringify(callsData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving calls:', error);
        return false;
    }
}

async function processScheduledCalls() {
    const callsData = loadCalls();
    const now = new Date();
    let updated = false;

    for (const call of callsData.calls) {
        if (!call.completed && new Date(call.time) <= now) {
            try {
                await twilioClient.calls.create({
                    url: `${APP_URL}/twiml/ask`,
                    to: call.phone,
                    from: TWILIO_PHONE_NUMBER
                });
                call.completed = true;
                call.completed_at = new Date().toISOString();
                console.log(`Call made to ${call.name} (${call.phone})`);
                updated = true;
            } catch (err) {
                console.error('Error making call with Twilio:', err);
            }
        }
    }
    if (updated) saveCalls(callsData);
}

processScheduledCalls(); 