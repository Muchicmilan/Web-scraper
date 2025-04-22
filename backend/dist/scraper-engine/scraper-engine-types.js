export function isProcessingResult(obj) {
    return (obj !== null &&
        typeof obj === 'object' &&
        typeof obj.url === 'string' &&
        typeof obj.data === 'object');
}
