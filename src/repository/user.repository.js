import User from '../models/User.js';

/**
 * Find user by email
 * @param {string} email - User email
 * @param {Object} options - Query options
 * @param {boolean} options.includePassword - Include password field
 * @param {boolean} options.includeSensitive - Include NIC and DOB fields
 * @returns {Promise<Object|null>} User document or null
 */
export const findByEmail = async (email, options = {}) => {
    let query = User.findOne({ email });

    if (options.includePassword) {
        query = query.select('+password');
    }

    if (options.includeSensitive) {
        query = query.select('+nic +dob');
    }

    return await query;
};

/**
 * Find user by NIC
 * @param {string} nic - National Identity Card number
 * @returns {Promise<Object|null>} User document or null
 */
export const findByNIC = async (nic) => {
    return await User.findOne({ nic: nic.toUpperCase() });
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {boolean} options.includeSensitive - Include NIC and DOB fields
 * @param {boolean} options.activeOnly - Only find active users
 * @returns {Promise<Object|null>} User document or null
 */
export const findById = async (userId, options = {}) => {
    const filter = { _id: userId };

    if (options.activeOnly !== false) {
        filter.isActive = true;
    }

    let query = User.findOne(filter);

    if (options.includeSensitive) {
        query = query.select('+nic +dob');
    }

    return await query;
};

/**
 * Find all active users
 * @param {Object} options - Query options
 * @param {boolean} options.includeSensitive - Include NIC and DOB fields
 * @returns {Promise<Array>} Array of user documents
 */
export const findAllActive = async (options = {}) => {
    let query = User.find({ isActive: true });

    if (options.includeSensitive) {
        query = query.select('+nic +dob');
    }

    return await query;
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user document
 */
export const create = async (userData) => {
    return await User.create(userData);
};

/**
 * Update user by ID
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {Object} options - Update options
 * @param {boolean} options.activeOnly - Only update active users
 * @returns {Promise<Object|null>} Updated user document or null
 */
export const updateById = async (userId, updateData, options = {}) => {
    const filter = { _id: userId };

    if (options.activeOnly !== false) {
        filter.isActive = true;
    }

    return await User.findOneAndUpdate(
        filter,
        updateData,
        { new: true, runValidators: true }
    );
};

/**
 * Soft delete user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Updated user document or null
 */
export const softDeleteById = async (userId) => {
    return await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
    );
};

/**
 * Update last login timestamp
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Updated user document or null
 */
export const updateLastLogin = async (userId) => {
    return await User.findByIdAndUpdate(
        userId,
        { lastLoginAt: new Date() },
        { new: true }
    );
};

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists
 */
export const emailExists = async (email) => {
    const user = await User.findOne({ email });
    return !!user;
};

/**
 * Check if NIC exists
 * @param {string} nic - NIC to check
 * @returns {Promise<boolean>} True if NIC exists
 */
export const nicExists = async (nic) => {
    const user = await User.findOne({ nic: nic.toUpperCase() });
    return !!user;
};

/**
 * Find assignable users (role = USER) with optional search by name or email
 * @param {string} search - Optional search keyword
 * @param {number} limit - Max number of results (capped at 50)
 * @returns {Promise<Array>} Array of minimal user documents (_id, name, email)
 */
export const findAssignableUsers = async (search, limit = 10) => {
    const query = { role: 'USER', isActive: true };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    return await User.find(query)
        .select('_id name email')
        .limit(Math.min(parseInt(limit) || 10, 50));
};
