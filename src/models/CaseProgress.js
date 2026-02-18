import mongoose from 'mongoose';

const caseProgressSchema = new mongoose.Schema(
    {
        caseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            required: [true, 'Case ID is required'],
        },
        message: {
            type: String,
            required: [true, 'Progress message is required'],
            trim: true,
        },
        statusSnapshot: {
            type: String,
            required: [true, 'Status snapshot is required'],
            enum: {
                values: [
                    'REPORTED',
                    'UNDER_INVESTIGATION',
                    'EVIDENCE_COLLECTED',
                    'RESOLVED',
                    'CLOSED',
                    'REJECTED',
                ],
                message: '{VALUE} is not a valid status',
            },
        },
        files: {
            type: [String],
            default: [],
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Updated by is required'],
        },
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

// Indexes for performance
caseProgressSchema.index({ caseId: 1 });
caseProgressSchema.index({ createdAt: -1 }); // Supports chronological sorting (newest first)

const CaseProgress = mongoose.model('CaseProgress', caseProgressSchema);

export default CaseProgress;
