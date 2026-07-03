export type PageId = 'dashboard' | 'processes' | 'ports' | 'cleanup' | 'logs' | 'settings';

export interface PageDefinition {
    id: PageId;
    label: string;
    title: string;
    description: string;
}
