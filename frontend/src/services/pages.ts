import type {PageDefinition, PageId} from '../types/navigation';

export const defaultPageId: PageId = 'dashboard';

export const pages: PageDefinition[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        title: 'Dashboard',
        description: 'View system health, resource usage, and development process status at a glance.',
    },
    {
        id: 'processes',
        label: 'Processes',
        title: 'Processes',
        description: 'Inspect local processes, command lines, CPU usage, memory usage, and safe termination options.',
    },
    {
        id: 'ports',
        label: 'Ports',
        title: 'Ports',
        description: 'Review local TCP and UDP port usage and the owning process.',
    },
    {
        id: 'cleanup',
        label: 'Cleanup',
        title: 'Cleanup',
        description: 'Collect stale development services and review cleanup actions before running them.',
    },
    {
        id: 'logs',
        label: 'Logs',
        title: 'Logs',
        description: 'Track resource actions, process terminations, and permission errors.',
    },
    {
        id: 'settings',
        label: 'Settings',
        title: 'Settings',
        description: 'Configure protected processes, watched ports, and desktop application preferences.',
    },
];

export function getPageById(pageId: PageId): PageDefinition {
    return pages.find((page) => page.id === pageId) ?? pages[0];
}
