import bcrypt from 'bcryptjs';

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} candidatePassword - Plain text password to compare
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
export const comparePassword = async (candidatePassword, hashedPassword) => {
    try {
        return await bcrypt.compare(candidatePassword, hashedPassword);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};
