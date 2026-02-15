import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
                values: ['ADMIN', 'INVESTIGATOR', 'NGO'],
                message: '{VALUE} is not a valid role',
            },
            default: 'NGO',
        },
        phoneNumber: {
            type: String,
            trim: true,
            match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
        },
        organizationName: {
            type: String,
            required: function () {
                return this.role === 'NGO';
            },
            trim: true,
        },
        nic: {
            type: String,
            required: function () {
                return this.role === 'INVESTIGATOR';
            },
            unique: true,
            sparse: true, // Allow null values but enforce uniqueness when present
            trim: true,
            uppercase: true,
            select: false, // Don't include NIC in queries by default (sensitive data)
            validate: {
                validator: function (value) {
                    if (!value) return true; // Allow empty if not required
                    // Validate Sri Lankan NIC format (old or new)
                    return NIC_REGEX.OLD.test(value) || NIC_REGEX.NEW.test(value);
                },
                message: 'Invalid NIC format. Use old format (9 digits + V) or new format (12 digits)',
            },
        },
        dob: {
            type: Date,
            required: function () {
                return this.role === 'INVESTIGATOR';
            },
            select: false, // Don't include DOB in queries by default (sensitive data)
            validate: {
                validator: function (value) {
                    if (!value) return true;
                    // Ensure DOB is in the past
                    return value < new Date();
                },
                message: 'Date of birth must be in the past',
            },
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

// Indexes for performance and uniqueness
userSchema.index({ email: 1 });
userSchema.index({ nic: 1 }, { sparse: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to get user data with sensitive fields (admin only)
userSchema.methods.toAdminJSON = function () {
    const obj = this.toObject();

    // For admin view, show full NIC (unmasked) but still exclude password
    delete obj.password;

    return obj;
};

// Helper function to mask NIC
function maskNIC(nic) {
    if (!nic) return nic;

    const length = nic.length;

    if (length === 10) {
        // Old format: 123456789V -> 1234****9V
        return nic.substring(0, 4) + '****' + nic.substring(8);
    } else if (length === 12) {
        // New format: 199812345678 -> 1998******78
        return nic.substring(0, 4) + '******' + nic.substring(10);
    }

    // Fallback masking
    return nic.substring(0, 4) + '****' + nic.substring(length - 2);
}

const User = mongoose.model('User', userSchema);

export default User;
