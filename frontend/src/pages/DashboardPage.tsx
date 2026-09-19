import {useCallback, useState} from 'react';
import type {MouseEvent} from 'react';
import StatusMessage from '../components/StatusMessage';
import {useSequentialAutoRefresh} from '../hooks/useSequentialAutoRefresh';
import {formatMemorySize, formatPercent, loadSystemResourceInfo} from '../services/systemResources';
import type {Translator} from '../services/i18n';
import type {PageDefinition} from '../types/navigation';
import type {SystemResourceInfo} from '../types/systemResources';
import './DashboardPage.css';

const refreshInterval = 3000;
const historyWindow = 60_000;
type ResourceKey = 'cpu' | 'memory' | 'gpu' | 'vram';
interface Sample { time: number; cpu: number; memory: number; gpu: number; vram: number; }
interface Props { page: PageDefinition; t: Translator; }

const percent = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
const ratio = (used: number, total: number) => total > 0 ? percent(used / total * 100) : 0;

function graphPoints(history: Sample[], key: ResourceKey) {
    const end = history[history.length - 1]?.time ?? 0;
    return history.map(sample => ({
        x: Math.max(0, 100 - (end - sample.time) / historyWindow * 100),
        y: 100 - sample[key],
        value: sample[key],
    }));
}

function DashboardPage({page, t}: Props) {
    const [info, setInfo] = useState<SystemResourceInfo | null>(null);
    const [history, setHistory] = useState<Sample[]>([]);
    const [selected, setSelected] = useState<ResourceKey>('cpu');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const next = await loadSystemResourceInfo();
            const sample: Sample = {
                time: Date.now(),
                cpu: percent(next.cpuPercent),
                memory: ratio(next.usedMemoryBytes, next.totalMemoryBytes),
                gpu: percent(next.gpuPercent),
                vram: ratio(next.usedVRAMBytes, next.totalVRAMBytes),
            };
            setInfo(next);
            setHistory(current => [...current.filter(item => item.time >= sample.time - historyWindow), sample].slice(-21));
            setError('');
        } catch {
            setError(t('dashboard.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);
    useSequentialAutoRefresh(load, refreshInterval);

    const resources = [
        {key: 'cpu' as const, title: t('dashboard.chart.cpu'), aria: t('dashboard.chart.cpuAria')},
        {key: 'memory' as const, title: t('dashboard.chart.memory'), aria: t('dashboard.chart.memoryAria')},
        {key: 'gpu' as const, title: t('dashboard.chart.gpu'), aria: t('dashboard.chart.gpuAria')},
        {key: 'vram' as const, title: t('dashboard.chart.vram'), aria: t('dashboard.chart.vramAria')},
    ];
    const active = resources.find(resource => resource.key === selected)!;
    const latest = history[history.length - 1];
    const memorySelected = selected === 'memory';
    const capacitySelected = memorySelected || selected === 'vram';
    const subtitle = info && capacitySelected
        ? formatMemorySize(memorySelected ? info.totalMemoryBytes : info.totalVRAMBytes)
        : t('dashboard.autoRefresh');
    const metrics = info ? [
        {label: t('dashboard.metric.usage'), value: formatPercent(latest?.[selected] ?? 0)},
        ...(capacitySelected ? [
            {label: t(memorySelected ? 'dashboard.metric.usedMemory' : 'dashboard.metric.usedVRAM'), value: formatMemorySize(memorySelected ? info.usedMemoryBytes : info.usedVRAMBytes)},
            {label: t(memorySelected ? 'dashboard.metric.freeMemory' : 'dashboard.metric.freeVRAM'), value: formatMemorySize(memorySelected ? info.freeMemoryBytes : info.freeVRAMBytes)},
            {label: t(memorySelected ? 'dashboard.metric.totalMemory' : 'dashboard.metric.totalVRAM'), value: subtitle},
        ] : []),
        {label: t('dashboard.metric.processes'), value: String(info.processCount)},
        {label: t('dashboard.metric.occupiedPorts'), value: String(info.portCount)},
    ] : [];

    return (
        <section className="page-panel dashboard-page" aria-label={page.title}>
            {error && <StatusMessage variant="error">{error}</StatusMessage>}
            {loading && !info && <StatusMessage variant="loading">{t('dashboard.loading')}</StatusMessage>}
            {info && <div className="performance-workspace">
                <div className="resource-selector" role="group" aria-label={t('dashboard.resources')}>
                    {resources.map(resource => {
                        const points = graphPoints(history, resource.key);
                        return (
                            <button type="button" className="resource-select" key={resource.key}
                                aria-label={resource.title} aria-pressed={selected === resource.key}
                                onClick={() => setSelected(resource.key)}>
                                <svg className="resource-mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                    <polyline points={points.map(point => point.x + ',' + point.y).join(' ')}/>
                                </svg>
                                <span className="resource-select-text">
                                    <span className="resource-select-title">{resource.title}</span>
                                    <span className="resource-select-value">{formatPercent(latest?.[resource.key] ?? 0)}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="performance-main">
                    <div className="performance-heading">
                        <h2>{active.title}</h2>
                        <span>{subtitle}</span>
                    </div>
                    <ResourceGraph key={selected} history={history} resourceKey={selected} title={active.title} ariaLabel={active.aria} t={t}/>
                    <dl className="performance-metrics">
                        {metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}
                    </dl>
                    {latest && <p className="resource-updated-at">{t('dashboard.lastUpdated')}: {new Date(latest.time).toLocaleTimeString()}</p>}
                </div>
            </div>}
        </section>
    );
}

function ResourceGraph({history, resourceKey, title, ariaLabel, t}: {
    history: Sample[]; resourceKey: ResourceKey; title: string; ariaLabel: string; t: Translator;
}) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const points = graphPoints(history, resourceKey);
    const active = activeIndex === null ? null : points[Math.min(activeIndex, points.length - 1)];
    const pointsString = points.map(point => point.x + ',' + point.y).join(' ');
    const area = points.length > 1
        ? 'M' + points[0].x + ',100 L' + pointsString.replaceAll(' ', ' L') + ' L100,100 Z'
        : '';

    const handleMove = (event: MouseEvent<SVGSVGElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / (bounds.width || 100) * 100;
        const nearest = points.reduce((best, point, index) => Math.abs(point.x - x) < Math.abs(points[best].x - x) ? index : best, 0);
        setActiveIndex(nearest);
    };

    return (
        <div className="performance-chart">
            <div className="performance-chart-label"><span>{t('dashboard.metric.usage')}</span><span>100%</span></div>
            <div className="performance-chart-frame">
                <svg className="performance-graph" viewBox="0 0 100 100" preserveAspectRatio="none"
                    aria-label={ariaLabel} aria-describedby="chart-keyboard-hint" role="img" tabIndex={0}
                    onMouseMove={handleMove} onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(points.length - 1)} onBlur={() => setActiveIndex(null)}
                    onKeyDown={event => {
                        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                        event.preventDefault();
                        setActiveIndex(current => Math.max(0, Math.min(points.length - 1, (current ?? points.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))));
                    }}>
                    <g className="performance-grid">
                        {[20, 40, 60, 80].map(value => <line key={'h' + value} x1="0" x2="100" y1={value} y2={value}/>)}
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(value => <line key={'v' + value} y1="0" y2="100" x1={value} x2={value}/>)}
                    </g>
                    {area && <path className="performance-area" d={area}/>}
                    <polyline className="performance-line" points={pointsString}/>
                    {points.length === 1 && <line className="performance-line" x1="99.6" x2="100" y1={points[0].y} y2={points[0].y}/>}
                    {active && <line className="performance-crosshair" x1={active.x} x2={active.x} y1="0" y2="100"/>}
                </svg>
                {active && <output className="chart-hover-tooltip">{title} {formatPercent(active.value)}</output>}
            </div>
            <div className="performance-chart-label"><span>{t('dashboard.chart.sixtySeconds')}</span><span>{t('dashboard.chart.now')}</span></div>
            <span className="visually-hidden" id="chart-keyboard-hint">{t('dashboard.chart.keyboardHint')}</span>
        </div>
    );
}

export default DashboardPage;
