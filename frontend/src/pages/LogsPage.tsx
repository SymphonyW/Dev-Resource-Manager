import {useCallback, useEffect, useState} from 'react';
import {loadOperationLogs} from '../services/logs';
import type {OperationLog} from '../types/logs';
import type {PageDefinition} from '../types/navigation';

interface LogsPageProps {
    page: PageDefinition;
}

function LogsPage({page}: LogsPageProps) {
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const nextLogs = await loadOperationLogs();
            setLogs(nextLogs);
        } catch {
            setLogs([]);
            setErrorMessage('Unable to load operation logs.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    return (
        <section className="page-panel process-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header">
                <div>
                    <p className="eyebrow">Operation history</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <button
                    aria-label="Refresh Logs"
                    className="refresh-button"
                    type="button"
                    onClick={loadLogs}
                    disabled={isLoading}
                >
                    Refresh
                </button>
            </div>

            {errorMessage && <p className="resource-error">{errorMessage}</p>}
            {isLoading && logs.length === 0 && <p className="resource-loading">Loading operation logs...</p>}

            {!isLoading && !errorMessage && logs.length === 0 && (
                <p className="process-empty">No operation logs found.</p>
            )}

            {logs.length > 0 && (
                <div className="process-table-wrap">
                    <table className="process-table logs-table" aria-label="Operation log list">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Action</th>
                                <th>PID</th>
                                <th>Process Name</th>
                                <th>Port</th>
                                <th>Result</th>
                                <th>Message</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td className="mono">{log.id}</td>
                                    <td className="mono" data-testid="operation-log-action">{log.action}</td>
                                    <td className="mono">{log.pid || 'N/A'}</td>
                                    <td>{log.processName || 'Unavailable'}</td>
                                    <td className="mono">{log.port || 'N/A'}</td>
                                    <td>
                                        <span className={log.result === 'success' ? 'result-badge success' : 'result-badge failure'}>
                                            {log.result}
                                        </span>
                                    </td>
                                    <td className="muted-cell">{log.message || 'Unavailable'}</td>
                                    <td className="mono">{formatCreatedAt(log.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function formatCreatedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value || 'Unavailable';
    }

    return date.toLocaleString();
}

export default LogsPage;
