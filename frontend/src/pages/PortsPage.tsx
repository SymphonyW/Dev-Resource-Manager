import {useCallback, useEffect, useMemo, useState} from 'react';
import StatusMessage from '../components/StatusMessage';
import {isCommonDevelopmentPort, killProcessByPort, loadPortList} from '../services/ports';
import type {PageDefinition} from '../types/navigation';
import type {PortInfo, PortProtocolFilter} from '../types/ports';

interface PortsPageProps {
    page: PageDefinition;
}

function PortsPage({page}: PortsPageProps) {
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

    const loadPorts = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const nextPorts = await loadPortList();
            setPorts(nextPorts);
        } catch {
            setPorts([]);
            setErrorMessage('Unable to load port list.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadPorts();
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
                await loadPorts();
            }
        } catch {
            setOperationMessage('Unable to end process occupying this port.');
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
    const emptyMessage = isFiltered ? 'No ports match the current filters.' : 'No ports found.';

    return (
        <section className="page-panel process-page" aria-labelledby={`${page.id}-title`}>
            <div className="page-header">
                <div>
                    <p className="eyebrow">{page.eyebrow}</p>
                    <h1 id={`${page.id}-title`}>{page.title}</h1>
                    <p className="page-description">{page.description}</p>
                </div>
                <button
                    aria-label="Refresh Ports"
                    className="refresh-button"
                    type="button"
                    onClick={loadPorts}
                    disabled={isLoading}
                >
                    Refresh
                </button>
            </div>

            <div className="port-toolbar">
                <label className="filter-field">
                    <span>Search by port number</span>
                    <input
                        aria-label="Search by port number"
                        inputMode="numeric"
                        value={portSearch}
                        onChange={(event) => setPortSearch(event.target.value)}
                        placeholder="5173"
                    />
                </label>
                <label className="filter-field">
                    <span>Search by process name</span>
                    <input
                        aria-label="Search by process name"
                        value={processSearch}
                        onChange={(event) => setProcessSearch(event.target.value)}
                        placeholder="node.exe"
                    />
                </label>
                <label className="filter-field">
                    <span>Filter by protocol</span>
                    <select
                        aria-label="Filter by protocol"
                        value={protocolFilter}
                        onChange={(event) => setProtocolFilter(event.target.value as PortProtocolFilter)}
                    >
                        <option value="all">All protocols</option>
                        <option value="TCP">TCP</option>
                        <option value="UDP">UDP</option>
                    </select>
                </label>
                <label className="filter-field">
                    <span>Filter by status</span>
                    <select
                        aria-label="Filter by status"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="all">All statuses</option>
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </label>
            </div>

            {errorMessage && <StatusMessage variant="error">{errorMessage}</StatusMessage>}
            {operationMessage && <StatusMessage variant="success">{operationMessage}</StatusMessage>}
            {isLoading && ports.length === 0 && (
                <StatusMessage variant="loading">Loading port list...</StatusMessage>
            )}

            {!isLoading && !errorMessage && visiblePorts.length === 0 && (
                <StatusMessage variant="empty">{emptyMessage}</StatusMessage>
            )}

            {visiblePorts.length > 0 && (
                <div className="process-table-wrap">
                    <table className="process-table port-table" aria-label="Port list">
                        <thead>
                            <tr>
                                <th>Port</th>
                                <th>Protocol</th>
                                <th>Status</th>
                                <th>PID</th>
                                <th>Process Name</th>
                                <th>Process Path</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visiblePorts.map((port) => {
                                const isDevPort = isCommonDevelopmentPort(port.port);

                                return (
                                    <tr key={`${port.protocol}-${port.port}-${port.pid}-${port.status}`} className={isDevPort ? 'dev-port-row' : undefined}>
                                        <td>
                                            <span className="mono">{port.port}</span>
                                            {isDevPort && <span className="dev-port-badge">Dev port</span>}
                                        </td>
                                        <td><span className="protocol-badge">{port.protocol || 'Unknown'}</span></td>
                                        <td className="mono">{port.status || 'Unknown'}</td>
                                        <td className="mono">{port.pid}</td>
                                        <td data-testid="port-process-name">{port.processName || 'Unknown'}</td>
                                        <td className="muted-cell">{port.processPath || 'Unavailable'}</td>
                                        <td>
                                            <button
                                                aria-label="End port occupancy"
                                                className="danger-button table-action-button"
                                                type="button"
                                                disabled={port.isProtected || isKilling}
                                                onClick={() => openKillConfirmation(port)}
                                            >
                                                结束占用
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
                            <h2 id="kill-port-dialog-title">Confirm port occupancy termination</h2>
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
                                <dt>Port</dt>
                                <dd className="mono">{portToKill.port}</dd>
                            </div>
                            <div>
                                <dt>Protocol</dt>
                                <dd>{portToKill.protocol || 'Unknown'}</dd>
                            </div>
                            <div>
                                <dt>PID</dt>
                                <dd className="mono">{portToKill.pid}</dd>
                            </div>
                            <div>
                                <dt>Process Name</dt>
                                <dd>{portToKill.processName || 'Unknown'}</dd>
                            </div>
                            <div>
                                <dt>Path</dt>
                                <dd>{portToKill.processPath || 'Unavailable'}</dd>
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
                                onClick={confirmKillPortOccupant}
                                disabled={isKilling}
                            >
                                Confirm End Occupancy
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </section>
    );
}

export default PortsPage;
