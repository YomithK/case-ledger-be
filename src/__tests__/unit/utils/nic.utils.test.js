import { maskNIC } from '../../../utils/nic.utils.js';

describe('nic utils', () => {
    describe('maskNIC', () => {
        it('should mask old format NIC (10 chars: 9 digits + V)', () => {
            const result = maskNIC('123456789V');
            expect(result).toBe('1234****9V');
        });

        it('should mask old format NIC with lowercase v', () => {
            const result = maskNIC('987654321v');
            expect(result).toBe('9876****1v');
        });

        it('should mask new format NIC (12 digits)', () => {
            const result = maskNIC('199812345678');
            expect(result).toBe('1998******78');
        });

        it('should return null unchanged', () => {
            expect(maskNIC(null)).toBeNull();
        });

        it('should return undefined unchanged', () => {
            expect(maskNIC(undefined)).toBeUndefined();
        });

        it('should apply fallback masking for unexpected lengths', () => {
            const result = maskNIC('ABCDEFGH');
            expect(result).toMatch(/^ABCD\*+/);
        });
    });
});
