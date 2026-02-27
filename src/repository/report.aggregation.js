import mongoose from 'mongoose';

/**
 * Build a base $match stage for cases from analytics filter options.
 * @param {Object} filters
 * @param {Date}   [filters.startDate]
 * @param {Date}   [filters.endDate]
 * @param {string[]} [filters.status]
 * @param {string[]} [filters.priority]
 * @param {string[]} [filters.category]
 * @param {string}   [filters.investigatorId]
 * @param {string}   [filters.ngoId]
 * @returns {Object} Mongo match object
 */
const buildCaseMatchFilter = (filters = {}) => {
    const match = { isArchived: false };

    if (filters.startDate || filters.endDate) {
        match.createdAt = {};
        if (filters.startDate) match.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) match.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.status?.length) match.status = { $in: filters.status };
    if (filters.priority?.length) match.priority = { $in: filters.priority };
    if (filters.category?.length) match.category = { $in: filters.category };

    if (filters.investigatorId) {
        match.assignedInvestigator = new mongoose.Types.ObjectId(filters.investigatorId);
    }

    if (filters.ngoId) {
        match.reportedBy = new mongoose.Types.ObjectId(filters.ngoId);
    }

    return match;
};

// 1. DASHBOARD SUMMARY

/**
 * Pipeline for the dashboard summary card.
 * Runs as a $facet across Cases, Evidence, and Users.
 * Execute against the Case collection; the other counts use $lookup.
 */
export const getDashboardSummaryPipeline = () => [
    { $match: { isArchived: false } },
    {
        $facet: {
            caseCounts: [
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ],
            totalCases: [
                { $count: 'count' },
            ],
        },
    },
    {
        $project: {
            totalCases: { $arrayElemAt: ['$totalCases.count', 0] },
            statusBreakdown: '$caseCounts',
        },
    },
];


// 2. CASE ANALYTICS

/**
 * Group cases by status.
 */
export const getCasesByStatusPipeline = (filters = {}) => [
    { $match: buildCaseMatchFilter(filters) },
    {
        $group: {
            _id: '$status',
            count: { $sum: 1 },
        },
    },
    {
        $project: {
            _id: 0,
            status: '$_id',
            count: 1,
        },
    },
    { $sort: { count: -1 } },
];

/**
 * Group cases by priority.
 */
export const getCasesByPriorityPipeline = (filters = {}) => [
    { $match: buildCaseMatchFilter(filters) },
    {
        $group: {
            _id: '$priority',
            count: { $sum: 1 },
        },
    },
    {
        $project: {
            _id: 0,
            priority: '$_id',
            count: 1,
        },
    },
    { $sort: { count: -1 } },
];

/**
 * Group cases by category.
 */
export const getCasesByCategoryPipeline = (filters = {}) => [
    { $match: buildCaseMatchFilter(filters) },
    {
        $group: {
            _id: '$category',
            count: { $sum: 1 },
        },
    },
    {
        $project: {
            _id: 0,
            category: '$_id',
            count: 1,
        },
    },
    { $sort: { count: -1 } },
];

/**
 * Monthly case trend (group by year + month).
 * @param {Object} filters - supports startDate, endDate, status, priority, category
 * @param {number} [year]  - optionally restrict to a single year
 */
export const getCasesMonthlyPipeline = (filters = {}, year) => {
    const match = buildCaseMatchFilter(filters);

    if (year) {
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const end = new Date(`${year}-12-31T23:59:59.999Z`);
        match.createdAt = match.createdAt ?? {};
        match.createdAt.$gte = start;
        match.createdAt.$lte = end;
    }

    return [
        { $match: match },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                count: 1,
            },
        },
        { $sort: { year: 1, month: 1 } },
    ];
};

/**
 * Yearly case trend.
 */
export const getCasesYearlyPipeline = (filters = {}) => [
    { $match: buildCaseMatchFilter(filters) },
    {
        $group: {
            _id: { year: { $year: '$createdAt' } },
            count: { $sum: 1 },
        },
    },
    {
        $project: {
            _id: 0,
            year: '$_id.year',
            count: 1,
        },
    },
    { $sort: { year: 1 } },
];

// 3. RESOLUTION ANALYTICS

/**
 * Average resolution time (in days) for RESOLVED or CLOSED cases.
 * Uses updatedAt as a proxy for resolvedAt/closedAt since the
 * Case schema does not store a dedicated resolvedAt field.
 */
export const getAvgResolutionTimePipeline = (filters = {}) => {
    const baseMatch = buildCaseMatchFilter(filters);
    const match = {
        ...baseMatch,
        status: { $in: ['RESOLVED', 'CLOSED'] },
    };

    return [
        { $match: match },
        {
            $project: {
                status: 1,
                resolutionTimeMs: {
                    $subtract: ['$updatedAt', '$createdAt'],
                },
            },
        },
        {
            $project: {
                status: 1,
                resolutionTimeDays: {
                    $divide: ['$resolutionTimeMs', 1000 * 60 * 60 * 24],
                },
            },
        },
        {
            $group: {
                _id: null,
                avgResolutionTimeDays: { $avg: '$resolutionTimeDays' },
                minResolutionTimeDays: { $min: '$resolutionTimeDays' },
                maxResolutionTimeDays: { $max: '$resolutionTimeDays' },
                totalResolvedCases: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                avgResolutionTimeDays: { $round: ['$avgResolutionTimeDays', 2] },
                minResolutionTimeDays: { $round: ['$minResolutionTimeDays', 2] },
                maxResolutionTimeDays: { $round: ['$maxResolutionTimeDays', 2] },
                totalResolvedCases: 1,
            },
        },
    ];
};

/**
 * Top N longest-running open cases (in days since creation).
 * @param {Object} filters
 * @param {number} [limit=10]
 */
export const getLongestOpenCasesPipeline = (filters = {}, limit = 10) => {
    const baseMatch = buildCaseMatchFilter(filters);
    // Exclude terminal statuses
    const match = {
        ...baseMatch,
        status: { $nin: ['RESOLVED', 'CLOSED', 'REJECTED'] },
    };

    return [
        { $match: match },
        {
            $project: {
                caseNumber: 1,
                title: 1,
                status: 1,
                priority: 1,
                category: 1,
                createdAt: 1,
                openDays: {
                    $divide: [
                        { $subtract: [new Date(), '$createdAt'] },
                        1000 * 60 * 60 * 24,
                    ],
                },
            },
        },
        { $sort: { openDays: -1 } },
        { $limit: limit },
        {
            $project: {
                caseNumber: 1,
                title: 1,
                status: 1,
                priority: 1,
                category: 1,
                createdAt: 1,
                openDays: { $round: ['$openDays', 0] },
            },
        },
    ];
};

// 4. INVESTIGATOR PERFORMANCE

/**
 * Investigator performance metrics for a specific investigator.
 * @param {string} investigatorId - ObjectId string
 */
export const getInvestigatorPerformancePipeline = (investigatorId) => {
    const investigatorOID = new mongoose.Types.ObjectId(investigatorId);

    return [
        {
            $match: {
                assignedInvestigator: investigatorOID,
                isArchived: false,
            },
        },
        {
            $facet: {
                totalAssigned: [
                    { $count: 'count' },
                ],
                activeCases: [
                    {
                        $match: {
                            status: {
                                $in: ['REPORTED', 'UNDER_INVESTIGATION', 'EVIDENCE_COLLECTED'],
                            },
                        },
                    },
                    { $count: 'count' },
                ],
                closedCases: [
                    {
                        $match: { status: { $in: ['RESOLVED', 'CLOSED'] } },
                    },
                    { $count: 'count' },
                ],
                avgResolutionTime: [
                    {
                        $match: { status: { $in: ['RESOLVED', 'CLOSED'] } },
                    },
                    {
                        $project: {
                            resolutionTimeDays: {
                                $divide: [
                                    { $subtract: ['$updatedAt', '$createdAt'] },
                                    1000 * 60 * 60 * 24,
                                ],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            avgDays: { $avg: '$resolutionTimeDays' },
                        },
                    },
                ],
            },
        },
        {
            $project: {
                totalAssigned: { $arrayElemAt: ['$totalAssigned.count', 0] },
                activeCases: { $arrayElemAt: ['$activeCases.count', 0] },
                closedCases: { $arrayElemAt: ['$closedCases.count', 0] },
                avgResolutionTimeDays: {
                    $round: [{ $arrayElemAt: ['$avgResolutionTime.avgDays', 0] }, 2],
                },
            },
        },
    ];
};

// 5. EVIDENCE ANALYTICS

/**
 * Evidence count by file category.
 */
export const getEvidenceDistributionPipeline = () => [
    { $match: { isArchived: false } },
    {
        $group: {
            _id: '$fileCategory',
            count: { $sum: 1 },
        },
    },
    {
        $project: {
            _id: 0,
            fileCategory: '$_id',
            count: 1,
        },
    },
    { $sort: { count: -1 } },
];

/**
 * Evidence verification ratio.
 * Returns total, verified, unverified counts, and verificationRate (0-100%).
 */
export const getEvidenceVerificationRatioPipeline = () => [
    { $match: { isArchived: false } },
    {
        $group: {
            _id: null,
            total: { $sum: 1 },
            verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
            unverified: { $sum: { $cond: ['$isVerified', 0, 1] } },
        },
    },
    {
        $project: {
            _id: 0,
            total: 1,
            verified: 1,
            unverified: 1,
            verificationRate: {
                $round: [
                    {
                        $multiply: [
                            { $divide: ['$verified', { $max: ['$total', 1] }] },
                            100,
                        ],
                    },
                    2,
                ],
            },
        },
    },
];
