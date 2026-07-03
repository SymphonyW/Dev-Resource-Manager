import {useCallback, useEffect, useMemo, useState} from 'react';
import {formatMemorySize, formatPercent} from '../services/systemResources';
import {loadProcessList} from '../services/processes';
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
    const [errorMessage, setErrorMessage] = useState('');

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
                    <p className="eyebrow">Process monitor</p>
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

            {errorMessage && <p className="resource-error">{errorMessage}</p>}
            {isLoading && processes.length === 0 && <p className="resource-loading">Loading process list...</p>}

            {!isLoading && !errorMessage && visibleProcesses.length === 0 && (
                <p className="process-empty">{emptyMessage}</p>
            )}

            {visibleProcesses.length > 0 && (
                <div className="process-table-wrap">
                    <table className="process-table" aria-label="Process list">
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
                                <tr key={process.pid} className={process.isProtected ? 'protected-row' : undefined}>
                                    <td className="mono">{process.pid}</td>
                                    <td data-testid="process-name">{process.name || 'Unknown'}</td>
                                    <td className="muted-cell">{process.path || 'Unavailable'}</td>
                                    <td className="muted-cell">{process.commandLine || 'Unavailable'}</td>
                                    <td className="mono">{formatPercent(process.cpuPercent)}</td>
                                    <td className="mono">{formatMemorySize(process.memoryBytes)}</td>
                                    <td>{process.user || 'Unavailable'}</td>
                                    <td>
                                        <span className={process.isProtected ? 'protected-badge' : 'standard-badge'}>
                                            {process.isProtected ? 'Protected' : 'Standard'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="terminate-button" type="button" disabled>
                                            Terminate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default ProcessesPage;
