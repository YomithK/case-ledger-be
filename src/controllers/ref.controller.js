import asyncHandler from 'express-async-handler';
import * as userRepository from '../repository/user.repository.js';
import { sendSuccess } from '../utils/response.js';

/**
 * @route   GET /api/v1/ref/assignable-users
 * @desc    Search for users with role USER (for linking to cases as relatedUsers)
 * @access  ADMIN, NGO, INVESTIGATOR
 * @query   search - Optional keyword to filter by name or email
 * @query   limit  - Max results (default 10, capped at 50)
 */
export const getAssignableUsers = asyncHandler(async (req, res) => {
    const { search, limit } = req.query;

    const users = await userRepository.findAssignableUsers(search, limit);

    sendSuccess(res, 200, 'Assignable users retrieved successfully', { count: users.length, users });
});
