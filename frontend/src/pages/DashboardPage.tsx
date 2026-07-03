import {useCallback, useEffect, useState} from 'react';
import {formatMemorySize, formatPercent, loadSystemResourceInfo} from '../services/systemResources';
import type {PageDefinition} from '../types/navigation';
import type {SystemResourceInfo} from '../types/systemResources';

interface DashboardPageProps {
    page: PageDefinition;
}

function DashboardPage({page}: DashboardPageProps) {
    const [resourceInfo, setResourceInfo] = useState<SystemResourceInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadResources = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const nextResourceInfo = await loadSystemResourceInfo();
            setResourceInfo(nextResourceInfo);
        } catch {
            setErrorMessage('Unable to load system resource information.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadResources();
    }, [loadResources]);

    const metrics = resourceInfo
        ? [
            {label: 'CPU Usage', value: formatPercent(resourceInfo.cpuPercent)},
            {label: 'Total Memory', value: formatMemorySize(resourceInfo.totalMemoryBytes)},
            {label: 'Used Memory', value: formatMemorySize(resourceInfo.usedMemoryBytes)},
            {label: 'Free Memory', value: formatMemorySize(resourceInfo.freeMemoryBytes)},
            {label: 'Processes', value: resourceInfo.processCount.toString()},
            {label: 'Occupied Ports', value: resourceInfo.portCount.toString()},
        ]
        : [];

    return (
        <section className="page-panel" aria-labelledby={`${page.id}-title`}>
            <div className="page-header">
                <div>
                    <p className="eyebrow">System overview</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <button className="refresh-button" type="button" onClick={loadResources} disabled={isLoading}>
                    Refresh
                </button>
            </div>

            {errorMessage && <p className="resource-error">{errorMessage}</p>}
            {isLoading && !resourceInfo && <p className="resource-loading">Loading resource snapshot...</p>}

            {resourceInfo && (
                <dl className="resource-grid" aria-label="System resource metrics">
                    {metrics.map((metric) => (
                        <div className="resource-metric" key={metric.label}>
                            <dt>{metric.label}</dt>
                            <dd>{metric.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
}

export default DashboardPage;
