const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Create a new pool instance.
// If in production, it will use the DATABASE_URL from Render's environment variables.
// The ssl configuration is required for connecting to Render's databases.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

/**
 * Initializes the database by creating necessary tables if they don't already exist.
 * This ensures the application has the required structure to function correctly.
 */
const initializeDb = async () => {
  const client = await pool.connect();
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Create a generic key-value table for application settings like 'questions'.
    // This is simpler than creating a whole table for a single array of strings.
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_data (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL
      );
    `);

    // Ensure the 'questions' key exists with an empty array as a default.
    await client.query(`
      INSERT INTO app_data (key, value)
      VALUES ('questions', '[]'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);

    // Create the 'users' table to store user information.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ,
        credits INTEGER DEFAULT 0
      );
    `);

    // Create the 'calls' table to store scheduled and completed call information.
    // It references the 'users' table via a foreign key.
    await client.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        "time" TIMESTAMPTZ NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Create the 'responses' table to store user answers from Twilio calls.
    await client.query(`
      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        call_sid VARCHAR(255) UNIQUE NOT NULL,
        answers JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Commit the transaction
    await client.query('COMMIT');
    console.log('Database tables checked/created successfully.');

  } catch (err) {
    // Roll back the transaction in case of an error
    await client.query('ROLLBACK');
    console.error('Error initializing database tables:', err);
    throw err; // Rethrow the error to stop the application from starting
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initializeDb,
  // Helper function to query the database, simplifying other parts of the code.
  query: (text, params) => pool.query(text, params),
}; 