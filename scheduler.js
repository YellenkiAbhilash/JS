require('dotenv').config();

const twilio = require('twilio');
const { query } = require('./db');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const APP_URL = process.env.APP_URL || 'https://js-egzv.onrender.com';
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function processScheduledCalls() {
    console.log('Scheduler running: Checking for due calls...');
    const now = new Date();

    try {
        const result = await query(
            'SELECT * FROM calls WHERE completed = FALSE AND "time" <= $1',
            [now]
        );
        const dueCalls = result.rows;

        if (dueCalls.length === 0) {
            console.log('No due calls found.');
            return;
        }

        for (const call of dueCalls) {
            try {
                await twilioClient.calls.create({
                    url: `${APP_URL}/twiml/ask`,
                    to: call.phone,
                    from: TWILIO_PHONE_NUMBER
                });
                
                await query(
                    'UPDATE calls SET completed = TRUE, completed_at = NOW() WHERE id = $1',
                    [call.id]
                );

                console.log(`Call successfully initiated for ${call.name} (${call.phone}) and marked as completed.`);

            } catch (err) {
                console.error(`Error processing call ID ${call.id} for ${call.phone}:`, err);
            }
        }
    } catch (dbError) {
        console.error('Database error in scheduler:', dbError);
    }
}

// Immediately invoke the function to run the scheduler task.
// When run as a Cron Job, this script will execute and then exit.
processScheduledCalls().then(() => {
    console.log('Scheduler finished.');
    // In a real cron job, you might want to explicitly close the pool if the script is short-lived.
    // However, for Render's cron jobs, letting the process exit is sufficient.
}).catch(err => {
    console.error('Scheduler failed to run:', err);
    process.exit(1);
}); 