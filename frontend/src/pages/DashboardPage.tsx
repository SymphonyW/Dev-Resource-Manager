import {useCallback, useEffect, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {formatMemorySize, formatPercent, loadSystemResourceInfo} from '../services/systemResources';
import type {Translator} from '../services/i18n';
import type {PageDefinition} from '../types/navigation';
import type {SystemResourceInfo} from '../types/systemResources';

const resourceRefreshIntervalMs = 5000;
const maxHistoryPoints = 24;

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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadResources = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setErrorMessage('');

        try {
            const nextResourceInfo = await loadSystemResourceInfo();
            setResourceInfo(nextResourceInfo);
            setLastUpdatedAt(new Date());
            setResourceHistory((currentHistory) => [
                ...currentHistory,
                {
                    cpuPercent: clampPercent(nextResourceInfo.cpuPercent),
                    memoryPercent: getMemoryUsagePercent(nextResourceInfo),
                },
            ].slice(-maxHistoryPoints));
        } catch {
            setErrorMessage(t('dashboard.error'));
        } finally {
            if (showLoading) {
                setIsLoading(false);
            } else {
                setIsRefreshing(false);
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
        <section className="page-panel" aria-labelledby={`${page.id}-title`}>
            <div className="page-header">
                <div>
                    <p className="eyebrow">{page.eyebrow}</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <button
                    className="refresh-button"
                    type="button"
                    onClick={() => void loadResources(true)}
                    disabled={isLoading || isRefreshing}
                >
                    {t('common.refresh')}
                </button>
            </div>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {isLoading && !resourceInfo && (
                <StatusMessage variant="loading">{t('dashboard.loading')}</StatusMessage>
            )}

            {resourceInfo && (
                <>
                    <div className="resource-chart-grid">
                        <section className="resource-chart-panel">
                            <div className="resource-chart-heading">
                                <div>
                                    <h2>{t('dashboard.chart.cpu')}</h2>
                                    <p>{t('dashboard.autoRefresh')}</p>
                                </div>
                                <strong>{formatPercent(resourceInfo.cpuPercent)}</strong>
                            </div>
                            <svg
                                aria-label={t('dashboard.chart.cpuAria')}
                                className="cpu-sparkline"
                                role="img"
                                viewBox="0 0 100 44"
                                preserveAspectRatio="none"
                            >
                                <polyline points={buildSparklinePoints(resourceHistory, 'cpuPercent')}/>
                            </svg>
                        </section>

                        <section className="resource-chart-panel">
                            <div className="resource-chart-heading">
                                <div>
                                    <h2>{t('dashboard.chart.memory')}</h2>
                                    <p>{formatMemorySize(resourceInfo.usedMemoryBytes)} / {formatMemorySize(resourceInfo.totalMemoryBytes)}</p>
                                </div>
                                <strong>{formatPercent(memoryPercent)}</strong>
                            </div>
                            <div
                                aria-label={t('dashboard.chart.memoryAria')}
                                aria-valuemax={100}
                                aria-valuemin={0}
                                aria-valuenow={Math.round(memoryPercent)}
                                className="memory-usage-meter"
                                role="meter"
                            >
                                <span style={{width: `${memoryPercent}%`}}/>
                            </div>
                        </section>
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

function buildSparklinePoints(history: ResourceHistoryPoint[], key: keyof ResourceHistoryPoint): string {
    if (history.length === 0) {
        return '';
    }

    const points = history.length === 1 ? [history[0], history[0]] : history;
    const xStep = points.length > 1 ? 100 / (points.length - 1) : 100;

    return points
        .map((point, index) => {
            const x = index * xStep;
            const y = 44 - (clampPercent(point[key]) / 100) * 38 - 3;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
}

export default DashboardPage;
