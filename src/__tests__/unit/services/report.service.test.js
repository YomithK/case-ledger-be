// Mock mongoose models and repositories used by report service
jest.mock('../../../models/Case.js', () => ({
    __esModule: true,
    default: {
        aggregate: jest.fn(),
        countDocuments: jest.fn(),
        findOne: jest.fn(),
    },
}));
jest.mock('../../../models/Evidence.js', () => ({
    __esModule: true,
    default: {
        aggregate: jest.fn(),
        countDocuments: jest.fn(),
    },
}));
jest.mock('../../../models/User.js', () => ({
    __esModule: true,
    default: {
        countDocuments: jest.fn(),
        findOne: jest.fn(),
    },
}));
jest.mock('../../../repository/report.repository.js');

import * as reportService from '../../../services/report.service.js';
import Case from '../../../models/Case.js';
import Evidence from '../../../models/Evidence.js';
import User from '../../../models/User.js';
import * as reportRepository from '../../../repository/report.repository.js';
import mongoose from 'mongoose';

const adminId = new mongoose.Types.ObjectId();
const ngoId = new mongoose.Types.ObjectId();
const investigatorId = new mongoose.Types.ObjectId();
const reportId = new mongoose.Types.ObjectId();

describe('report service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getDashboardSummary', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(reportService.getDashboardSummary(ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should return summary stats for ADMIN', async () => {
            Case.aggregate.mockResolvedValue([{
                totalCases: 10,
                statusBreakdown: [
                    { _id: 'REPORTED', count: 3 },
                    { _id: 'UNDER_INVESTIGATION', count: 4 },
                    { _id: 'CLOSED', count: 2 },
                    { _id: 'REJECTED', count: 1 },
                ],
                priorityBreakdown: [
                    { _id: 'HIGH', count: 5 },
                    { _id: 'LOW', count: 5 },
                ],
            }]);
            Evidence.countDocuments.mockResolvedValue(25);
            // Now called 3 times: totalInvestigators, totalNGOs, totalUsers
            User.countDocuments
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(8)
                .mockResolvedValueOnce(15);

            const result = await reportService.getDashboardSummary(adminId, 'ADMIN');

            expect(result).toHaveProperty('totalCases', 10);
            expect(result).toHaveProperty('totalEvidence', 25);
            expect(result).toHaveProperty('totalInvestigators', 5);
            expect(result).toHaveProperty('totalNGOs', 8);
            expect(result).toHaveProperty('totalUsers', 15);
            expect(Array.isArray(result.casesByStatus)).toBe(true);
            expect(Array.isArray(result.casesByPriority)).toBe(true);
            expect(result.casesByStatus[0]).toHaveProperty('status');
            expect(result.casesByPriority[0]).toHaveProperty('priority');
        });
    });

    describe('getCasesByStatus', () => {
        it('should throw 403 for INVESTIGATOR', async () => {
            await expect(reportService.getCasesByStatus({}, investigatorId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should return status breakdown for ADMIN', async () => {
            Case.aggregate.mockResolvedValue([
                { _id: 'REPORTED', count: 5 },
                { _id: 'CLOSED', count: 3 },
            ]);

            const result = await reportService.getCasesByStatus({}, adminId, 'ADMIN');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getCasesByPriority', () => {
        it('should throw 403 for INVESTIGATOR', async () => {
            await expect(reportService.getCasesByPriority({}, investigatorId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should return priority breakdown for NGO', async () => {
            Case.aggregate.mockResolvedValue([{ _id: 'HIGH', count: 2 }]);
            const result = await reportService.getCasesByPriority({}, ngoId, 'NGO');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getAverageResolutionTime', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(reportService.getAverageResolutionTime({}, ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should return resolution stats for ADMIN', async () => {
            Case.aggregate.mockResolvedValue([{ avgResolutionTimeDays: 7, totalResolvedCases: 3 }]);
            const result = await reportService.getAverageResolutionTime({}, adminId, 'ADMIN');
            expect(result).toHaveProperty('avgResolutionTimeDays');
        });
    });

    describe('getInvestigatorPerformance', () => {
        it('should throw 403 for NGO', async () => {
            await expect(reportService.getInvestigatorPerformance(investigatorId.toString(), ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 403 for investigator viewing another\'s metrics', async () => {
            const otherId = new mongoose.Types.ObjectId();
            await expect(reportService.getInvestigatorPerformance(otherId.toString(), investigatorId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should return performance for ADMIN', async () => {
            const mockInvestigatorDoc = { _id: investigatorId, name: 'Inv', email: 'inv@test.com' };
            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockInvestigatorDoc),
            });
            Case.aggregate.mockResolvedValue([{ totalAssigned: 5, activeCases: 2, closedCases: 3 }]);

            const result = await reportService.getInvestigatorPerformance(investigatorId.toString(), adminId, 'ADMIN');
            expect(result).toHaveProperty('investigator');
            expect(result).toHaveProperty('totalAssigned');
        });
    });

    describe('createReport', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(reportService.createReport({}, ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should create report with reportData snapshot for ADMIN', async () => {
            // Mock data needed by generateReportData for CASE_ANALYTICS type
            Case.aggregate.mockResolvedValue([]);
            const mockReport = { _id: reportId, name: 'Test Report', reportType: 'CASE_ANALYTICS', reportData: { byStatus: [] } };
            reportRepository.create.mockResolvedValue(mockReport);

            const result = await reportService.createReport(
                { name: 'Test Report', reportType: 'CASE_ANALYTICS' }, adminId, 'ADMIN'
            );

            expect(result).toHaveProperty('name', 'Test Report');
            // Verify create was called with reportData and generatedAt
            const createArg = reportRepository.create.mock.calls[0][0];
            expect(createArg).toHaveProperty('reportData');
            expect(createArg).toHaveProperty('generatedAt');
        });
    });

    describe('getReports', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(reportService.getReports({}, {}, ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should return paginated reports for ADMIN', async () => {
            reportRepository.findAll.mockResolvedValue([]);
            reportRepository.countReports.mockResolvedValue(0);

            const result = await reportService.getReports({}, {}, adminId, 'ADMIN');
            expect(result).toHaveProperty('reports');
            expect(result).toHaveProperty('pagination');
        });
    });

    describe('deleteReport', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(reportService.deleteReport(reportId.toString(), ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 404 when report not found', async () => {
            reportRepository.findById.mockResolvedValue(null);
            await expect(reportService.deleteReport(reportId.toString(), adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should soft-delete report for ADMIN', async () => {
            reportRepository.findById.mockResolvedValue({ _id: reportId, isSystemGenerated: false });
            reportRepository.softDeleteById.mockResolvedValue({});

            const result = await reportService.deleteReport(reportId.toString(), adminId, 'ADMIN');
            expect(result.message).toMatch(/deleted/i);
        });
    });
});
