import { sendSuccess, sendError } from '../../../utils/response.js';

describe('response utils', () => {
    let res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('sendSuccess', () => {
        it('should respond with success=true and provided data', () => {
            sendSuccess(res, 200, 'OK', { id: 1 });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'OK',
                data: { id: 1 },
            });
        });

        it('should default to status 200 and empty message when not provided', () => {
            sendSuccess(res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: true })
            );
        });

        it('should use provided status code 201', () => {
            sendSuccess(res, 201, 'Created');
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('sendError', () => {
        it('should respond with success=false and error message', () => {
            sendError(res, 400, 'Bad request');
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Bad request',
            });
        });

        it('should include errors field when provided', () => {
            sendError(res, 422, 'Validation failed', [{ field: 'email' }]);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: [{ field: 'email' }],
            });
        });

        it('should default to 500 status when not provided', () => {
            sendError(res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
