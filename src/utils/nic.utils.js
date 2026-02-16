/**
 * Mask NIC for security purposes
 * @param {string} nic - National Identity Card number
 * @returns {string} Masked NIC
 */
export const maskNIC = (nic) => {
    if (!nic) return nic;

    const length = nic.length;

    if (length === 10) {
        // Old format: 123456789V -> 1234****9V
        return nic.substring(0, 4) + '****' + nic.substring(8);
    } else if (length === 12) {
        // New format: 199812345678 -> 1998******78
        return nic.substring(0, 4) + '******' + nic.substring(10);
    }

    // Fallback masking
    return nic.substring(0, 4) + '****' + nic.substring(length - 2);
};
