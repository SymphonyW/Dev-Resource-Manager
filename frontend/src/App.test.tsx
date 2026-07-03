import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import App from './App';

const getSystemResourceInfoMock = vi.fn();
const getProcessListMock = vi.fn();
const getPortListMock = vi.fn();
const killProcessByPIDMock = vi.fn();
const killProcessByPortMock = vi.fn();

vi.mock('../wailsjs/go/main/App', () => ({
    AppName: () => new Promise(() => {}),
    GetPortList: () => getPortListMock(),
    GetProcessList: () => getProcessListMock(),
    GetSystemResourceInfo: () => getSystemResourceInfoMock(),
    KillProcessByPID: (pid: number) => killProcessByPIDMock(pid),
    KillProcessByPort: (port: number, protocol: string) => killProcessByPortMock(port, protocol),
}));

const processRows = [
    {
        pid: 4,
        name: 'System',
        path: '',
        commandLine: '',
        user: '',
        cpuPercent: 0,
        memoryBytes: 96 * 1024 * 1024,
        isProtected: true,
    },
    {
        pid: 100,
        name: 'node.exe',
        path: 'C:\\Program Files\\nodejs\\node.exe',
        commandLine: 'node server.js',
        user: 'DESKTOP\\dev',
        cpuPercent: 12.3,
        memoryBytes: 512 * 1024 * 1024,
        isProtected: false,
    },
    {
        pid: 200,
        name: 'postgres.exe',
        path: 'C:\\PostgreSQL\\bin\\postgres.exe',
        commandLine: 'postgres -D data',
        user: 'DESKTOP\\postgres',
        cpuPercent: 2.4,
        memoryBytes: 1024 * 1024 * 1024,
        isProtected: false,
    },
];

const portRows = [
    {
        port: 3000,
        protocol: 'TCP',
        status: 'LISTEN',
        pid: 100,
        processName: 'node.exe',
        processPath: 'C:\\Program Files\\nodejs\\node.exe',
        isProtected: false,
    },
    {
        port: 5432,
        protocol: 'TCP',
        status: 'LISTEN',
        pid: 200,
        processName: 'postgres.exe',
        processPath: 'C:\\PostgreSQL\\bin\\postgres.exe',
        isProtected: false,
    },
    {
        port: 5353,
        protocol: 'UDP',
        status: 'LISTEN',
        pid: 300,
        processName: 'dns-sd.exe',
        processPath: '',
        isProtected: false,
    },
    {
        port: 9000,
        protocol: 'TCP',
        status: 'ESTABLISHED',
        pid: 400,
        processName: 'custom-api.exe',
        processPath: 'C:\\dev\\custom-api.exe',
        isProtected: false,
    },
    {
        port: 135,
        protocol: 'TCP',
        status: 'LISTEN',
        pid: 456,
        processName: 'svchost.exe',
        processPath: 'C:\\Windows\\System32\\svchost.exe',
        isProtected: true,
    },
];

describe('App layout navigation', () => {
    beforeEach(() => {
        getSystemResourceInfoMock.mockReset();
        getSystemResourceInfoMock.mockResolvedValue({
            cpuPercent: 42.5,
            totalMemoryBytes: 16 * 1024 * 1024 * 1024,
            usedMemoryBytes: 9.5 * 1024 * 1024 * 1024,
            freeMemoryBytes: 6.5 * 1024 * 1024 * 1024,
            processCount: 184,
            portCount: 37,
        });
        getProcessListMock.mockReset();
        getProcessListMock.mockResolvedValue(processRows);
        getPortListMock.mockReset();
        getPortListMock.mockResolvedValue(portRows);
        killProcessByPIDMock.mockReset();
        killProcessByPIDMock.mockResolvedValue({
            success: true,
            message: 'Process node.exe (PID 100) ended.',
            pid: 100,
            processName: 'node.exe',
        });
        killProcessByPortMock.mockReset();
        killProcessByPortMock.mockResolvedValue({
            success: true,
            message: 'Process node.exe (PID 100) ended for TCP port 3000.',
            pid: 100,
            processName: 'node.exe',
        });
    });

    it('renders all primary navigation pages and highlights Dashboard by default', async () => {
        render(<App/>);

        expect(screen.getByRole('button', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', {name: 'Processes'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Ports'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Cleanup'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Logs'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Settings'})).toBeInTheDocument();
        expect(await screen.findByRole('heading', {name: 'Dashboard'})).toBeInTheDocument();
    });

    it('switches the main content when a navigation item is selected', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));

        expect(screen.getByRole('button', {name: 'Ports'})).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('heading', {name: 'Ports'})).toBeInTheDocument();
        expect(screen.getByText('Review local TCP and UDP port usage and the owning process.')).toBeInTheDocument();
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
    });

    it('loads Dashboard resource metrics and refreshes them on demand', async () => {
        getSystemResourceInfoMock
            .mockResolvedValueOnce({
                cpuPercent: 42.5,
                totalMemoryBytes: 16 * 1024 * 1024 * 1024,
                usedMemoryBytes: 9.5 * 1024 * 1024 * 1024,
                freeMemoryBytes: 6.5 * 1024 * 1024 * 1024,
                processCount: 184,
                portCount: 37,
            })
            .mockResolvedValueOnce({
                cpuPercent: 25,
                totalMemoryBytes: 16 * 1024 * 1024 * 1024,
                usedMemoryBytes: 8 * 1024 * 1024 * 1024,
                freeMemoryBytes: 7.5 * 1024 * 1024 * 1024,
                processCount: 190,
                portCount: 42,
            });

        render(<App/>);

        expect(await screen.findByText('42.5%')).toBeInTheDocument();
        expect(screen.getByText('16.0 GB')).toBeInTheDocument();
        expect(screen.getByText('9.5 GB')).toBeInTheDocument();
        expect(screen.getByText('6.5 GB')).toBeInTheDocument();
        expect(screen.getByText('184')).toBeInTheDocument();
        expect(screen.getByText('37')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Refresh'}));

        await waitFor(() => expect(getSystemResourceInfoMock).toHaveBeenCalledTimes(2));
        expect(await screen.findByText('25.0%')).toBeInTheDocument();
        expect(screen.getByText('8.0 GB')).toBeInTheDocument();
        expect(screen.getByText('190')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('loads Processes into a table with protected markers and protected actions disabled', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));

        expect(await screen.findByRole('heading', {name: 'Processes'})).toBeInTheDocument();
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
        expect(screen.getAllByText('Protected').length).toBeGreaterThan(1);

        const systemRow = screen.getByText('System').closest('tr');
        const nodeRow = screen.getByText('node.exe').closest('tr');

        expect(systemRow).not.toBeNull();
        expect(nodeRow).not.toBeNull();
        expect(within(systemRow as HTMLTableRowElement).getByRole('button', {name: '结束进程'})).toBeDisabled();
        expect(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: '结束进程'})).not.toBeDisabled();
    });

    it('filters Processes by name and PID', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Search by process name'), {target: {value: 'node'}});
        expect(screen.getByText('node.exe')).toBeInTheDocument();
        expect(screen.queryByText('postgres.exe')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Search by process name'), {target: {value: ''}});
        fireEvent.change(screen.getByLabelText('Search by PID'), {target: {value: '200'}});
        expect(screen.getByText('postgres.exe')).toBeInTheDocument();
        expect(screen.queryByText('node.exe')).not.toBeInTheDocument();
    });

    it('sorts Processes by memory and CPU usage', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Sort by Memory'}));
        expect(screen.getAllByTestId('process-name')[0]).toHaveTextContent('postgres.exe');

        fireEvent.click(screen.getByRole('button', {name: 'Sort by CPU'}));
        expect(screen.getAllByTestId('process-name')[0]).toHaveTextContent('node.exe');
    });

    it('refreshes Processes and handles empty and error states', async () => {
        getProcessListMock
            .mockResolvedValueOnce(processRows)
            .mockResolvedValueOnce([])
            .mockRejectedValueOnce(new Error('scan failed'));

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Refresh Processes'}));
        expect(await screen.findByText('No processes found.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Refresh Processes'}));
        expect(await screen.findByText('Unable to load process list.')).toBeInTheDocument();
    });

    it('confirms before ending a process and shows operation result', async () => {
        getProcessListMock
            .mockResolvedValueOnce(processRows)
            .mockResolvedValueOnce(processRows.filter((process) => process.pid !== 100));

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        const nodeRow = screen.getByText('node.exe').closest('tr');
        expect(nodeRow).not.toBeNull();
        fireEvent.click(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: '结束进程'}));

        const dialog = screen.getByRole('dialog', {name: 'Confirm process termination'});
        expect(within(dialog).getByText('PID')).toBeInTheDocument();
        expect(within(dialog).getByText('100')).toBeInTheDocument();
        expect(within(dialog).getByText('node.exe')).toBeInTheDocument();
        expect(within(dialog).getByText('C:\\Program Files\\nodejs\\node.exe')).toBeInTheDocument();
        expect(within(dialog).getByText('512.0 MB')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Confirm End Process'}));

        await waitFor(() => expect(killProcessByPIDMock).toHaveBeenCalledWith(100));
        expect(await screen.findByText('Process node.exe (PID 100) ended.')).toBeInTheDocument();
        expect(screen.queryByRole('dialog', {name: 'Confirm process termination'})).not.toBeInTheDocument();
    });

    it('loads Ports into a table with common dev port markers and protected actions disabled', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));

        expect(await screen.findByRole('heading', {name: 'Ports'})).toBeInTheDocument();
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByText('3000')).toBeInTheDocument();
        expect(screen.getByText('5432')).toBeInTheDocument();
        expect(screen.getAllByText('Dev port')).toHaveLength(2);

        const nodeRow = screen.getByText('node.exe').closest('tr');
        const protectedRow = screen.getByText('svchost.exe').closest('tr');

        expect(nodeRow).not.toBeNull();
        expect(protectedRow).not.toBeNull();
        expect(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'End port occupancy'})).not.toBeDisabled();
        expect(within(protectedRow as HTMLTableRowElement).getByRole('button', {name: 'End port occupancy'})).toBeDisabled();
    });

    it('confirms before ending a port occupant and refreshes the port list', async () => {
        getPortListMock
            .mockResolvedValueOnce(portRows)
            .mockResolvedValueOnce(portRows.filter((port) => port.port !== 3000));

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        const nodeRow = screen.getByText('node.exe').closest('tr');
        expect(nodeRow).not.toBeNull();
        fireEvent.click(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'End port occupancy'}));

        const dialog = screen.getByRole('dialog', {name: 'Confirm port occupancy termination'});
        expect(within(dialog).getByText('Port')).toBeInTheDocument();
        expect(within(dialog).getByText('3000')).toBeInTheDocument();
        expect(within(dialog).getByText('TCP')).toBeInTheDocument();
        expect(within(dialog).getByText('100')).toBeInTheDocument();
        expect(within(dialog).getByText('node.exe')).toBeInTheDocument();
        expect(within(dialog).getByText('C:\\Program Files\\nodejs\\node.exe')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Confirm End Occupancy'}));

        await waitFor(() => expect(killProcessByPortMock).toHaveBeenCalledWith(3000, 'TCP'));
        expect(await screen.findByText('Process node.exe (PID 100) ended for TCP port 3000.')).toBeInTheDocument();
        expect(screen.queryByRole('dialog', {name: 'Confirm port occupancy termination'})).not.toBeInTheDocument();
        await waitFor(() => expect(getPortListMock).toHaveBeenCalledTimes(2));
    });

    it('filters Ports by port number and process name', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Search by port number'), {target: {value: '5432'}});
        expect(screen.getByText('postgres.exe')).toBeInTheDocument();
        expect(screen.queryByText('node.exe')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Search by port number'), {target: {value: ''}});
        fireEvent.change(screen.getByLabelText('Search by process name'), {target: {value: 'custom'}});
        expect(screen.getByText('custom-api.exe')).toBeInTheDocument();
        expect(screen.queryByText('postgres.exe')).not.toBeInTheDocument();
    });

    it('filters Ports by protocol and status', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        expect(await screen.findByText('dns-sd.exe')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Filter by protocol'), {target: {value: 'UDP'}});
        expect(screen.getByText('dns-sd.exe')).toBeInTheDocument();
        expect(screen.queryByText('node.exe')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Filter by protocol'), {target: {value: 'all'}});
        fireEvent.change(screen.getByLabelText('Filter by status'), {target: {value: 'ESTABLISHED'}});
        expect(screen.getByText('custom-api.exe')).toBeInTheDocument();
        expect(screen.queryByText('postgres.exe')).not.toBeInTheDocument();
    });

    it('refreshes Ports and handles loading empty and error states', async () => {
        let resolveInitialPorts: (value: typeof portRows) => void = () => {};
        getPortListMock
            .mockReturnValueOnce(new Promise<typeof portRows>((resolve) => {
                resolveInitialPorts = resolve;
            }))
            .mockResolvedValueOnce([])
            .mockRejectedValueOnce(new Error('scan failed'));

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        expect(await screen.findByText('Loading port list...')).toBeInTheDocument();

        resolveInitialPorts(portRows);
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Refresh Ports'}));
        expect(await screen.findByText('No ports found.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Refresh Ports'}));
        expect(await screen.findByText('Unable to load port list.')).toBeInTheDocument();
    });
});
