import { hashPassword, comparePassword } from '../../../utils/password.utils.js';

describe('password utils', () => {
    describe('hashPassword', () => {
        it('should return a hash different from the plain text password', async () => {
            const plain = 'MySecurePass123';
            const hash = await hashPassword(plain);
            expect(hash).not.toBe(plain);
        });

        it('should return a bcrypt hash (starts with $2b$)', async () => {
            const hash = await hashPassword('testPassword');
            expect(hash).toMatch(/^\$2[ab]\$/);
        });

        it('should produce different hashes for the same password (salted)', async () => {
            const pass = 'samePassword';
            const hash1 = await hashPassword(pass);
            const hash2 = await hashPassword(pass);
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('comparePassword', () => {
        it('should return true when the plain text matches the hash', async () => {
            const plain = 'CorrectPassword';
            const hash = await hashPassword(plain);
            const result = await comparePassword(plain, hash);
            expect(result).toBe(true);
        });

        it('should return false when the plain text does not match', async () => {
            const hash = await hashPassword('OriginalPassword');
            const result = await comparePassword('WrongPassword', hash);
            expect(result).toBe(false);
        });
    });
});
