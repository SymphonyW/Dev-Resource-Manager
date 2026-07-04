import {useCallback, useEffect, useMemo, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {formatMemorySize, formatPercent, isHighMemoryUsage} from '../services/systemResources';
import {killProcessByPID, loadProcessList} from '../services/processes';
import type {Translator} from '../services/i18n';
import type {PageDefinition} from '../types/navigation';
import type {ProcessInfo, ProcessSortKey} from '../types/processes';

const processRefreshIntervalMs = 5000;

interface ProcessesPageProps {
    page: PageDefinition;
    t: Translator;
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
    const [processToKill, setProcessToKill] = useState<ProcessInfo | null>(null);

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

    const openKillConfirmation = (process: ProcessInfo) => {
        setOperationMessage('');
        setProcessToKill(process);
    };

    const closeKillConfirmation = () => {
        if (!isKilling) {
            setProcessToKill(null);
        }
    };

    const confirmKillProcess = async () => {
        if (!processToKill) {
            return;
        }

        setIsKilling(true);
        setErrorMessage('');

        try {
            const result = await killProcessByPID(processToKill.pid);
            setOperationMessage(result.message);
            setProcessToKill(null);

            if (result.success) {
                await loadProcesses(false);
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
        <section className="page-panel process-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header compact-page-header">
                <div>
                    <p className="eyebrow">{page.eyebrow}</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
            </div>

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
                                <th className="sticky-action-column">{t('field.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleProcesses.map((process) => {
                                const commandLine = process.commandLine || t('common.unavailable');
                                const path = process.path || t('common.unavailable');

                                return (
                                    <tr key={process.pid} className={processRowClassName(process)}>
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
                                        <td className="sticky-action-column">
                                            <button
                                                className="danger-button table-action-button"
                                                type="button"
                                                disabled={process.isProtected || isKilling}
                                                onClick={() => openKillConfirmation(process)}
                                            >
                                                {t('terminate.process')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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

function processRowClassName(process: ProcessInfo): string | undefined {
    const classNames = [];
    if (process.isProtected) {
        classNames.push('protected-row');
    }
    if (isHighMemoryUsage(process.memoryBytes)) {
        classNames.push('high-memory-row');
    }

    return classNames.length > 0 ? classNames.join(' ') : undefined;
}

export default ProcessesPage;
