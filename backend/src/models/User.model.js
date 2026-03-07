import pool from '../config/database.js';

/**
 * User Model
 * Handles all database operations for users
 */

export class User {
  /**
   * Find user by ID
   * @param {string} id - User UUID
   * @returns {Promise<object|null>} User object or null
   */
  static async findById(id) {
    const result = await pool.query(
      `SELECT id, username, email, role, avatar_url, is_active, two_factor_enabled, created_at, updated_at, last_login
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<object|null>} User object or null
   */
  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<object|null>} User object or null
   */
  static async findByUsername(username) {
    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email or username
   * @param {string} emailOrUsername - Email or username
   * @returns {Promise<object|null>} User object or null
   */
  static async findByEmailOrUsername(emailOrUsername) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR username = $1`,
      [emailOrUsername]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user with password hash (for authentication)
   * @param {string} emailOrUsername - Email or username
   * @returns {Promise<object|null>} User object with password hash or null
   */
  static async findWithPassword(emailOrUsername) {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR username = $1`,
      [emailOrUsername]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new user
   * @param {object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email
   * @param {string} userData.password_hash - Hashed password
   * @param {string} userData.role - User role (default: 'user')
   * @returns {Promise<object>} Created user
   */
  static async create({ username, email, password_hash, role = 'user' }) {
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, avatar_url, is_active, created_at`,
      [username, email, password_hash, role]
    );
    return result.rows[0];
  }

  /**
   * Update user
   * @param {string} id - User UUID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated user
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['username', 'email', 'avatar_url', 'role', 'is_active'];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, role, avatar_url, is_active, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update user password
   * @param {string} id - User UUID
   * @param {string} password_hash - New password hash
   * @returns {Promise<object>} Updated user
   */
  static async updatePassword(id, password_hash) {
    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, email, updated_at`,
      [password_hash, id]
    );
    return result.rows[0];
  }

  /**
   * Update last login timestamp
   * @param {string} id - User UUID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(id) {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  /**
   * Delete user
   * @param {string} id - User UUID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if exists
   */
  static async emailExists(email) {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if username exists
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} True if exists
   */
  static async usernameExists(username) {
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    return result.rows.length > 0;
  }

  /**
   * Get user count
   * @returns {Promise<number>} Total number of users
   */
  static async count() {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count);
  }
}

export default User;
