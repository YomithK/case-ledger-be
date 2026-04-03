import * as userRepository from '../repository/user.repository.js';

/**
 * Get all users (admin only) with pagination and optional filters
 * Returns full NIC (unmasked) and DOB for admin users
 * @param {boolean} isAdmin - Whether the requester is an admin
 * @param {Object} filters - Optional filters
 * @param {boolean|undefined} filters.isActive - Filter by active status (undefined = all)
 * @param {string} filters.role - Filter by role
 * @param {string} filters.search - Search by name
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number
 * @param {number} pagination.limit - Items per page
 */
export const getAllUsers = async (isAdmin = false, filters = {}, pagination = {}) => {
    const options = { includeSensitive: isAdmin };

    const [users, totalCount] = await Promise.all([
        userRepository.findAll(filters, options, pagination),
        userRepository.countUsers(filters),
    ]);

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const totalPages = Math.ceil(totalCount / limit);

    // For admin, strip password from plain objects
    const result = isAdmin
        ? users.map((user) => {
            const userObj = user.toObject();
            delete userObj.password;
            return userObj;
        })
        : users;

    return {
        users: result,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

/**
 * Get user by ID
 * Admins get full access to sensitive fields
 */
export const getUserById = async (userId, isAdmin = false) => {
    // Find user by ID
    const user = await userRepository.findById(userId, {
        includeSensitive: isAdmin,
        activeOnly: true,
    });

    // Validate user exists
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // For admin, return unmasked data
    if (isAdmin) {
        const userObj = user.toObject();
        delete userObj.password; // Never return password
        return userObj;
    }

    return user;
};

/**
 * Update user profile (cannot update role, NIC, or DOB here)
 */
export const updateUser = async (userId, updateData) => {
    // Business Logic: Prevent updates to sensitive/protected fields through this method
    const { role, password, isActive, nic, dob, ...allowedUpdates } = updateData;

    // Update user
    const user = await userRepository.updateById(userId, allowedUpdates, {
        activeOnly: true,
    });

    // Validate user exists
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (userId, newRole) => {
    // Update user role
    const user = await userRepository.updateById(
        userId,
        { role: newRole },
        { activeOnly: true }
    );

    // Validate user exists
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};

/**
 * Soft delete user (admin only)
 */
export const deleteUser = async (userId) => {
    // Soft delete user
    const user = await userRepository.softDeleteById(userId);

    // Validate user exists
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return { message: 'User deleted successfully' };
};
