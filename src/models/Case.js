import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
    {
        caseNumber: {
            type: String,
            unique: true,
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        category: {
            type: String,
            enum: {
                values: [
                    'CUSTODIAL_VIOLENCE',
                    'DISCRIMINATION',
                    'UNLAWFUL_DETENTION',
                    'FREEDOM_OF_EXPRESSION',
                    'LABOR_RIGHTS',
                    'OTHER',
                ],
                message: '{VALUE} is not a valid category',
            },
            required: [true, 'Category is required'],
        },
        priority: {
            type: String,
            enum: {
                values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                message: '{VALUE} is not a valid priority',
            },
            default: 'MEDIUM',
        },
        status: {
            type: String,
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
            default: 'REPORTED',
        },
        incidentDate: {
            type: Date,
            required: [true, 'Incident date is required'],
            validate: {
                validator: function (value) {
                    // Incident date should not be in the future
                    return value <= new Date();
                },
                message: 'Incident date cannot be in the future',
            },
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Reported by is required'],
        },
        assignedInvestigator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedAt: {
            type: Date,
        },
        caseReferenceNumber: {
            type: String,
            trim: true,
        },
        confidentialLevel: {
            type: String,
            enum: {
                values: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
                message: '{VALUE} is not a valid confidential level',
            },
            default: 'INTERNAL',
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
caseSchema.index({ status: 1 });
caseSchema.index({ assignedInvestigator: 1 });
caseSchema.index({ createdAt: -1 });
caseSchema.index({ caseNumber: 1 }, { unique: true });
caseSchema.index({ reportedBy: 1 });

// Pre-validate hook to auto-generate case number BEFORE required field validation runs
caseSchema.pre('validate', async function (next) {
    if (!this.caseNumber) {
        // Generate case number: CASE-YYYYMMDD-XXXX
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // Find the last case number for today
        const lastCase = await this.constructor
            .findOne({
                caseNumber: new RegExp(`^CASE-${dateStr}-`),
            })
            .sort({ caseNumber: -1 })
            .select('caseNumber');

        let sequence = 1;
        if (lastCase) {
            // Extract sequence number from last case
            const lastSequence = parseInt(lastCase.caseNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }

        // Generate case number with 4-digit sequence
        this.caseNumber = `CASE-${dateStr}-${String(sequence).padStart(4, '0')}`;
    }
});

const Case = mongoose.model('Case', caseSchema);

export default Case;
