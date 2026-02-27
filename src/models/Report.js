import mongoose from 'mongoose';

const reportFilterSchema = new mongoose.Schema(
    {
        startDate: { type: Date },
        endDate: { type: Date },
        status: { type: [String], default: [] },
        priority: { type: [String], default: [] },
        category: { type: [String], default: [] },
        investigatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { _id: false }
);

const reportSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Report name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        reportType: {
            type: String,
            enum: {
                values: ['DASHBOARD', 'CASE_ANALYTICS', 'INVESTIGATOR', 'EVIDENCE', 'CUSTOM'],
                message: '{VALUE} is not a valid report type',
            },
            required: [true, 'Report type is required'],
        },
        filters: {
            type: reportFilterSchema,
            default: () => ({}),
        },
        groupBy: {
            type: String,
            trim: true,
        },
        sortBy: {
            type: String,
            trim: true,
        },
        sortOrder: {
            type: String,
            enum: {
                values: ['ASC', 'DESC'],
                message: '{VALUE} is not a valid sort order',
            },
            default: 'DESC',
        },
        isSystemGenerated: {
            type: Boolean,
            default: false,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Created by is required'],
        },
        lastGeneratedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
reportSchema.index({ createdBy: 1 });
reportSchema.index({ reportType: 1 });
reportSchema.index({ isArchived: 1 });
reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
