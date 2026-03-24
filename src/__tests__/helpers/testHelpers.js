import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import Case from '../../models/Case.js';
import CaseProgress from '../../models/CaseProgress.js';
import Evidence from '../../models/Evidence.js';
import { hashPassword } from '../../utils/password.utils.js';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only';

/**
 * Generate a JWT token for testing
 */
export const generateToken = (userId, role, email) => {
    return jwt.sign(
        { userId, role, email },
        TEST_JWT_SECRET,
        { expiresIn: '1d' }
    );
};

/**
 * Create an ADMIN user in the database
 */
export const createAdminUser = async (overrides = {}) => {
    const hashedPassword = await hashPassword('Admin@1234');
    const user = await User.create({
        name: 'Test Admin',
        email: `admin_${Date.now()}@test.com`,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        ...overrides,
    });
    return user;
};

/**
 * Create an NGO user in the database
 */
export const createNGOUser = async (overrides = {}) => {
    const hashedPassword = await hashPassword('NGO@12345');
    const user = await User.create({
        name: 'Test NGO',
        email: `ngo_${Date.now()}@test.com`,
        password: hashedPassword,
        role: 'NGO',
        organizationName: 'Test NGO Organization',
        isActive: true,
        ...overrides,
    });
    return user;
};

/**
 * Create an INVESTIGATOR user in the database
 */
export const createInvestigatorUser = async (overrides = {}) => {
    const hashedPassword = await hashPassword('Invest@1234');
    const user = await User.create({
        name: 'Test Investigator',
        email: `investigator_${Date.now()}@test.com`,
        password: hashedPassword,
        role: 'INVESTIGATOR',
        nic: `${String(Date.now()).slice(-9)}V`,
        dob: new Date('1990-01-01'),
        isActive: true,
        ...overrides,
    });
    return user;
};

/**
 * Create a Case in the database
 */
export const createCase = async (reportedBy, overrides = {}) => {
    const caseDoc = await Case.create({
        title: 'Test Case',
        description: 'Test case description',
        category: 'OTHER',
        priority: 'MEDIUM',
        status: 'REPORTED',
        incidentDate: new Date('2025-01-01'),
        location: 'Colombo, Sri Lanka',
        reportedBy,
        ...overrides,
    });
    return caseDoc;
};

/**
 * Create a CaseProgress entry in the database
 */
export const createProgressEntry = async (caseId, updatedBy, overrides = {}) => {
    return await CaseProgress.create({
        caseId,
        message: 'Test progress update',
        statusSnapshot: 'UNDER_INVESTIGATION',
        files: [],
        updatedBy,
        ...overrides,
    });
};

/**
 * Create an Evidence document in the database
 */
export const createEvidence = async (caseId, uploadedBy, overrides = {}) => {
    return await Evidence.create({
        caseId,
        fileUrl: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        publicId: `test/evidence_${Date.now()}`,
        fileName: 'test-photo.jpg',
        fileType: 'image/jpeg',
        fileCategory: 'PHOTO',
        fileSize: 102400,
        description: 'Test evidence photo',
        accessLevel: 'INTERNAL',
        uploadedBy,
        isVerified: false,
        isArchived: false,
        ...overrides,
    });
};

/**
 * Get auth header for a user
 */
export const authHeader = (userId, role, email) => ({
    Authorization: `Bearer ${generateToken(userId, role, email)}`,
});
