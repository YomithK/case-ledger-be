import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema(
    {
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            required: [true, 'Case ID is required'],
        },
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
        },
        publicId: {
            type: String,
            required: [true, 'Cloudinary public ID is required'],
        },
        fileName: {
            type: String,
            trim: true,
        },
        fileType: {
            type: String,
            trim: true,
        },
        fileCategory: {
            type: String,
            enum: {
                values: ['PHOTO', 'VIDEO', 'DOCUMENT', 'AUDIO'],
                message: '{VALUE} is not a valid file category',
            },
        },
        fileSize: {
            type: Number,
        },
        description: {
            type: String,
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isConfidential: {
            type: Boolean,
            default: false,
        },
        accessLevel: {
            type: String,
            enum: {
                values: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
                message: '{VALUE} is not a valid access level',
            },
            default: 'INTERNAL',
        },
        relatedProgressId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CaseProgress',
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
evidenceSchema.index({ caseId: 1 });
evidenceSchema.index({ uploadedBy: 1 });
evidenceSchema.index({ createdAt: -1 });

const Evidence = mongoose.model('Evidence', evidenceSchema);

export default Evidence;
