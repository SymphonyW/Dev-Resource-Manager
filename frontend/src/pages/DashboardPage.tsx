import {useCallback, useEffect, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {formatMemorySize, formatPercent, loadSystemResourceInfo} from '../services/systemResources';
import type {Translator} from '../services/i18n';
import type {PageDefinition} from '../types/navigation';
import type {SystemResourceInfo} from '../types/systemResources';

const resourceRefreshIntervalMs = 5000;
const maxHistoryPoints = 30;

interface DashboardPageProps {
    page: PageDefinition;
    t: Translator;
}

interface ResourceHistoryPoint {
    cpuPercent: number;
    memoryPercent: number;
}

function DashboardPage({page, t}: DashboardPageProps) {
    const [resourceInfo, setResourceInfo] = useState<SystemResourceInfo | null>(null);
    const [resourceHistory, setResourceHistory] = useState<ResourceHistoryPoint[]>([]);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadResources = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsLoading(true);
        }
        setErrorMessage('');

        try {
            const nextResourceInfo = await loadSystemResourceInfo();
            const nextPoint = {
                cpuPercent: clampPercent(nextResourceInfo.cpuPercent),
                memoryPercent: getMemoryUsagePercent(nextResourceInfo),
            };

            setResourceInfo(nextResourceInfo);
            setLastUpdatedAt(new Date());
            setResourceHistory((currentHistory) => {
                const seededHistory = currentHistory.length === 0
                    ? Array.from({length: maxHistoryPoints - 1}, () => nextPoint)
                    : currentHistory;

                return [...seededHistory, nextPoint].slice(-maxHistoryPoints);
            });
        } catch {
            setErrorMessage(t('dashboard.error'));
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, [t]);

    useEffect(() => {
        void loadResources(true);
        const intervalId = window.setInterval(() => {
            void loadResources(false);
        }, resourceRefreshIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [loadResources]);

    const memoryPercent = resourceInfo ? getMemoryUsagePercent(resourceInfo) : 0;
    const metrics = resourceInfo
        ? [
            {label: t('dashboard.metric.cpu'), value: formatPercent(resourceInfo.cpuPercent)},
            {label: t('dashboard.metric.totalMemory'), value: formatMemorySize(resourceInfo.totalMemoryBytes)},
            {label: t('dashboard.metric.usedMemory'), value: formatMemorySize(resourceInfo.usedMemoryBytes)},
            {label: t('dashboard.metric.freeMemory'), value: formatMemorySize(resourceInfo.freeMemoryBytes)},
            {label: t('dashboard.metric.processes'), value: resourceInfo.processCount.toString()},
            {label: t('dashboard.metric.occupiedPorts'), value: resourceInfo.portCount.toString()},
        ]
        : [];

    return (
        <section className="page-panel dashboard-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header compact-page-header">
                <div>
                    <p className="eyebrow">{page.eyebrow}</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
            </div>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {isLoading && !resourceInfo && (
                <StatusMessage variant="loading">{t('dashboard.loading')}</StatusMessage>
            )}

            {resourceInfo && (
                <>
                    <div className="resource-chart-grid task-manager-grid">
                        <ResourceGraph
                            ariaLabel={t('dashboard.chart.cpuAria')}
                            title={t('dashboard.chart.cpu')}
                            subtitle={t('dashboard.autoRefresh')}
                            value={formatPercent(resourceInfo.cpuPercent)}
                            history={resourceHistory}
                            historyKey="cpuPercent"
                            t={t}
                        />

                        <ResourceGraph
                            ariaLabel={t('dashboard.chart.memoryAria')}
                            title={t('dashboard.chart.memory')}
                            subtitle={`${formatMemorySize(resourceInfo.usedMemoryBytes)} / ${formatMemorySize(resourceInfo.totalMemoryBytes)}`}
                            value={formatPercent(memoryPercent)}
                            history={resourceHistory}
                            historyKey="memoryPercent"
                            t={t}
                        />
                    </div>

                    <dl className="resource-grid" aria-label="System resource metrics">
                        {metrics.map((metric) => (
                            <div className="resource-metric" key={metric.label}>
                                <dt>{metric.label}</dt>
                                <dd>{metric.value}</dd>
                            </div>
                        ))}
                    </dl>

                    {lastUpdatedAt && (
                        <p className="resource-updated-at">
                            {t('dashboard.lastUpdated')}: {lastUpdatedAt.toLocaleTimeString()}
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

interface ResourceGraphProps {
    ariaLabel: string;
    history: ResourceHistoryPoint[];
    historyKey: keyof ResourceHistoryPoint;
    subtitle: string;
    title: string;
    value: string;
    t: Translator;
}

function ResourceGraph({ariaLabel, history, historyKey, subtitle, title, value, t}: ResourceGraphProps) {
    const points = buildSparklinePoints(history, historyKey);
    const areaPath = buildAreaPath(history, historyKey);

    return (
        <section className="resource-chart-panel task-manager-chart">
            <div className="resource-chart-heading">
                <div>
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                </div>
                <strong>{value}</strong>
            </div>
            <div className="task-chart-frame">
                <span className="chart-axis-label chart-axis-top">100%</span>
                <span className="chart-axis-label chart-axis-bottom">0</span>
                <svg
                    aria-label={ariaLabel}
                    className="cpu-sparkline"
                    role="img"
                    viewBox="0 0 100 64"
                    preserveAspectRatio="none"
                >
                    <path d={areaPath}/>
                    <polyline points={points}/>
                </svg>
                <span className="chart-time-label">{t('dashboard.chart.sixtySeconds')}</span>
            </div>
        </section>
    );
}

function getMemoryUsagePercent(resourceInfo: SystemResourceInfo): number {
    if (resourceInfo.totalMemoryBytes <= 0) {
        return 0;
    }

    return clampPercent((resourceInfo.usedMemoryBytes / resourceInfo.totalMemoryBytes) * 100);
}

function clampPercent(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, value));
}

function getGraphPoints(history: ResourceHistoryPoint[], key: keyof ResourceHistoryPoint): Array<{x: number; y: number}> {
    if (history.length === 0) {
        return [];
    }

    const points = history.length === 1 ? [history[0], history[0]] : history;
    const xStep = points.length > 1 ? 100 / (points.length - 1) : 100;

    return points.map((point, index) => {
        const x = index * xStep;
        const y = 62 - (clampPercent(point[key]) / 100) * 58;

        return {x, y};
    });
}

function buildSparklinePoints(history: ResourceHistoryPoint[], key: keyof ResourceHistoryPoint): string {
    return getGraphPoints(history, key)
        .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(' ');
}

function buildAreaPath(history: ResourceHistoryPoint[], key: keyof ResourceHistoryPoint): string {
    const points = getGraphPoints(history, key);
    if (points.length === 0) {
        return '';
    }

    const line = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');

    return `${line} L 100 64 L 0 64 Z`;
}

export default DashboardPage;
