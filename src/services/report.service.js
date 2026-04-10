import mongoose from 'mongoose';
import Case from '../models/Case.js';
import Evidence from '../models/Evidence.js';
import User from '../models/User.js';
import * as reportRepository from '../repository/report.repository.js';
import * as agg from '../repository/report.aggregation.js';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Validate a MongoDB ObjectId string.
 */
const assertValidObjectId = (id, label = 'ID') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error(`Invalid ${label} format`);
        error.statusCode = 400;
        throw error;
    }
};

/**
 * Build analytics filters applying role-based scoping.
 * - NGO users can only see analytics for cases they reported (ngoId scoped).
 * - INVESTIGATOR users can only see analytics for cases assigned to them.
 * - ADMIN sees all.
 */
const buildScopedFilters = (rawFilters = {}, userId, role) => {
    const filters = { ...rawFilters };
    if (role === 'NGO') filters.ngoId = userId.toString();
    if (role === 'INVESTIGATOR') filters.investigatorId = userId.toString();
    return filters;
};

// ─────────────────────────────────────────────────────────────
// 1. DASHBOARD SUMMARY
// ─────────────────────────────────────────────────────────────

/**
 * Get overall system dashboard summary.
 * Access: ADMIN only.
 */
export const getDashboardSummary = async (userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can view the dashboard summary.');
        error.statusCode = 403;
        throw error;
    }

    // Run case aggregation + evidence/user counts in parallel
    const [caseResult, totalEvidence, totalInvestigators, totalNGOs, totalUsers] = await Promise.all([
        Case.aggregate(agg.getDashboardSummaryPipeline()),
        Evidence.countDocuments({ isArchived: false }),
        User.countDocuments({ role: 'INVESTIGATOR', isActive: true }),
        User.countDocuments({ role: 'NGO', isActive: true }),
        User.countDocuments({ isActive: true }),
    ]);

    // Flatten status breakdown for scalar fields
    const caseData = caseResult[0] ?? {};
    const statusBreakdown = (caseData.statusBreakdown || []).reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
    }, {});

    // Expose pie-chart-friendly arrays
    const casesByStatus = (caseData.statusBreakdown || []).map((item) => ({
        status: item._id,
        count: item.count,
    }));

    const casesByPriority = (caseData.priorityBreakdown || []).map((item) => ({
        priority: item._id,
        count: item.count,
    }));

    return {
        totalCases: caseData.totalCases ?? 0,
        activeCases: (statusBreakdown['REPORTED'] ?? 0) +
            (statusBreakdown['UNDER_INVESTIGATION'] ?? 0) +
            (statusBreakdown['EVIDENCE_COLLECTED'] ?? 0),
        closedCases: (statusBreakdown['CLOSED'] ?? 0) +
            (statusBreakdown['RESOLVED'] ?? 0),
        rejectedCases: statusBreakdown['REJECTED'] ?? 0,
        totalEvidence,
        totalInvestigators,
        totalNGOs,
        totalUsers,
        casesByStatus,
        casesByPriority,
    };
};

// ─────────────────────────────────────────────────────────────
// 2. CASE ANALYTICS
// ─────────────────────────────────────────────────────────────

export const getCasesByStatus = async (rawFilters, userId, role) => {
    if (role === 'INVESTIGATOR') {
        const error = new Error('Access forbidden. Investigators cannot access case analytics.');
        error.statusCode = 403;
        throw error;
    }
    const filters = buildScopedFilters(rawFilters, userId, role);
    return await Case.aggregate(agg.getCasesByStatusPipeline(filters));
};

export const getCasesByPriority = async (rawFilters, userId, role) => {
    if (role === 'INVESTIGATOR') {
        const error = new Error('Access forbidden. Investigators cannot access case analytics.');
        error.statusCode = 403;
        throw error;
    }
    const filters = buildScopedFilters(rawFilters, userId, role);
    return await Case.aggregate(agg.getCasesByPriorityPipeline(filters));
};

export const getCasesByCategory = async (rawFilters, userId, role) => {
    if (role === 'INVESTIGATOR') {
        const error = new Error('Access forbidden. Investigators cannot access case analytics.');
        error.statusCode = 403;
        throw error;
    }
    const filters = buildScopedFilters(rawFilters, userId, role);
    return await Case.aggregate(agg.getCasesByCategoryPipeline(filters));
};

export const getCasesMonthly = async (rawFilters, userId, role, year) => {
    if (role === 'INVESTIGATOR') {
        const error = new Error('Access forbidden. Investigators cannot access case analytics.');
        error.statusCode = 403;
        throw error;
    }
    const filters = buildScopedFilters(rawFilters, userId, role);
    return await Case.aggregate(agg.getCasesMonthlyPipeline(filters, year));
};

export const getCasesYearly = async (rawFilters, userId, role) => {
    if (role === 'INVESTIGATOR') {
        const error = new Error('Access forbidden. Investigators cannot access case analytics.');
        error.statusCode = 403;
        throw error;
    }
    const filters = buildScopedFilters(rawFilters, userId, role);
    return await Case.aggregate(agg.getCasesYearlyPipeline(filters));
};

// ─────────────────────────────────────────────────────────────
// 3. RESOLUTION ANALYTICS
// ─────────────────────────────────────────────────────────────

export const getAverageResolutionTime = async (rawFilters, userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can view resolution analytics.');
        error.statusCode = 403;
        throw error;
    }
    const result = await Case.aggregate(agg.getAvgResolutionTimePipeline(rawFilters));
    return result[0] ?? {
        avgResolutionTimeDays: null,
        minResolutionTimeDays: null,
        maxResolutionTimeDays: null,
        totalResolvedCases: 0,
    };
};

export const getLongestOpenCases = async (rawFilters, userId, role, limit) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can view resolution analytics.');
        error.statusCode = 403;
        throw error;
    }
    return await Case.aggregate(agg.getLongestOpenCasesPipeline(rawFilters, limit));
};

// ─────────────────────────────────────────────────────────────
// 4. INVESTIGATOR PERFORMANCE
// ─────────────────────────────────────────────────────────────

/**
 * Get performance metrics for a specific investigator.
 * - ADMIN: can view any investigator
 * - INVESTIGATOR: can only view own stats
 * - NGO: forbidden
 */
export const getInvestigatorPerformance = async (targetInvestigatorId, userId, role) => {
    if (role === 'NGO') {
        const error = new Error('Access forbidden. NGO users cannot view investigator performance.');
        error.statusCode = 403;
        throw error;
    }

    assertValidObjectId(targetInvestigatorId, 'investigator ID');

    if (role === 'INVESTIGATOR' && userId.toString() !== targetInvestigatorId) {
        const error = new Error('Access forbidden. You can only view your own performance metrics.');
        error.statusCode = 403;
        throw error;
    }

    // Verify investigator exists and has correct role
    const investigator = await User.findOne({
        _id: targetInvestigatorId,
        role: 'INVESTIGATOR',
        isActive: true,
    }).select('name email');

    if (!investigator) {
        const error = new Error('Investigator not found');
        error.statusCode = 404;
        throw error;
    }

    const result = await Case.aggregate(
        agg.getInvestigatorPerformancePipeline(targetInvestigatorId)
    );
    const metrics = result[0] ?? {
        totalAssigned: 0,
        activeCases: 0,
        closedCases: 0,
        avgResolutionTimeDays: null,
    };

    return {
        investigator: { id: investigator._id, name: investigator.name, email: investigator.email },
        ...metrics,
    };
};

// ─────────────────────────────────────────────────────────────
// 5. EVIDENCE ANALYTICS
// ─────────────────────────────────────────────────────────────

export const getEvidenceDistribution = async (userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can view evidence analytics.');
        error.statusCode = 403;
        throw error;
    }
    return await Evidence.aggregate(agg.getEvidenceDistributionPipeline());
};

export const getEvidenceVerificationRatio = async (userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can view evidence analytics.');
        error.statusCode = 403;
        throw error;
    }
    const result = await Evidence.aggregate(agg.getEvidenceVerificationRatioPipeline());
    return result[0] ?? { total: 0, verified: 0, unverified: 0, verificationRate: 0 };
};

// ─────────────────────────────────────────────────────────────
// 6. SAVED REPORT CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Execute the relevant analytics queries for a report type and return a data snapshot.
 */
const generateReportData = async (reportType, filters = {}, userId, role) => {
    switch (reportType) {
        case 'DASHBOARD': {
            const [caseResult, totalEvidence, totalInvestigators, totalNGOs, totalUsers] = await Promise.all([
                Case.aggregate(agg.getDashboardSummaryPipeline()),
                Evidence.countDocuments({ isArchived: false }),
                User.countDocuments({ role: 'INVESTIGATOR', isActive: true }),
                User.countDocuments({ role: 'NGO', isActive: true }),
                User.countDocuments({ isActive: true }),
            ]);
            const caseData = caseResult[0] ?? {};
            const statusBreakdown = (caseData.statusBreakdown || []).reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});
            return {
                totalCases: caseData.totalCases ?? 0,
                activeCases: (statusBreakdown['REPORTED'] ?? 0) +
                    (statusBreakdown['UNDER_INVESTIGATION'] ?? 0) +
                    (statusBreakdown['EVIDENCE_COLLECTED'] ?? 0),
                closedCases: (statusBreakdown['CLOSED'] ?? 0) + (statusBreakdown['RESOLVED'] ?? 0),
                rejectedCases: statusBreakdown['REJECTED'] ?? 0,
                totalEvidence,
                totalInvestigators,
                totalNGOs,
                totalUsers,
                casesByStatus: (caseData.statusBreakdown || []).map((i) => ({ status: i._id, count: i.count })),
                casesByPriority: (caseData.priorityBreakdown || []).map((i) => ({ priority: i._id, count: i.count })),
            };
        }
        case 'CASE_ANALYTICS': {
            const scopedFilters = buildScopedFilters(filters, userId, role);
            const [byStatus, byPriority, byCategory] = await Promise.all([
                Case.aggregate(agg.getCasesByStatusPipeline(scopedFilters)),
                Case.aggregate(agg.getCasesByPriorityPipeline(scopedFilters)),
                Case.aggregate(agg.getCasesByCategoryPipeline(scopedFilters)),
            ]);
            return { byStatus, byPriority, byCategory };
        }
        case 'EVIDENCE': {
            const [distribution, verificationRatio] = await Promise.all([
                Evidence.aggregate(agg.getEvidenceDistributionPipeline()),
                Evidence.aggregate(agg.getEvidenceVerificationRatioPipeline()),
            ]);
            return {
                distribution,
                verificationRatio: verificationRatio[0] ?? { total: 0, verified: 0, unverified: 0, verificationRate: 0 },
            };
        }
        case 'CUSTOM': {
            const scopedFilters = buildScopedFilters(filters, userId, role);
            const [byStatus, byPriority] = await Promise.all([
                Case.aggregate(agg.getCasesByStatusPipeline(scopedFilters)),
                Case.aggregate(agg.getCasesByPriorityPipeline(scopedFilters)),
            ]);
            return { byStatus, byPriority };
        }
        default:
            return null;
    }
};

export const createReport = async (reportData, userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can create saved reports.');
        error.statusCode = 403;
        throw error;
    }

    const snapshot = await generateReportData(reportData.reportType, reportData.filters || {}, userId, role);
    const data = {
        ...reportData,
        createdBy: userId,
        reportData: snapshot,
        generatedAt: new Date(),
    };
    return await reportRepository.create(data);
};

export const getReports = async (rawFilters, pagination, userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can list saved reports.');
        error.statusCode = 403;
        throw error;
    }

    const [reports, totalCount] = await Promise.all([
        reportRepository.findAll(rawFilters, pagination),
        reportRepository.countReports(rawFilters),
    ]);

    const page = parseInt(pagination?.page) || 1;
    const limit = parseInt(pagination?.limit) || 10;

    return {
        reports,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPrevPage: page > 1,
        },
    };
};

export const getReportById = async (reportId, userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can view saved reports.');
        error.statusCode = 403;
        throw error;
    }

    assertValidObjectId(reportId, 'report ID');

    const report = await reportRepository.findById(reportId);
    if (!report) {
        const error = new Error('Report not found');
        error.statusCode = 404;
        throw error;
    }
    return report;
};

export const updateReport = async (reportId, updateData, userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can update saved reports.');
        error.statusCode = 403;
        throw error;
    }

    assertValidObjectId(reportId, 'report ID');

    // Prevent overriding protected fields
    const { createdBy, isArchived, isSystemGenerated, ...safeData } = updateData;

    const updated = await reportRepository.updateById(reportId, safeData);
    if (!updated) {
        const error = new Error('Report not found');
        error.statusCode = 404;
        throw error;
    }
    return updated;
};

// ─────────────────────────────────────────────────────────────
// 7. CSV DOWNLOAD
// ─────────────────────────────────────────────────────────────

/**
 * Build a filter object for the Case model based on query params.
 */
const buildCaseFilter = (rawFilters = {}, userId, role) => {
    const match = { isArchived: false };

    if (role === 'NGO') match.reportedBy = new mongoose.Types.ObjectId(userId);
    if (role === 'INVESTIGATOR') match.assignedInvestigator = new mongoose.Types.ObjectId(userId);

    if (rawFilters.status) {
        const statuses = Array.isArray(rawFilters.status) ? rawFilters.status : rawFilters.status.split(',');
        match.status = { $in: statuses };
    }
    if (rawFilters.priority) {
        const priorities = Array.isArray(rawFilters.priority) ? rawFilters.priority : rawFilters.priority.split(',');
        match.priority = { $in: priorities };
    }
    if (rawFilters.category) {
        const categories = Array.isArray(rawFilters.category) ? rawFilters.category : rawFilters.category.split(',');
        match.category = { $in: categories };
    }
    if (rawFilters.startDate || rawFilters.endDate) {
        match.createdAt = {};
        if (rawFilters.startDate) match.createdAt.$gte = new Date(rawFilters.startDate);
        if (rawFilters.endDate) match.createdAt.$lte = new Date(rawFilters.endDate);
    }

    return match;
};

const escapeCsvField = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
};

export const downloadCasesCsv = async (rawFilters, userId, role) => {
    if (role !== 'ADMIN' && role !== 'NGO') {
        const error = new Error('Access forbidden. Only administrators and NGO users can download reports.');
        error.statusCode = 403;
        throw error;
    }

    const filter = buildCaseFilter(rawFilters, userId, role);

    const cases = await Case.find(filter)
        .populate('reportedBy', 'name email')
        .populate('assignedInvestigator', 'name email')
        .sort({ createdAt: -1 })
        .limit(5000)
        .lean();

    const headers = [
        'Case Number', 'Title', 'Status', 'Priority', 'Category',
        'Location', 'Incident Date', 'Reported By', 'Assigned Investigator',
        'Confidential Level', 'Created At',
    ];

    const rows = cases.map((c) => [
        c.caseNumber,
        c.title,
        c.status,
        c.priority,
        c.category,
        c.location || '',
        c.incidentDate ? new Date(c.incidentDate).toISOString().split('T')[0] : '',
        c.reportedBy?.name || '',
        c.assignedInvestigator?.name || '',
        c.confidentialLevel,
        new Date(c.createdAt).toISOString().split('T')[0],
    ]);

    const csvLines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
    return csvLines.join('\n');
};

/**
 * Download a saved report as CSV using its stored reportData snapshot.
 * Flattens whatever array entries exist in reportData into rows.
 */
export const downloadSavedReportCsv = async (reportId, userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can download saved reports.');
        error.statusCode = 403;
        throw error;
    }

    assertValidObjectId(reportId, 'report ID');

    const report = await reportRepository.findById(reportId);
    if (!report) {
        const error = new Error('Report not found');
        error.statusCode = 404;
        throw error;
    }

    const data = report.reportData;
    let rows = [];
    let headers = [];

    // Flatten data arrays from the snapshot into flat rows
    const buildRows = (arr, keyMap) => arr.map((item) => keyMap.map((k) => item[k] ?? ''));

    if (report.reportType === 'DASHBOARD') {
        headers = ['Metric', 'Value'];
        rows = Object.entries(data || {})
            .filter(([, v]) => !Array.isArray(v))
            .map(([k, v]) => [k, v]);
    } else if (data?.byStatus || data?.casesByStatus) {
        const byStatus = data.byStatus || data.casesByStatus || [];
        const byPriority = data.byPriority || data.casesByPriority || [];
        const byCategory = data.byCategory || [];
        headers = ['Breakdown', 'Key', 'Count'];
        byStatus.forEach((r) => rows.push(['Status', r.status || r._id, r.count]));
        byPriority.forEach((r) => rows.push(['Priority', r.priority || r._id, r.count]));
        byCategory.forEach((r) => rows.push(['Category', r.category || r._id, r.count]));
    } else if (data?.distribution) {
        headers = ['File Category', 'Count', 'Total Size (bytes)'];
        rows = (data.distribution || []).map((r) => [r._id || r.fileCategory, r.count, r.totalSize ?? '']);
    } else if (data?.investigator) {
        headers = ['Metric', 'Value'];
        rows = [
            ['Investigator', data.investigator?.name || ''],
            ['Total Assigned', data.totalAssigned ?? ''],
            ['Active Cases', data.activeCases ?? ''],
            ['Closed Cases', data.closedCases ?? ''],
            ['Avg Resolution Days', data.avgResolutionTimeDays ?? ''],
        ];
    } else {
        headers = ['Key', 'Value'];
        rows = Object.entries(data || {}).map(([k, v]) => [k, JSON.stringify(v)]);
    }

    const csvLines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
    return { csv: csvLines.join('\n'), name: report.name };
};

export const deleteReport = async (reportId, userId, role) => {
    if (role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only administrators can delete saved reports.');
        error.statusCode = 403;
        throw error;
    }

    assertValidObjectId(reportId, 'report ID');

    const report = await reportRepository.findById(reportId);
    if (!report) {
        const error = new Error('Report not found');
        error.statusCode = 404;
        throw error;
    }

    if (report.isSystemGenerated) {
        const error = new Error('System-generated reports cannot be deleted');
        error.statusCode = 400;
        throw error;
    }

    await reportRepository.softDeleteById(reportId);
    return { message: 'Report deleted successfully' };
};
