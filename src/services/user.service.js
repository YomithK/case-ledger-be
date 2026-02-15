import * as userRepository from '../repository/user.repository.js';

/**
 * Get all users (admin only)
 * Returns full NIC (unmasked) and DOB for admin users
 */
export const getAllUsers = async (isAdmin = false) => {
    // Fetch all active users
    const users = await userRepository.findAllActive({
        includeSensitive: isAdmin,
    });

    // For admin, return unmasked data
    if (isAdmin) {
        return users.map((user) => {
            const userObj = user.toObject();
            delete userObj.password; // Never return password
            return userObj;
        });
    }

    return users;
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
