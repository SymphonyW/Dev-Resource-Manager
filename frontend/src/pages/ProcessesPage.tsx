import {useCallback, useEffect, useMemo, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {formatMemorySize, formatPercent, isHighMemoryUsage} from '../services/systemResources';
import {killProcessByPID, loadProcessList} from '../services/processes';
import type {PageDefinition} from '../types/navigation';
import type {ProcessInfo, ProcessSortKey} from '../types/processes';

interface ProcessesPageProps {
    page: PageDefinition;
}

function ProcessesPage({page}: ProcessesPageProps) {
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [nameSearch, setNameSearch] = useState('');
    const [pidSearch, setPidSearch] = useState('');
    const [sortKey, setSortKey] = useState<ProcessSortKey>('memory');
    const [isLoading, setIsLoading] = useState(false);
    const [isKilling, setIsKilling] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [operationMessage, setOperationMessage] = useState('');
    const [processToKill, setProcessToKill] = useState<ProcessInfo | null>(null);

    const loadProcesses = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const nextProcesses = await loadProcessList();
            setProcesses(nextProcesses);
        } catch {
            setProcesses([]);
            setErrorMessage('Unable to load process list.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProcesses();
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
                await loadProcesses();
            }
        } catch {
            setOperationMessage('Unable to end process.');
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
    const emptyMessage = isFiltered ? 'No processes match the current filters.' : 'No processes found.';

    return (
        <section className="page-panel process-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header">
                <div>
                    <p className="eyebrow">{page.eyebrow}</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <button
                    aria-label="Refresh Processes"
                    className="refresh-button"
                    type="button"
                    onClick={loadProcesses}
                    disabled={isLoading}
                >
                    Refresh
                </button>
            </div>

            <div className="process-toolbar">
                <label className="filter-field">
                    <span>Search by process name</span>
                    <input
                        aria-label="Search by process name"
                        value={nameSearch}
                        onChange={(event) => setNameSearch(event.target.value)}
                        placeholder="node.exe"
                    />
                </label>
                <label className="filter-field">
                    <span>Search by PID</span>
                    <input
                        aria-label="Search by PID"
                        inputMode="numeric"
                        value={pidSearch}
                        onChange={(event) => setPidSearch(event.target.value)}
                        placeholder="5173"
                    />
                </label>
                <div className="sort-controls" aria-label="Sort processes">
                    <button
                        aria-label="Sort by Memory"
                        className={sortKey === 'memory' ? 'sort-button active' : 'sort-button'}
                        type="button"
                        onClick={() => setSortKey('memory')}
                    >
                        Memory
                    </button>
                    <button
                        aria-label="Sort by CPU"
                        className={sortKey === 'cpu' ? 'sort-button active' : 'sort-button'}
                        type="button"
                        onClick={() => setSortKey('cpu')}
                    >
                        CPU
                    </button>
                </div>
            </div>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {operationMessage && <StatusMessage variant="success">{operationMessage}</StatusMessage>}
            {isLoading && processes.length === 0 && (
                <StatusMessage variant="loading">Loading process list...</StatusMessage>
            )}

            {!isLoading && !errorMessage && visibleProcesses.length === 0 && (
                <StatusMessage variant="empty">{emptyMessage}</StatusMessage>
            )}

            {visibleProcesses.length > 0 && (
                <div className="process-table-wrap">
                    <table className="process-table process-list-table" aria-label="Process list">
                        <thead>
                            <tr>
                                <th>PID</th>
                                <th>Process Name</th>
                                <th>Path</th>
                                <th>Command</th>
                                <th>CPU</th>
                                <th>Memory</th>
                                <th>User</th>
                                <th>Protected</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleProcesses.map((process) => (
                                <tr key={process.pid} className={processRowClassName(process)}>
                                    <td className="mono">{process.pid}</td>
                                    <td data-testid="process-name">{process.name || 'Unknown'}</td>
                                    <td className="muted-cell">{process.path || 'Unavailable'}</td>
                                    <td className="muted-cell" title={process.commandLine || 'Unavailable'}>
                                        <span className="command-cell" title={process.commandLine || 'Unavailable'}>
                                            {process.commandLine || 'Unavailable'}
                                        </span>
                                    </td>
                                    <td className="mono">{formatPercent(process.cpuPercent)}</td>
                                    <td className="mono">
                                        {formatMemorySize(process.memoryBytes)}
                                        {isHighMemoryUsage(process.memoryBytes) && <span className="memory-badge">High</span>}
                                    </td>
                                    <td>{process.user || 'Unavailable'}</td>
                                    <td>
                                        <span className={process.isProtected ? 'protected-badge' : 'standard-badge'}>
                                            {process.isProtected ? 'Protected' : 'Standard'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="danger-button table-action-button"
                                            type="button"
                                            disabled={process.isProtected || isKilling}
                                            onClick={() => openKillConfirmation(process)}
                                        >
                                            结束进程
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
                            <h2 id="kill-process-dialog-title">Confirm process termination</h2>
                            <button
                                aria-label="Close"
                                className="dialog-close-button"
                                type="button"
                                onClick={closeKillConfirmation}
                                disabled={isKilling}
                            >
                                Close
                            </button>
                        </div>
                        <dl className="confirmation-details">
                            <div>
                                <dt>PID</dt>
                                <dd className="mono">{processToKill.pid}</dd>
                            </div>
                            <div>
                                <dt>Process Name</dt>
                                <dd>{processToKill.name || 'Unknown'}</dd>
                            </div>
                            <div>
                                <dt>Path</dt>
                                <dd>{processToKill.path || 'Unavailable'}</dd>
                            </div>
                            <div>
                                <dt>Memory</dt>
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
                                Cancel
                            </button>
                            <button
                                className="danger-button"
                                type="button"
                                onClick={confirmKillProcess}
                                disabled={isKilling}
                            >
                                Confirm End Process
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
