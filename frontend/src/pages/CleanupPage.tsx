import {useCallback, useEffect, useMemo, useState} from 'react';
import {buildCleanupCandidates} from '../services/cleanup';
import {loadPortList} from '../services/ports';
import {killProcessByPID, loadProcessList} from '../services/processes';
import {formatMemorySize, formatPercent} from '../services/systemResources';
import type {CleanupCandidate} from '../types/cleanup';
import type {PageDefinition} from '../types/navigation';
import type {PortInfo} from '../types/ports';
import type {ProcessInfo} from '../types/processes';

interface CleanupPageProps {
    page: PageDefinition;
}

function CleanupPage({page}: CleanupPageProps) {
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [selectedPIDs, setSelectedPIDs] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isKilling, setIsKilling] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [operationMessage, setOperationMessage] = useState('');
    const [isConfirmingBatch, setIsConfirmingBatch] = useState(false);

    const loadCleanupData = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const [nextProcesses, nextPorts] = await Promise.all([
                loadProcessList(),
                loadPortList(),
            ]);
            setProcesses(nextProcesses);
            setPorts(nextPorts);
        } catch {
            setProcesses([]);
            setPorts([]);
            setErrorMessage('Unable to load cleanup candidates.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCleanupData();
    }, [loadCleanupData]);

    const candidates = useMemo(() => {
        return buildCleanupCandidates(processes, ports);
    }, [ports, processes]);

    useEffect(() => {
        setSelectedPIDs((currentSelectedPIDs) => {
            const selectablePIDs = new Set(
                candidates
                    .filter((candidate) => !candidate.isProtected)
                    .map((candidate) => candidate.pid),
            );
            const nextSelectedPIDs = new Set<number>();
            currentSelectedPIDs.forEach((pid) => {
                if (selectablePIDs.has(pid)) {
                    nextSelectedPIDs.add(pid);
                }
            });

            return nextSelectedPIDs;
        });
    }, [candidates]);

    const selectedCandidates = useMemo(() => {
        return candidates.filter((candidate) => selectedPIDs.has(candidate.pid));
    }, [candidates, selectedPIDs]);

    const toggleCandidate = (candidate: CleanupCandidate) => {
        if (candidate.isProtected || isKilling) {
            return;
        }

        setSelectedPIDs((currentSelectedPIDs) => {
            const nextSelectedPIDs = new Set(currentSelectedPIDs);
            if (nextSelectedPIDs.has(candidate.pid)) {
                nextSelectedPIDs.delete(candidate.pid);
            } else {
                nextSelectedPIDs.add(candidate.pid);
            }

            return nextSelectedPIDs;
        });
    };

    const openBatchConfirmation = () => {
        setOperationMessage('');
        if (selectedCandidates.length > 0) {
            setIsConfirmingBatch(true);
        }
    };

    const closeBatchConfirmation = () => {
        if (!isKilling) {
            setIsConfirmingBatch(false);
        }
    };

    const confirmBatchKill = async () => {
        if (selectedCandidates.length === 0) {
            return;
        }

        const candidatesToKill = [...selectedCandidates];
        setIsKilling(true);
        setErrorMessage('');

        let successCount = 0;
        let failureCount = 0;

        for (const candidate of candidatesToKill) {
            try {
                const result = await killProcessByPID(candidate.pid);
                if (result.success) {
                    successCount += 1;
                } else {
                    failureCount += 1;
                }
            } catch {
                failureCount += 1;
            }
        }

        setIsConfirmingBatch(false);
        setSelectedPIDs(new Set());
        setOperationMessage(`${candidatesToKill.length} cleanup operations finished. ${successCount} succeeded, ${failureCount} failed.`);

        try {
            await loadCleanupData();
        } finally {
            setIsKilling(false);
        }
    };

    return (
        <section className="page-panel process-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header">
                <div>
                    <p className="eyebrow">Development cleanup</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <div className="cleanup-actions">
                    <button
                        aria-label="Refresh Cleanup"
                        className="refresh-button"
                        type="button"
                        onClick={loadCleanupData}
                        disabled={isLoading || isKilling}
                    >
                        Refresh
                    </button>
                    <button
                        className="danger-button"
                        type="button"
                        onClick={openBatchConfirmation}
                        disabled={selectedCandidates.length === 0 || isKilling}
                    >
                        End selected processes
                    </button>
                </div>
            </div>

            {errorMessage && <p className="resource-error">{errorMessage}</p>}
            {operationMessage && <p className="operation-message">{operationMessage}</p>}
            {isLoading && candidates.length === 0 && <p className="resource-loading">Loading cleanup candidates...</p>}

            {!isLoading && !errorMessage && candidates.length === 0 && (
                <p className="process-empty">No development-related processes found.</p>
            )}

            {candidates.length > 0 && (
                <div className="process-table-wrap">
                    <table className="process-table cleanup-table" aria-label="Cleanup candidate list">
                        <thead>
                            <tr>
                                <th>Select</th>
                                <th>PID</th>
                                <th>Process Name</th>
                                <th>Memory</th>
                                <th>CPU</th>
                                <th>Ports</th>
                                <th>Protected</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.map((candidate) => (
                                <tr key={candidate.pid} className={candidate.isProtected ? 'protected-row' : undefined}>
                                    <td>
                                        <input
                                            aria-label={`Select ${candidate.name || 'Unknown'} PID ${candidate.pid}`}
                                            checked={selectedPIDs.has(candidate.pid)}
                                            disabled={candidate.isProtected || isKilling}
                                            type="checkbox"
                                            onChange={() => toggleCandidate(candidate)}
                                        />
                                    </td>
                                    <td className="mono">{candidate.pid}</td>
                                    <td data-testid="cleanup-process-name">{candidate.name || 'Unknown'}</td>
                                    <td className="mono">{formatMemorySize(candidate.memoryBytes)}</td>
                                    <td className="mono">{formatPercent(candidate.cpuPercent)}</td>
                                    <td className="mono">{formatPorts(candidate.ports)}</td>
                                    <td>
                                        <span className={candidate.isProtected ? 'protected-badge' : 'standard-badge'}>
                                            {candidate.isProtected ? 'Protected' : 'Standard'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isConfirmingBatch && (
                <div className="modal-backdrop" role="presentation">
                    <section
                        aria-labelledby="cleanup-dialog-title"
                        className="confirmation-dialog"
                        role="dialog"
                    >
                        <div className="dialog-header">
                            <h2 id="cleanup-dialog-title">Confirm cleanup termination</h2>
                            <button
                                aria-label="Close"
                                className="dialog-close-button"
                                type="button"
                                onClick={closeBatchConfirmation}
                                disabled={isKilling}
                            >
                                Close
                            </button>
                        </div>
                        <p className="dialog-summary">{selectedCandidates.length} selected processes</p>
                        <dl className="confirmation-details">
                            {selectedCandidates.map((candidate) => (
                                <div key={candidate.pid}>
                                    <dt className="mono">{candidate.pid}</dt>
                                    <dd>
                                        <span>{candidate.name || 'Unknown'}</span>
                                        <span className="muted-cell"> - {formatMemorySize(candidate.memoryBytes)} - ports {formatPorts(candidate.ports)}</span>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <div className="dialog-actions">
                            <button
                                className="sort-button"
                                type="button"
                                onClick={closeBatchConfirmation}
                                disabled={isKilling}
                            >
                                Cancel
                            </button>
                            <button
                                className="danger-button"
                                type="button"
                                onClick={confirmBatchKill}
                                disabled={isKilling}
                            >
                                Confirm End Selected
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}

function formatPorts(ports: number[]): string {
    if (ports.length === 0) {
        return 'None';
    }

    return ports.join(', ');
}

export default CleanupPage;
