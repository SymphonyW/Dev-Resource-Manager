import {useCallback, useEffect, useMemo, useState} from 'react';
import type {KeyboardEvent} from 'react';
import StatusMessage from '../components/StatusMessage';
import {formatMemorySize, formatPercent, isHighMemoryUsage} from '../services/systemResources';
import {killProcessByPID, loadProcessDetail, loadProcessList} from '../services/processes';
import type {Translator} from '../services/i18n';
import type {PageDefinition} from '../types/navigation';
import type {ProcessDetail, ProcessInfo, ProcessSortKey} from '../types/processes';

const processRefreshIntervalMs = 5000;

interface ProcessesPageProps {
    page: PageDefinition;
    t: Translator;
}

interface KillTarget {
    pid: number;
    name: string;
    path: string;
    memoryBytes: number;
}

function ProcessesPage({page, t}: ProcessesPageProps) {
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [nameSearch, setNameSearch] = useState('');
    const [pidSearch, setPidSearch] = useState('');
    const [sortKey, setSortKey] = useState<ProcessSortKey>('memory');
    const [isLoading, setIsLoading] = useState(false);
    const [isKilling, setIsKilling] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [operationMessage, setOperationMessage] = useState('');
    const [processToKill, setProcessToKill] = useState<KillTarget | null>(null);
    const [selectedDetailPID, setSelectedDetailPID] = useState<number | null>(null);
    const [processDetail, setProcessDetail] = useState<ProcessDetail | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailErrorMessage, setDetailErrorMessage] = useState('');

    const loadProcesses = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsLoading(true);
        }
        setErrorMessage('');

        try {
            const nextProcesses = await loadProcessList();
            setProcesses(nextProcesses);
        } catch {
            setProcesses([]);
            setErrorMessage(t('processes.error'));
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, [t]);

    useEffect(() => {
        void loadProcesses(true);
        const intervalId = window.setInterval(() => {
            void loadProcesses(false);
        }, processRefreshIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [loadProcesses]);

    const loadDetail = useCallback(async (pid: number) => {
        setIsDetailLoading(true);
        setDetailErrorMessage('');

        try {
            const detail = await loadProcessDetail(pid);
            setProcessDetail(detail);
        } catch {
            setProcessDetail(null);
            setDetailErrorMessage(t('detail.process.error'));
        } finally {
            setIsDetailLoading(false);
        }
    }, [t]);

    const openProcessDetail = (process: ProcessInfo) => {
        setOperationMessage('');
        setSelectedDetailPID(process.pid);
        setProcessDetail(null);
        void loadDetail(process.pid);
    };

    const closeProcessDetail = () => {
        setSelectedDetailPID(null);
        setProcessDetail(null);
        setDetailErrorMessage('');
    };

    const openDetailKillConfirmation = (detail: ProcessDetail) => {
        setOperationMessage('');
        setProcessToKill({
            pid: detail.pid,
            name: detail.processName,
            path: detail.executablePath,
            memoryBytes: detail.memoryBytes,
        });
    };

    const closeKillConfirmation = () => {
        if (!isKilling) {
            setProcessToKill(null);
        }
    };

    const handleProcessRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, process: ProcessInfo) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        openProcessDetail(process);
    };

    const confirmKillProcess = async () => {
        if (!processToKill) {
            return;
        }

        const target = processToKill;
        setIsKilling(true);
        setErrorMessage('');

        try {
            const result = await killProcessByPID(target.pid);
            setOperationMessage(result.message);
            setProcessToKill(null);

            if (result.success) {
                await loadProcesses(false);
                if (selectedDetailPID === target.pid) {
                    closeProcessDetail();
                }
            }
        } catch {
            setOperationMessage(t('processes.killError'));
        } finally {
            setIsKilling(false);
        }
    };

    const visibleProcesses = useMemo(() => {
        const normalizedNameSearch = nameSearch.trim().toLowerCase();
        const normalizedPidSearch = pidSearch.trim();

        return processes
            .filter((process) => {
                const matchesName = normalizedNameSearch === ''
                    || process.name.toLowerCase().includes(normalizedNameSearch);
                const matchesPid = normalizedPidSearch === ''
                    || process.pid.toString().includes(normalizedPidSearch);

                return matchesName && matchesPid;
            })
            .sort((left, right) => {
                if (sortKey === 'cpu') {
                    return right.cpuPercent - left.cpuPercent;
                }

                return right.memoryBytes - left.memoryBytes;
            });
    }, [nameSearch, pidSearch, processes, sortKey]);

    const isFiltered = nameSearch.trim() !== '' || pidSearch.trim() !== '';
    const emptyMessage = isFiltered ? t('processes.emptyFiltered') : t('processes.empty');

    return (
        <section className="page-panel process-page" aria-label={page.title}>
            <div className="process-toolbar compact-toolbar">
                <label className="filter-field">
                    <span>{t('filter.processName')}</span>
                    <input
                        aria-label={t('filter.processName')}
                        value={nameSearch}
                        onChange={(event) => setNameSearch(event.target.value)}
                        placeholder="node.exe"
                    />
                </label>
                <label className="filter-field compact-filter">
                    <span>{t('field.pid')}</span>
                    <input
                        aria-label={t('field.pid')}
                        inputMode="numeric"
                        value={pidSearch}
                        onChange={(event) => setPidSearch(event.target.value)}
                        placeholder="5173"
                    />
                </label>
                <div className="sort-controls" aria-label={t('filter.search')}>
                    <button
                        aria-label={t('sort.memory')}
                        className={sortKey === 'memory' ? 'sort-button active' : 'sort-button'}
                        type="button"
                        onClick={() => setSortKey('memory')}
                    >
                        {t('sort.memory')}
                    </button>
                    <button
                        aria-label={t('sort.cpu')}
                        className={sortKey === 'cpu' ? 'sort-button active' : 'sort-button'}
                        type="button"
                        onClick={() => setSortKey('cpu')}
                    >
                        {t('sort.cpu')}
                    </button>
                </div>
            </div>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {operationMessage && <StatusMessage variant="success">{operationMessage}</StatusMessage>}
            {isLoading && processes.length === 0 && (
                <StatusMessage variant="loading">{t('processes.loading')}</StatusMessage>
            )}

            {!isLoading && !errorMessage && visibleProcesses.length === 0 && (
                <StatusMessage variant="empty">{emptyMessage}</StatusMessage>
            )}

            {visibleProcesses.length > 0 && (
                <div className="process-detail-layout has-detail">
                    {visibleProcesses.length > 0 && (
                        <div className="process-table-wrap compact-table-wrap">
                            <table className="process-table process-list-table compact-data-table" aria-label={t('table.processList')}>
                                <thead>
                                    <tr>
                                        <th>{t('field.pid')}</th>
                                        <th>{t('field.processName')}</th>
                                        <th>{t('field.path')}</th>
                                        <th>{t('field.command')}</th>
                                        <th>{t('field.cpu')}</th>
                                        <th>{t('field.memory')}</th>
                                        <th>{t('field.user')}</th>
                                        <th>{t('field.protected')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleProcesses.map((process) => {
                                        const commandLine = process.commandLine || t('common.unavailable');
                                        const path = process.path || t('common.unavailable');
                                        const isSelected = selectedDetailPID === process.pid;

                                        return (
                                            <tr
                                                key={process.pid}
                                                aria-selected={isSelected}
                                                className={processRowClassName(process, isSelected)}
                                                onClick={() => openProcessDetail(process)}
                                                onKeyDown={(event) => handleProcessRowKeyDown(event, process)}
                                                tabIndex={0}
                                            >
                                                <td className="mono">{process.pid}</td>
                                                <td data-testid="process-name">{process.name || t('common.unknown')}</td>
                                                <td className="muted-cell compact-path-cell" title={path}>{path}</td>
                                                <td className="muted-cell" title={commandLine}>
                                                    <span className="command-cell" title={commandLine}>{commandLine}</span>
                                                </td>
                                                <td className="mono metric-cell">{formatPercent(process.cpuPercent)}</td>
                                                <td className="mono metric-cell">
                                                    {formatMemorySize(process.memoryBytes)}
                                                    {isHighMemoryUsage(process.memoryBytes) && <span className="memory-badge">{t('badge.high')}</span>}
                                                </td>
                                                <td className="compact-user-cell" title={process.user || t('common.unavailable')}>
                                                    {process.user || t('common.unavailable')}
                                                </td>
                                                <td>
                                                    <span className={process.isProtected ? 'protected-badge' : 'standard-badge'}>
                                                        {process.isProtected ? t('badge.protected') : t('badge.standard')}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <aside
                        aria-label={t('detail.process.aria')}
                        className="process-detail-drawer"
                        role="complementary"
                    >
                        <div className="detail-drawer-header">
                            <div>
                                <p className="detail-drawer-kicker">{selectedDetailPID !== null ? `${t('field.pid')} ${selectedDetailPID}` : t('detail.process.aria')}</p>
                                <h2>{processDetail?.processName ? `${processDetail.processName} PID ${processDetail.pid}` : t('detail.process.aria')}</h2>
                            </div>
                            {selectedDetailPID !== null && (
                                <button
                                    aria-label={t('common.close')}
                                    className="dialog-close-button"
                                    type="button"
                                    onClick={closeProcessDetail}
                                    disabled={isKilling}
                                >
                                    {t('common.close')}
                                </button>
                            )}
                        </div>

                        {detailErrorMessage && <StatusMessage variant="error">{detailErrorMessage}</StatusMessage>}
                        {isDetailLoading && !processDetail && (
                            <StatusMessage variant="loading">{t('detail.process.loading')}</StatusMessage>
                        )}
                        {selectedDetailPID === null && (
                            <div className="detail-drawer-empty">
                                <p>{t('detail.process.empty')}</p>
                            </div>
                        )}

                        {processDetail && (
                            <div className="detail-drawer-body">
                                <div className="detail-badge-row">
                                    <span className={processDetail.isProtected ? 'protected-badge' : 'standard-badge'}>
                                        {processDetail.isProtected ? t('badge.protected') : t('badge.standard')}
                                    </span>
                                    <span className={processDetail.isDeveloperRelated ? 'protocol-badge' : 'standard-badge'}>
                                        {processDetail.isDeveloperRelated ? t('detail.developerRelated') : t('detail.notDeveloperRelated')}
                                    </span>
                                </div>

                                <dl className="detail-field-list">
                                    <div>
                                        <dt>{t('field.pid')}</dt>
                                        <dd className="mono">{processDetail.pid}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('field.processName')}</dt>
                                        <dd>{processDetail.processName || t('common.unknown')}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('field.executablePath')}</dt>
                                        <dd>{renderDetailValue(processDetail.executablePath, processDetail.executablePathError, t)}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('field.command')}</dt>
                                        <dd>{renderDetailValue(processDetail.commandLine, processDetail.commandLineError, t)}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('field.cpu')}</dt>
                                        <dd className="mono">{formatPercent(processDetail.cpuPercent)}</dd>
                                    </div>
                                    <div>
                                        <dt>{t('field.memory')}</dt>
                                        <dd className="mono">{formatMemorySize(processDetail.memoryBytes)}</dd>
                                    </div>
                                </dl>

                                <div className="detail-section">
                                    <div className="detail-section-header">
                                        <h3>{t('field.ports')}</h3>
                                        <span className="settings-count">{processDetail.ports.length}</span>
                                    </div>
                                    {processDetail.portsError && (
                                        <p className="detail-inline-warning">{processDetail.portsError}</p>
                                    )}
                                    {processDetail.ports.length === 0 && !processDetail.portsError && (
                                        <p className="detail-empty">{t('detail.noPorts')}</p>
                                    )}
                                    {processDetail.ports.length > 0 && (
                                        <ul className="detail-port-list">
                                            {processDetail.ports.map((port) => (
                                                <li key={`${port.protocol}-${port.port}-${port.status}`}>
                                                    <span className="mono">{port.port}</span>
                                                    <span className="protocol-badge">{port.protocol || t('common.unknown')}</span>
                                                    <span className="mono muted-cell">{port.status || t('common.unknown')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <div className="detail-section-header">
                                        <h3>{t('detail.recentLogs')}</h3>
                                        <span className="settings-count">{processDetail.recentLogs.length}</span>
                                    </div>
                                    {processDetail.logsError && (
                                        <p className="detail-inline-warning">{processDetail.logsError}</p>
                                    )}
                                    {processDetail.recentLogs.length === 0 && !processDetail.logsError && (
                                        <p className="detail-empty">{t('detail.noLogs')}</p>
                                    )}
                                    {processDetail.recentLogs.length > 0 && (
                                        <ul className="detail-log-list">
                                            {processDetail.recentLogs.map((log) => (
                                                <li key={log.id}>
                                                    <div className="detail-log-meta">
                                                        <span className="mono">{log.action}</span>
                                                        <span className={log.result === 'success' ? 'result-badge success' : 'result-badge failure'}>
                                                            {log.result === 'success' ? t('operation.succeeded') : t('operation.failed')}
                                                        </span>
                                                    </div>
                                                    <p>{log.message || t('common.unavailable')}</p>
                                                    <span className="mono muted-cell">{formatDetailCreatedAt(log.createdAt) || t('common.unavailable')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="detail-actions">
                                    <button
                                        className="danger-button"
                                        type="button"
                                        disabled={processDetail.isProtected || isKilling}
                                        onClick={() => openDetailKillConfirmation(processDetail)}
                                    >
                                        {t('terminate.process')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            )}

            {processToKill && (
                <div className="modal-backdrop" role="presentation">
                    <section
                        aria-labelledby="kill-process-dialog-title"
                        className="confirmation-dialog"
                        role="dialog"
                    >
                        <div className="dialog-header">
                            <h2 id="kill-process-dialog-title">{t('dialog.process.title')}</h2>
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
                                <dt>{t('field.pid')}</dt>
                                <dd className="mono">{processToKill.pid}</dd>
                            </div>
                            <div>
                                <dt>{t('field.processName')}</dt>
                                <dd>{processToKill.name || t('common.unknown')}</dd>
                            </div>
                            <div>
                                <dt>{t('field.path')}</dt>
                                <dd>{processToKill.path || t('common.unavailable')}</dd>
                            </div>
                            <div>
                                <dt>{t('field.memory')}</dt>
                                <dd className="mono">{formatMemorySize(processToKill.memoryBytes)}</dd>
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
                                onClick={confirmKillProcess}
                                disabled={isKilling}
                            >
                                {t('dialog.action.confirmEndProcess')}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}

function processRowClassName(process: ProcessInfo, isSelected = false): string | undefined {
    const classNames = [];
    if (process.isProtected) {
        classNames.push('protected-row');
    }
    if (isHighMemoryUsage(process.memoryBytes)) {
        classNames.push('high-memory-row');
    }
    if (isSelected) {
        classNames.push('selected-process-row');
    }

    return classNames.length > 0 ? classNames.join(' ') : undefined;
}

function renderDetailValue(value: string, error: string, t: Translator) {
    if (value.trim() !== '') {
        return <span>{value}</span>;
    }
    if (error.trim() !== '') {
        return <span className="detail-inline-warning">{error}</span>;
    }

    return <span className="muted-cell">{t('common.unavailable')}</span>;
}

function formatDetailCreatedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

export default ProcessesPage;
