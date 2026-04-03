import mongoose from 'mongoose';
import { maskNIC } from '../utils/nic.utils.js';

// Sri Lankan NIC validation regex
const NIC_REGEX = {
    OLD: /^[0-9]{9}[vVxX]$/,  // Old format: 9 digits + V/X
    NEW: /^[0-9]{12}$/,         // New format: 12 digits
};

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters long'],
            select: false, // Don't include password in queries by default
        },
        role: {
            type: String,
            enum: {
                values: ['ADMIN', 'INVESTIGATOR', 'NGO', 'VICTIM'],
                message: '{VALUE} is not a valid role',
            },
            default: 'NGO',
        },
        profilePhoto: {
            type: String,
            trim: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
            match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
        },
        organizationName: {
            type: String,
            trim: true,
            validate: {
                validator: function (value) {
                    // If role is NGO, organizationName is required
                    if (this.role === 'NGO') {
                        return value && value.trim().length > 0;
                    }
                    // For other roles, organizationName is optional
                    return true;
                },
                message: 'Organization name is required for NGO users',
            },
        },
        nic: {
            type: String,
            unique: true,
            sparse: true, // Allow null values but enforce uniqueness when present
            trim: true,
            uppercase: true,
            select: false, // Don't include NIC in queries by default (sensitive data)
            validate: [
                {
                    validator: function (value) {
                        // If role is INVESTIGATOR, NIC is required
                        if (this.role === 'INVESTIGATOR') {
                            return value && value.trim().length > 0;
                        }
                        // For other roles, NIC is optional
                        return true;
                    },
                    message: 'NIC is required for INVESTIGATOR users',
                },
                {
                    validator: function (value) {
                        if (!value) return true; // Allow empty if not required
                        // Validate Sri Lankan NIC format (old or new)
                        return NIC_REGEX.OLD.test(value) || NIC_REGEX.NEW.test(value);
                    },
                    message: 'Invalid NIC format. Use old format (9 digits + V) or new format (12 digits)',
                },
            ],
        },
        dob: {
            type: Date,
            select: false, // Don't include DOB in queries by default (sensitive data)
            validate: [
                {
                    validator: function (value) {
                        // If role is INVESTIGATOR, DOB is required
                        if (this.role === 'INVESTIGATOR') {
                            return value != null;
                        }
                        // For other roles, DOB is optional
                        return true;
                    },
                    message: 'Date of birth is required for INVESTIGATOR users',
                },
                {
                    validator: function (value) {
                        if (!value) return true;
                        // Ensure DOB is in the past
                        return value < new Date();
                    },
                    message: 'Date of birth must be in the past',
                },
            ],
        },
        lastLoginAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                // Remove sensitive fields from JSON responses
                delete ret.password;

                // Mask NIC if present (show first 4 and last 2 characters)
                if (ret.nic) {
                    ret.nic = maskNIC(ret.nic);
                }

                // Remove DOB from public responses (can be included explicitly if needed)
                if (ret.dob) {
                    delete ret.dob;
                }

                return ret;
            },
        },
        toObject: {
            transform: function (doc, ret) {
                // Same masking for toObject
                delete ret.password;

                if (ret.nic) {
                    ret.nic = maskNIC(ret.nic);
                }

                if (ret.dob) {
                    delete ret.dob;
                }

                return ret;
            },
        },
    }
);

const User = mongoose.model('User', userSchema);

export default User;
