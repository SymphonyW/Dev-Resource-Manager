import {useCallback, useEffect, useMemo, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {buildCleanupCandidates} from '../services/cleanup';
import {isCommonDevelopmentPort, loadPortList} from '../services/ports';
import {killProcessByPID, loadProcessList} from '../services/processes';
import {formatMemorySize, formatPercent, isHighMemoryUsage} from '../services/systemResources';
import type {Translator} from '../services/i18n';
import type {CleanupCandidate} from '../types/cleanup';
import type {PageDefinition} from '../types/navigation';
import type {PortInfo} from '../types/ports';
import type {ProcessInfo} from '../types/processes';

const cleanupRefreshIntervalMs = 5000;

interface CleanupPageProps {
    page: PageDefinition;
    t: Translator;
}

function CleanupPage({page, t}: CleanupPageProps) {
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [ports, setPorts] = useState<PortInfo[]>([]);
    const [selectedPIDs, setSelectedPIDs] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isKilling, setIsKilling] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [operationMessage, setOperationMessage] = useState('');
    const [isConfirmingBatch, setIsConfirmingBatch] = useState(false);

    const loadCleanupData = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setIsLoading(true);
        }
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
            setErrorMessage(t('cleanup.error'));
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, [t]);

    useEffect(() => {
        void loadCleanupData(true);
        const intervalId = window.setInterval(() => {
            void loadCleanupData(false);
        }, cleanupRefreshIntervalMs);

        return () => window.clearInterval(intervalId);
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
        setOperationMessage(`${candidatesToKill.length} ${t('cleanup.operationSummary')} ${successCount} ${t('operation.succeeded')}, ${failureCount} ${t('operation.failed')}.`);

        try {
            await loadCleanupData(false);
        } finally {
            setIsKilling(false);
        }
    };

    return (
        <section className="page-panel process-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header compact-page-header">
                <div>
                    <p className="eyebrow">{page.eyebrow}</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <div className="cleanup-actions">
                    <button
                        className="danger-button"
                        type="button"
                        onClick={openBatchConfirmation}
                        disabled={selectedCandidates.length === 0 || isKilling}
                    >
                        {t('terminate.selected')}
                    </button>
                </div>
            </div>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {operationMessage && <StatusMessage variant="success">{operationMessage}</StatusMessage>}
            {isLoading && candidates.length === 0 && (
                <StatusMessage variant="loading">{t('cleanup.loading')}</StatusMessage>
            )}

            {!isLoading && !errorMessage && candidates.length === 0 && (
                <StatusMessage variant="empty">{t('cleanup.empty')}</StatusMessage>
            )}

            {candidates.length > 0 && (
                <div className="process-table-wrap compact-table-wrap">
                    <table className="process-table cleanup-table compact-data-table" aria-label={t('table.cleanupList')}>
                        <thead>
                            <tr>
                                <th>{t('field.select')}</th>
                                <th>{t('field.pid')}</th>
                                <th>{t('field.processName')}</th>
                                <th>{t('field.memory')}</th>
                                <th>{t('field.cpu')}</th>
                                <th>{t('field.ports')}</th>
                                <th>{t('field.protected')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.map((candidate) => (
                                <tr key={candidate.pid} className={cleanupRowClassName(candidate)}>
                                    <td>
                                        <input
                                            aria-label={`${t('cleanup.selectProcess')} ${candidate.name || t('common.unknown')} PID ${candidate.pid}`}
                                            checked={selectedPIDs.has(candidate.pid)}
                                            disabled={candidate.isProtected || isKilling}
                                            type="checkbox"
                                            onChange={() => toggleCandidate(candidate)}
                                        />
                                    </td>
                                    <td className="mono">{candidate.pid}</td>
                                    <td data-testid="cleanup-process-name">{candidate.name || t('common.unknown')}</td>
                                    <td className="mono metric-cell">
                                        {formatMemorySize(candidate.memoryBytes)}
                                        {isHighMemoryUsage(candidate.memoryBytes) && <span className="memory-badge">{t('badge.high')}</span>}
                                    </td>
                                    <td className="mono metric-cell">{formatPercent(candidate.cpuPercent)}</td>
                                    <td className="mono">{renderPorts(candidate.ports, t)}</td>
                                    <td>
                                        <span className={candidate.isProtected ? 'protected-badge' : 'standard-badge'}>
                                            {candidate.isProtected ? t('badge.protected') : t('badge.standard')}
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
                            <h2 id="cleanup-dialog-title">{t('dialog.cleanup.title')}</h2>
                            <button
                                aria-label={t('common.close')}
                                className="dialog-close-button"
                                type="button"
                                onClick={closeBatchConfirmation}
                                disabled={isKilling}
                            >
                                {t('common.close')}
                            </button>
                        </div>
                        <p className="dialog-summary">{selectedCandidates.length} {t('cleanup.dialog.summary')}</p>
                        <dl className="confirmation-details">
                            {selectedCandidates.map((candidate) => (
                                <div key={candidate.pid}>
                                    <dt className="mono">{candidate.pid}</dt>
                                    <dd>
                                        <span>{candidate.name || t('common.unknown')}</span>
                                        <span className="muted-cell"> - {formatMemorySize(candidate.memoryBytes)} - {t('field.ports')} {formatPorts(candidate.ports, t)}</span>
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
                                {t('common.cancel')}
                            </button>
                            <button
                                className="danger-button"
                                type="button"
                                onClick={confirmBatchKill}
                                disabled={isKilling}
                            >
                                {t('dialog.action.confirmEndSelected')}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}

function formatPorts(ports: number[], t: Translator): string {
    if (ports.length === 0) {
        return t('common.none');
    }

    return ports.join(', ');
}

function renderPorts(ports: number[], t: Translator) {
    if (ports.length === 0) {
        return t('common.none');
    }

    return ports.map((port, index) => (
        <span key={port}>
            {index > 0 && ', '}
            <span className={isCommonDevelopmentPort(port) ? 'inline-dev-port' : undefined}>{port}</span>
        </span>
    ));
}

function cleanupRowClassName(candidate: CleanupCandidate): string | undefined {
    const classNames = [];
    if (candidate.isProtected) {
        classNames.push('protected-row');
    }
    if (isHighMemoryUsage(candidate.memoryBytes)) {
        classNames.push('high-memory-row');
    }
    if (candidate.ports.some(isCommonDevelopmentPort)) {
        classNames.push('dev-port-row');
    }

    return classNames.length > 0 ? classNames.join(' ') : undefined;
}

export default CleanupPage;
