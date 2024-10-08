export function sanitizeDashboardName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 253);
}
