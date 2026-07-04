export const languageStorageKey = 'dev-resource-manager-language';

export const languages = [
    {code: 'en', label: 'English'},
    {code: 'zh', label: '中文'},
] as const;

export type LanguageCode = typeof languages[number]['code'];

const englishTranslations = {
    'brand.kicker': 'Desktop',
    'bridge.connected': 'Connected',
    'bridge.connecting': 'Connecting',
    'bridge.unavailable': 'Unavailable',
    'common.refresh': 'Refresh',
    'common.unknown': 'Unknown',
    'common.unavailable': 'Unavailable',
    'dashboard.autoRefresh': 'Updates every 5 seconds',
    'dashboard.chart.cpu': 'CPU Trend',
    'dashboard.chart.cpuAria': 'CPU usage chart',
    'dashboard.chart.memory': 'Memory Usage',
    'dashboard.chart.memoryAria': 'Memory usage chart',
    'dashboard.error': 'Unable to load system resource information.',
    'dashboard.lastUpdated': 'Last updated',
    'dashboard.loading': 'Loading resource snapshot...',
    'dashboard.metric.cpu': 'CPU Usage',
    'dashboard.metric.freeMemory': 'Free Memory',
    'dashboard.metric.memoryPercent': 'Memory Used',
    'dashboard.metric.occupiedPorts': 'Occupied Ports',
    'dashboard.metric.processes': 'Processes',
    'dashboard.metric.totalMemory': 'Total Memory',
    'dashboard.metric.usedMemory': 'Used Memory',
    'page.cleanup.description': 'Collect stale development services and review cleanup actions before running them.',
    'page.cleanup.eyebrow': 'Development cleanup',
    'page.cleanup.label': 'Cleanup',
    'page.cleanup.title': 'Cleanup',
    'page.dashboard.description': 'View system health, resource usage, and development process status at a glance.',
    'page.dashboard.eyebrow': 'System overview',
    'page.dashboard.label': 'Dashboard',
    'page.dashboard.title': 'Dashboard',
    'page.logs.description': 'Track resource actions, process terminations, and permission errors.',
    'page.logs.eyebrow': 'Operation history',
    'page.logs.label': 'Logs',
    'page.logs.title': 'Logs',
    'page.ports.description': 'Review local TCP and UDP port usage and the owning process.',
    'page.ports.eyebrow': 'Port monitor',
    'page.ports.label': 'Ports',
    'page.ports.title': 'Ports',
    'page.processes.description': 'Inspect local processes, command lines, CPU usage, memory usage, and safe termination options.',
    'page.processes.eyebrow': 'Process monitor',
    'page.processes.label': 'Processes',
    'page.processes.title': 'Processes',
    'page.settings.description': 'Configure protected processes, language, and desktop application preferences.',
    'page.settings.eyebrow': 'Protection settings',
    'page.settings.label': 'Settings',
    'page.settings.title': 'Settings',
    'settings.language.help': 'Controls navigation, page headings, and core workspace labels.',
    'settings.language.label': 'Language',
    'settings.preferences.title': 'Preferences',
    'sidebar.navigation': 'Primary navigation',
} as const;

export type TranslationKey = keyof typeof englishTranslations;
export type Translator = (key: TranslationKey) => string;

const chineseTranslations: Record<TranslationKey, string> = {
    'brand.kicker': '桌面应用',
    'bridge.connected': '已连接',
    'bridge.connecting': '连接中',
    'bridge.unavailable': '不可用',
    'common.refresh': '刷新',
    'common.unknown': '未知',
    'common.unavailable': '不可用',
    'dashboard.autoRefresh': '每 5 秒更新',
    'dashboard.chart.cpu': 'CPU 趋势',
    'dashboard.chart.cpuAria': 'CPU 使用率图表',
    'dashboard.chart.memory': '内存使用',
    'dashboard.chart.memoryAria': '内存使用图表',
    'dashboard.error': '无法加载系统资源信息。',
    'dashboard.lastUpdated': '最后更新',
    'dashboard.loading': '正在加载资源快照...',
    'dashboard.metric.cpu': 'CPU 使用率',
    'dashboard.metric.freeMemory': '可用内存',
    'dashboard.metric.memoryPercent': '内存占用',
    'dashboard.metric.occupiedPorts': '端口占用',
    'dashboard.metric.processes': '进程数量',
    'dashboard.metric.totalMemory': '总内存',
    'dashboard.metric.usedMemory': '已用内存',
    'page.cleanup.description': '发现可能残留的开发服务，并在执行前确认清理动作。',
    'page.cleanup.eyebrow': '开发清理',
    'page.cleanup.label': '清理',
    'page.cleanup.title': '清理',
    'page.dashboard.description': '快速查看系统状态、资源使用和开发进程运行情况。',
    'page.dashboard.eyebrow': '系统总览',
    'page.dashboard.label': '仪表盘',
    'page.dashboard.title': '仪表盘',
    'page.logs.description': '查看资源操作、进程结束和权限错误记录。',
    'page.logs.eyebrow': '操作历史',
    'page.logs.label': '日志',
    'page.logs.title': '日志',
    'page.ports.description': '查看本机 TCP / UDP 端口占用和对应进程。',
    'page.ports.eyebrow': '端口监控',
    'page.ports.label': '端口',
    'page.ports.title': '端口',
    'page.processes.description': '查看本机进程、启动命令、CPU、内存和安全结束选项。',
    'page.processes.eyebrow': '进程监控',
    'page.processes.label': '进程',
    'page.processes.title': '进程',
    'page.settings.description': '配置保护进程、语言和桌面应用偏好。',
    'page.settings.eyebrow': '保护设置',
    'page.settings.label': '设置',
    'page.settings.title': '设置',
    'settings.language.help': '控制导航、页面标题和核心工作区标签。',
    'settings.language.label': '语言',
    'settings.preferences.title': '偏好设置',
    'sidebar.navigation': '主导航',
};

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
    en: englishTranslations,
    zh: chineseTranslations,
};

export function createTranslator(language: LanguageCode): Translator {
    return (key) => translations[language][key];
}

export function isLanguageCode(value: string): value is LanguageCode {
    return languages.some((language) => language.code === value);
}

export function resolveInitialLanguage(): LanguageCode {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    if (storedLanguage && isLanguageCode(storedLanguage)) {
        return storedLanguage;
    }

    return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
