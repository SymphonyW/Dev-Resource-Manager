import type {PageDefinition, PageId} from '../types/navigation';
import type {Translator} from './i18n';

export const defaultPageId: PageId = 'dashboard';

export function getPages(t: Translator): PageDefinition[] {
    return [
        {
            id: 'dashboard',
            label: t('page.dashboard.label'),
            title: t('page.dashboard.title'),
            description: t('page.dashboard.description'),
            eyebrow: t('page.dashboard.eyebrow'),
        },
        {
            id: 'processes',
            label: t('page.processes.label'),
            title: t('page.processes.title'),
            description: t('page.processes.description'),
            eyebrow: t('page.processes.eyebrow'),
        },
        {
            id: 'ports',
            label: t('page.ports.label'),
            title: t('page.ports.title'),
            description: t('page.ports.description'),
            eyebrow: t('page.ports.eyebrow'),
        },
        {
            id: 'cleanup',
            label: t('page.cleanup.label'),
            title: t('page.cleanup.title'),
            description: t('page.cleanup.description'),
            eyebrow: t('page.cleanup.eyebrow'),
        },
        {
            id: 'logs',
            label: t('page.logs.label'),
            title: t('page.logs.title'),
            description: t('page.logs.description'),
            eyebrow: t('page.logs.eyebrow'),
        },
        {
            id: 'settings',
            label: t('page.settings.label'),
            title: t('page.settings.title'),
            description: t('page.settings.description'),
            eyebrow: t('page.settings.eyebrow'),
        },
    ];
}

export function getPageById(pageId: PageId, pages: PageDefinition[]): PageDefinition {
    return pages.find((page) => page.id === pageId) ?? pages[0];
}
