import {useCallback, useEffect, useMemo, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {isCommonDevelopmentPort, killProcessByPort, loadPortList} from '../services/ports';
import type {Translator} from '../services/i18n';
import type {PageDefinition} from '../types/navigation';
import type {PortInfo, PortProtocolFilter} from '../types/ports';

const portRefreshIntervalMs = 5000;

interface PortsPageProps {
    page: PageDefinition;
    t: Translator;
}

function PortsPage({page, t}: PortsPageProps) {
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [portSearch, setPortSearch] = useState('');
    const [processSearch, setProcessSearch] = useState('');
    const [protocolFilter, setProtocolFilter] = useState<PortProtocolFilter>('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [isKilling, setIsKilling] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [operationMessage, setOperationMessage] = useState('');
    const [portToKill, setPortToKill] = useState<PortInfo | null>(null);

    const loadPorts = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsLoading(true);
        }
        setErrorMessage('');

        try {
            const nextPorts = await loadPortList();
            setPorts(nextPorts);
        } catch {
            setPorts([]);
            setErrorMessage(t('ports.error'));
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, [t]);

    useEffect(() => {
        void loadPorts(true);
        const intervalId = window.setInterval(() => {
            void loadPorts(false);
        }, portRefreshIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [loadPorts]);

    const openKillConfirmation = (port: PortInfo) => {
        setOperationMessage('');
        setPortToKill(port);
    };

    const closeKillConfirmation = () => {
        if (!isKilling) {
            setPortToKill(null);
        }
    };

    const confirmKillPortOccupant = async () => {
        if (!portToKill) {
            return;
        }

        setIsKilling(true);
        setErrorMessage('');

        try {
            const result = await killProcessByPort(portToKill.port, portToKill.protocol);
            setOperationMessage(result.message);
            setPortToKill(null);

            if (result.success) {
                await loadPorts(false);
            }
        } catch {
            setOperationMessage(t('processes.killError'));
        } finally {
            setIsKilling(false);
        }
    };

    const statusOptions = useMemo(() => {
        return Array.from(new Set(ports.map((port) => port.status).filter(Boolean))).sort();
    }, [ports]);

    const visiblePorts = useMemo(() => {
        const normalizedPortSearch = portSearch.trim();
        const normalizedProcessSearch = processSearch.trim().toLowerCase();

        return ports.filter((port) => {
            const matchesPort = normalizedPortSearch === ''
                || port.port.toString().includes(normalizedPortSearch);
            const matchesProcess = normalizedProcessSearch === ''
                || port.processName.toLowerCase().includes(normalizedProcessSearch);
            const matchesProtocol = protocolFilter === 'all' || port.protocol === protocolFilter;
            const matchesStatus = statusFilter === 'all' || port.status === statusFilter;

            return matchesPort && matchesProcess && matchesProtocol && matchesStatus;
        });
    }, [portSearch, ports, processSearch, protocolFilter, statusFilter]);

    const isFiltered = portSearch.trim() !== ''
        || processSearch.trim() !== ''
        || protocolFilter !== 'all'
        || statusFilter !== 'all';
    const emptyMessage = isFiltered ? t('ports.emptyFiltered') : t('ports.empty');

    return (
        <section className="page-panel process-page" aria-label={page.title}>
            <div className="port-toolbar compact-toolbar">
                <label className="filter-field compact-filter">
                    <span>{t('filter.port')}</span>
                    <input
                        aria-label={t('filter.port')}
                        inputMode="numeric"
                        value={portSearch}
                        onChange={(event) => setPortSearch(event.target.value)}
                        placeholder="5173"
                    />
                </label>
                <label className="filter-field">
                    <span>{t('filter.processName')}</span>
                    <input
                        aria-label={t('filter.processName')}
                        value={processSearch}
                        onChange={(event) => setProcessSearch(event.target.value)}
                        placeholder="node.exe"
                    />
                </label>
                <label className="filter-field compact-filter">
                    <span>{t('filter.protocol')}</span>
                    <select
                        aria-label={t('filter.protocol')}
                        value={protocolFilter}
                        onChange={(event) => setProtocolFilter(event.target.value as PortProtocolFilter)}
                    >
                        <option value="all">{t('common.allProtocols')}</option>
                        <option value="TCP">TCP</option>
                        <option value="UDP">UDP</option>
                    </select>
                </label>
                <label className="filter-field compact-filter">
                    <span>{t('filter.status')}</span>
                    <select
                        aria-label={t('filter.status')}
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="all">{t('common.allStatuses')}</option>
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </label>
            </div>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {operationMessage && <StatusMessage variant="success">{operationMessage}</StatusMessage>}
            {isLoading && ports.length === 0 && (
                <StatusMessage variant="loading">{t('ports.loading')}</StatusMessage>
            )}

            {!isLoading && !errorMessage && visiblePorts.length === 0 && (
                <StatusMessage variant="empty">{emptyMessage}</StatusMessage>
            )}

            {visiblePorts.length > 0 && (
                <div className="process-table-wrap compact-table-wrap">
                    <table className="process-table port-table compact-data-table" aria-label={t('table.portList')}>
                        <thead>
                            <tr>
                                <th>{t('field.port')}</th>
                                <th>{t('field.protocol')}</th>
                                <th>{t('field.status')}</th>
                                <th>{t('field.pid')}</th>
                                <th>{t('field.processName')}</th>
                                <th>{t('field.processPath')}</th>
                                <th className="sticky-action-column">{t('field.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visiblePorts.map((port) => {
                                const isDevPort = isCommonDevelopmentPort(port.port);

                                return (
                                    <tr key={`${port.protocol}-${port.port}-${port.pid}-${port.status}`} className={isDevPort ? 'dev-port-row' : undefined}>
                                        <td>
                                            <span className="mono">{port.port}</span>
                                            {isDevPort && <span className="dev-port-badge">{t('badge.devPort')}</span>}
                                        </td>
                                        <td><span className="protocol-badge">{port.protocol || t('common.unknown')}</span></td>
                                        <td className="mono">{port.status || t('common.unknown')}</td>
                                        <td className="mono">{port.pid}</td>
                                        <td data-testid="port-process-name">{port.processName || t('common.unknown')}</td>
                                        <td className="muted-cell compact-path-cell" title={port.processPath || t('common.unavailable')}>
                                            {port.processPath || t('common.unavailable')}
                                        </td>
                                        <td className="sticky-action-column">
                                            <button
                                                aria-label={t('terminate.occupancy')}
                                                className="danger-button table-action-button"
                                                type="button"
                                                disabled={port.isProtected || isKilling}
                                                onClick={() => openKillConfirmation(port)}
                                            >
                                                {t('terminate.occupancy')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {portToKill && (
                <div className="modal-backdrop" role="presentation">
                    <section
                        aria-labelledby="kill-port-dialog-title"
                        className="confirmation-dialog"
                        role="dialog"
                    >
                        <div className="dialog-header">
                            <h2 id="kill-port-dialog-title">{t('dialog.port.title')}</h2>
                            <button
                                aria-label={t('common.close')}
                                className="dialog-close-button"
                                type="button"
                                onClick={closeKillConfirmation}
                                disabled={isKilling}
                            >
                                {t('common.close')}
                            </button>
                        </div>
                        <dl className="confirmation-details">
                            <div>
                                <dt>{t('field.port')}</dt>
                                <dd className="mono">{portToKill.port}</dd>
                            </div>
                            <div>
                                <dt>{t('field.protocol')}</dt>
                                <dd>{portToKill.protocol || t('common.unknown')}</dd>
                            </div>
                            <div>
                                <dt>{t('field.pid')}</dt>
                                <dd className="mono">{portToKill.pid}</dd>
                            </div>
                            <div>
                                <dt>{t('field.processName')}</dt>
                                <dd>{portToKill.processName || t('common.unknown')}</dd>
                            </div>
                            <div>
                                <dt>{t('field.path')}</dt>
                                <dd>{portToKill.processPath || t('common.unavailable')}</dd>
                            </div>
                        </dl>
                        <div className="dialog-actions">
                            <button
                                className="sort-button"
                                type="button"
                                onClick={closeKillConfirmation}
                                disabled={isKilling}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                className="danger-button"
                                type="button"
                                onClick={confirmKillPortOccupant}
                                disabled={isKilling}
                            >
                                {t('dialog.action.confirmEndOccupancy')}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}

export default PortsPage;
