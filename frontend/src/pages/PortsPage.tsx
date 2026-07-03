import {useCallback, useEffect, useMemo, useState} from 'react';
import {isCommonDevelopmentPort, loadPortList} from '../services/ports';
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
    const [errorMessage, setErrorMessage] = useState('');

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
                    <p className="eyebrow">Port monitor</p>
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

            {errorMessage && <p className="resource-error">{errorMessage}</p>}
            {isLoading && ports.length === 0 && <p className="resource-loading">Loading port list...</p>}

            {!isLoading && !errorMessage && visiblePorts.length === 0 && (
                <p className="process-empty">{emptyMessage}</p>
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
                                                aria-label="Terminate process"
                                                className="terminate-button"
                                                type="button"
                                                disabled
                                            >
                                                Terminate
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default PortsPage;
