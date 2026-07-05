import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import App from './App';

const getSystemResourceInfoMock = vi.fn();
const getProcessListMock = vi.fn();
const getProcessDetailMock = vi.fn();
const getPortListMock = vi.fn();
const killProcessByPIDMock = vi.fn();
const killProcessByPortMock = vi.fn();
const getProtectionSettingsMock = vi.fn();
const addCustomProtectedProcessNameMock = vi.fn();
const deleteCustomProtectedProcessNameMock = vi.fn();
const getOperationLogsMock = vi.fn();

vi.mock('../wailsjs/go/main/App', () => ({
    AddCustomProtectedProcessName: (name: string) => addCustomProtectedProcessNameMock(name),
    AppName: () => new Promise(() => {}),
    DeleteCustomProtectedProcessName: (name: string) => deleteCustomProtectedProcessNameMock(name),
    GetOperationLogs: () => getOperationLogsMock(),
    GetPortList: () => getPortListMock(),
    GetProcessDetail: (pid: number) => getProcessDetailMock(pid),
    GetProcessList: () => getProcessListMock(),
    GetProtectionSettings: () => getProtectionSettingsMock(),
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
    {
        pid: 500,
        name: 'vmmem',
        path: '',
        commandLine: '',
        user: 'NT AUTHORITY\\SYSTEM',
        cpuPercent: 0.5,
        memoryBytes: 256 * 1024 * 1024,
        isProtected: true,
    },
    {
        pid: 600,
        name: 'chrome.exe',
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        commandLine: 'chrome.exe',
        user: 'DESKTOP\\dev',
        cpuPercent: 1.1,
        memoryBytes: 384 * 1024 * 1024,
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

const protectionSettings = {
    defaultProcessNames: ['System', 'Registry', 'svchost.exe', 'explorer.exe', 'lsass.exe'],
    customProcessNames: ['redis-server.exe'],
};

const operationLogs = [
    {
        id: 2,
        action: 'kill_process_by_port',
        pid: 100,
        processName: 'node.exe',
        port: 3000,
        result: 'success',
        message: 'Process node.exe (PID 100) ended for TCP port 3000.',
        createdAt: '2026-07-03T09:05:00Z',
    },
    {
        id: 1,
        action: 'kill_process_by_pid',
        pid: -1,
        processName: '',
        port: 0,
        result: 'failure',
        message: 'PID -1 is invalid.',
        createdAt: '2026-07-03T09:00:00Z',
    },
];

const nodeProcessDetail = {
    pid: 100,
    processName: 'node.exe',
    executablePath: '',
    executablePathError: 'Unable to read executable path. Try running as administrator.',
    commandLine: 'node server.js',
    commandLineError: '',
    cpuPercent: 12.3,
    memoryBytes: 512 * 1024 * 1024,
    isProtected: false,
    isDeveloperRelated: true,
    ports: [
        {
            port: 3000,
            protocol: 'TCP',
            status: 'LISTEN',
        },
    ],
    portsError: '',
    recentLogs: [
        operationLogs[0],
    ],
    logsError: '',
};

describe('App layout navigation', () => {
    afterEach(() => {
        vi.useRealTimers();
        window.localStorage.clear();
    });

    beforeEach(() => {
        window.localStorage.clear();
        getSystemResourceInfoMock.mockReset();
        getSystemResourceInfoMock.mockResolvedValue({
            cpuPercent: 42.5,
            totalMemoryBytes: 16 * 1024 * 1024 * 1024,
            usedMemoryBytes: 9.5 * 1024 * 1024 * 1024,
            freeMemoryBytes: 6.5 * 1024 * 1024 * 1024,
            gpuPercent: 18.2,
            totalVRAMBytes: 8 * 1024 * 1024 * 1024,
            usedVRAMBytes: 3 * 1024 * 1024 * 1024,
            freeVRAMBytes: 5 * 1024 * 1024 * 1024,
            processCount: 184,
            portCount: 37,
        });
        getProcessListMock.mockReset();
        getProcessListMock.mockResolvedValue(processRows);
        getProcessDetailMock.mockReset();
        getProcessDetailMock.mockResolvedValue(nodeProcessDetail);
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
        getProtectionSettingsMock.mockReset();
        getProtectionSettingsMock.mockResolvedValue(protectionSettings);
        addCustomProtectedProcessNameMock.mockReset();
        addCustomProtectedProcessNameMock.mockResolvedValue({
            defaultProcessNames: protectionSettings.defaultProcessNames,
            customProcessNames: ['redis-server.exe', 'webpack.exe'],
        });
        deleteCustomProtectedProcessNameMock.mockReset();
        deleteCustomProtectedProcessNameMock.mockResolvedValue({
            defaultProcessNames: protectionSettings.defaultProcessNames,
            customProcessNames: [],
        });
        getOperationLogsMock.mockReset();
        getOperationLogsMock.mockResolvedValue(operationLogs);
    });

    it('renders all primary navigation pages and highlights Dashboard by default', async () => {
        render(<App/>);

        expect(screen.queryByText('Desktop')).not.toBeInTheDocument();
        expect(screen.queryByText('Dev Resource Manager')).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', {name: 'Processes'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Ports'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Cleanup'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Logs'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Settings'})).toBeInTheDocument();
        expect(await screen.findByLabelText('CPU usage chart')).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Dashboard'})).not.toBeInTheDocument();
        expect(screen.queryByText('System overview')).not.toBeInTheDocument();
    });

    it('switches the main content when a navigation item is selected', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));

        expect(screen.getByRole('button', {name: 'Ports'})).toHaveAttribute('aria-current', 'page');
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Ports'})).not.toBeInTheDocument();
        expect(screen.queryByText('Review local TCP and UDP ports and the owning process.')).not.toBeInTheDocument();
    });

    it('does not render page title and description headers above app workspaces', async () => {
        render(<App/>);

        expect(await screen.findByLabelText('CPU usage chart')).toBeInTheDocument();
        expect(screen.queryByText('System overview')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Dashboard'})).not.toBeInTheDocument();
        expect(screen.queryByText('Monitor CPU, memory, GPU, VRAM, processes, and occupied ports in real time.')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.queryByText('Process monitor')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Processes'})).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Settings'}));
        expect(await screen.findByText('redis-server.exe')).toBeInTheDocument();
        expect(screen.queryByText('Protection settings')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Settings'})).not.toBeInTheDocument();
    });

    it('loads Dashboard resource metrics and refreshes them automatically', async () => {
        vi.useFakeTimers();
        getSystemResourceInfoMock
            .mockResolvedValueOnce({
                cpuPercent: 42.5,
                totalMemoryBytes: 16 * 1024 * 1024 * 1024,
                usedMemoryBytes: 9.5 * 1024 * 1024 * 1024,
                freeMemoryBytes: 6.5 * 1024 * 1024 * 1024,
                gpuPercent: 18.2,
                totalVRAMBytes: 8 * 1024 * 1024 * 1024,
                usedVRAMBytes: 3 * 1024 * 1024 * 1024,
                freeVRAMBytes: 5 * 1024 * 1024 * 1024,
                processCount: 184,
                portCount: 37,
            })
            .mockResolvedValueOnce({
                cpuPercent: 25,
                totalMemoryBytes: 16 * 1024 * 1024 * 1024,
                usedMemoryBytes: 8 * 1024 * 1024 * 1024,
                freeMemoryBytes: 7.5 * 1024 * 1024 * 1024,
                gpuPercent: 28.4,
                totalVRAMBytes: 8 * 1024 * 1024 * 1024,
                usedVRAMBytes: 4 * 1024 * 1024 * 1024,
                freeVRAMBytes: 4 * 1024 * 1024 * 1024,
                processCount: 190,
                portCount: 42,
            });

        render(<App/>);

        await act(async () => {});

        expect(screen.getAllByText('42.5%').length).toBeGreaterThan(0);
        expect(screen.getByText('9.5 GB / 16.0 GB')).toBeInTheDocument();
        expect(screen.queryByText('Total Memory')).not.toBeInTheDocument();
        expect(screen.queryByText('Used Memory')).not.toBeInTheDocument();
        expect(screen.queryByText('Free Memory')).not.toBeInTheDocument();
        expect(screen.getByText('GPU')).toBeInTheDocument();
        expect(screen.getByText('VRAM')).toBeInTheDocument();
        expect(screen.getByText('3.0 GB / 8.0 GB')).toBeInTheDocument();
        expect(screen.getByText('184')).toBeInTheDocument();
        expect(screen.getByText('37')).toBeInTheDocument();

        expect(screen.queryByRole('button', {name: 'Refresh'})).not.toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});

        expect(getSystemResourceInfoMock).toHaveBeenCalledTimes(2);
        expect(screen.getAllByText('25.0%').length).toBeGreaterThan(0);
        expect(screen.getByText('8.0 GB / 16.0 GB')).toBeInTheDocument();
        expect(screen.getByText('4.0 GB / 8.0 GB')).toBeInTheDocument();
        expect(screen.getByText('190')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders Dashboard resource charts and updates them on an interval', async () => {
        vi.useFakeTimers();
        getSystemResourceInfoMock
            .mockResolvedValueOnce({
                cpuPercent: 42.5,
                totalMemoryBytes: 16 * 1024 * 1024 * 1024,
                usedMemoryBytes: 9.5 * 1024 * 1024 * 1024,
                freeMemoryBytes: 6.5 * 1024 * 1024 * 1024,
                gpuPercent: 18.2,
                totalVRAMBytes: 8 * 1024 * 1024 * 1024,
                usedVRAMBytes: 3 * 1024 * 1024 * 1024,
                freeVRAMBytes: 5 * 1024 * 1024 * 1024,
                processCount: 184,
                portCount: 37,
            })
            .mockResolvedValueOnce({
                cpuPercent: 25,
                totalMemoryBytes: 16 * 1024 * 1024 * 1024,
                usedMemoryBytes: 8 * 1024 * 1024 * 1024,
                freeMemoryBytes: 8 * 1024 * 1024 * 1024,
                gpuPercent: 28.4,
                totalVRAMBytes: 8 * 1024 * 1024 * 1024,
                usedVRAMBytes: 4 * 1024 * 1024 * 1024,
                freeVRAMBytes: 4 * 1024 * 1024 * 1024,
                processCount: 190,
                portCount: 42,
            });

        render(<App/>);

        await act(async () => {});

        expect(screen.getAllByText('42.5%').length).toBeGreaterThan(0);
        expect(screen.getByLabelText('CPU usage chart')).toBeInTheDocument();
        expect(screen.getByLabelText('Memory usage chart')).toBeInTheDocument();
        expect(screen.getByLabelText('GPU usage chart')).toBeInTheDocument();
        expect(screen.getByLabelText('VRAM usage chart')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});

        expect(getSystemResourceInfoMock).toHaveBeenCalledTimes(2);
        expect(screen.getAllByText('25.0%').length).toBeGreaterThan(0);
        expect(screen.getAllByText('50.0%').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('28.4%')).toBeInTheDocument();
    });

    it('switches application language from Settings', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Settings'}));
        expect(await screen.findByText('redis-server.exe')).toBeInTheDocument();

        await act(async () => {
            fireEvent.change(screen.getByLabelText('Language'), {target: {value: 'zh'}});
        });

        expect(screen.getByRole('button', {name: '进程'})).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: '设置'})).not.toBeInTheDocument();
        expect(screen.getByLabelText('语言')).toHaveValue('zh');
    });

    it('loads Processes into a table with protected markers and protected actions disabled', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));

        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
        expect(screen.getAllByText('Protected').length).toBeGreaterThan(1);

        const systemRow = screen.getByText('System').closest('tr');
        const nodeRow = screen.getByText('node.exe').closest('tr');

        expect(systemRow).not.toBeNull();
        expect(nodeRow).not.toBeNull();
        const systemAction = within(systemRow as HTMLTableRowElement).getByRole('button', {name: 'End Process'});
        const nodeAction = within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'End Process'});

        expect(systemAction.closest('td')).toHaveClass('sticky-action-column');
        expect(nodeAction.closest('td')).toHaveClass('sticky-action-column');
        expect(systemAction).toBeDisabled();
        expect(nodeAction).not.toBeDisabled();
    });

    it('keeps long process commands visually constrained while preserving full command text', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        const nodeRow = screen.getByText('node.exe').closest('tr');
        expect(nodeRow).not.toBeNull();
        const commandCell = within(nodeRow as HTMLTableRowElement).getByText('node server.js');
        expect(commandCell).toHaveClass('command-cell');
        expect(commandCell).toHaveAttribute('title', 'node server.js');
    });

    it('opens a process detail drawer with ports logs and permission warnings without resetting filters', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Process name'), {target: {value: 'node'}});
        const nodeRow = screen.getByText('node.exe').closest('tr');
        expect(nodeRow).not.toBeNull();
        fireEvent.click(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'Details'}));

        await waitFor(() => expect(getProcessDetailMock).toHaveBeenCalledWith(100));
        const drawer = await screen.findByRole('complementary', {name: 'Process detail'});

        expect(within(drawer).getByText('node.exe')).toBeInTheDocument();
        expect(within(drawer).getByText('100')).toBeInTheDocument();
        expect(within(drawer).getByText('Unable to read executable path. Try running as administrator.')).toBeInTheDocument();
        expect(within(drawer).getByText('node server.js')).toBeInTheDocument();
        expect(within(drawer).getByText('Developer-related')).toBeInTheDocument();
        expect(within(drawer).getByText('3000')).toBeInTheDocument();
        expect(within(drawer).getByText('kill_process_by_port')).toBeInTheDocument();
        expect(within(drawer).getByText('Process node.exe (PID 100) ended for TCP port 3000.')).toBeInTheDocument();

        fireEvent.click(within(drawer).getByRole('button', {name: 'Close'}));

        expect(screen.queryByRole('complementary', {name: 'Process detail'})).not.toBeInTheDocument();
        expect(screen.getByLabelText('Process name')).toHaveValue('node');
    });

    it('confirms before ending a process from the detail drawer', async () => {
        getProcessListMock
            .mockResolvedValueOnce(processRows)
            .mockResolvedValueOnce(processRows.filter((process) => process.pid !== 100));

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        const nodeRow = screen.getByText('node.exe').closest('tr');
        expect(nodeRow).not.toBeNull();
        fireEvent.click(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'Details'}));

        const drawer = await screen.findByRole('complementary', {name: 'Process detail'});
        fireEvent.click(within(drawer).getByRole('button', {name: 'End Process'}));

        const dialog = screen.getByRole('dialog', {name: 'Confirm process termination'});
        expect(within(dialog).getByText('node.exe')).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole('button', {name: 'Confirm End Process'}));

        await waitFor(() => expect(killProcessByPIDMock).toHaveBeenCalledWith(100));
        expect(await screen.findByText('Process node.exe (PID 100) ended.')).toBeInTheDocument();
    });

    it('filters Processes by name and PID', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Process name'), {target: {value: 'node'}});
        expect(screen.getByText('node.exe')).toBeInTheDocument();
        expect(screen.queryByText('postgres.exe')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Process name'), {target: {value: ''}});
        fireEvent.change(screen.getByLabelText('PID'), {target: {value: '200'}});
        expect(screen.getByText('postgres.exe')).toBeInTheDocument();
        expect(screen.queryByText('node.exe')).not.toBeInTheDocument();
    });

    it('sorts Processes by memory and CPU usage', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Memory'}));
        expect(screen.getAllByTestId('process-name')[0]).toHaveTextContent('postgres.exe');

        fireEvent.click(screen.getByRole('button', {name: 'CPU'}));
        expect(screen.getAllByTestId('process-name')[0]).toHaveTextContent('node.exe');
    });

    it('auto refreshes Processes and handles empty and error states', async () => {
        vi.useFakeTimers();
        getProcessListMock
            .mockResolvedValueOnce(processRows)
            .mockResolvedValueOnce([])
            .mockRejectedValueOnce(new Error('scan failed'));

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        await act(async () => {});
        expect(screen.getByText('node.exe')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Refresh Processes'})).not.toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});
        expect(screen.getByText('No processes found.')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});
        expect(screen.getByText('Unable to load process list.')).toBeInTheDocument();
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
        fireEvent.click(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'End Process'}));

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

        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByText('3000')).toBeInTheDocument();
        expect(screen.getByText('5432')).toBeInTheDocument();
        expect(screen.getAllByText('Dev port')).toHaveLength(2);

        const nodeRow = screen.getByText('node.exe').closest('tr');
        const protectedRow = screen.getByText('svchost.exe').closest('tr');

        expect(nodeRow).not.toBeNull();
        expect(protectedRow).not.toBeNull();
        const nodeAction = within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'End Occupancy'});
        const protectedAction = within(protectedRow as HTMLTableRowElement).getByRole('button', {name: 'End Occupancy'});

        expect(nodeAction.closest('td')).toHaveClass('sticky-action-column');
        expect(protectedAction.closest('td')).toHaveClass('sticky-action-column');
        expect(nodeAction).not.toBeDisabled();
        expect(protectedAction).toBeDisabled();
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
        fireEvent.click(within(nodeRow as HTMLTableRowElement).getByRole('button', {name: 'End Occupancy'}));

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

        fireEvent.change(screen.getByLabelText('Port'), {target: {value: '5432'}});
        expect(screen.getByText('postgres.exe')).toBeInTheDocument();
        expect(screen.queryByText('node.exe')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Port'), {target: {value: ''}});
        fireEvent.change(screen.getByLabelText('Process name'), {target: {value: 'custom'}});
        expect(screen.getByText('custom-api.exe')).toBeInTheDocument();
        expect(screen.queryByText('postgres.exe')).not.toBeInTheDocument();
    });

    it('filters Ports by protocol and status', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        expect(await screen.findByText('dns-sd.exe')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Protocol'), {target: {value: 'UDP'}});
        expect(screen.getByText('dns-sd.exe')).toBeInTheDocument();
        expect(screen.queryByText('node.exe')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Protocol'), {target: {value: 'all'}});
        fireEvent.change(screen.getByLabelText('Status'), {target: {value: 'ESTABLISHED'}});
        expect(screen.getByText('custom-api.exe')).toBeInTheDocument();
        expect(screen.queryByText('postgres.exe')).not.toBeInTheDocument();
    });

    it('auto refreshes Ports and handles loading empty and error states', async () => {
        vi.useFakeTimers();
        let resolveInitialPorts: (value: typeof portRows) => void = () => {};
        getPortListMock
            .mockReturnValueOnce(new Promise<typeof portRows>((resolve) => {
                resolveInitialPorts = resolve;
            }))
            .mockResolvedValueOnce([])
            .mockRejectedValueOnce(new Error('scan failed'));

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        await act(async () => {});
        expect(screen.getByText('Loading port list...')).toBeInTheDocument();

        await act(async () => {
            resolveInitialPorts(portRows);
        });
        expect(screen.getByText('node.exe')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Refresh Ports'})).not.toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});
        expect(screen.getByText('No ports found.')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});
        expect(screen.getByText('Unable to load port list.')).toBeInTheDocument();
    });

    it('loads Cleanup candidates with ports and keeps protected processes unselectable', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Cleanup'}));

        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.queryByRole('heading', {name: 'Cleanup'})).not.toBeInTheDocument();
        expect(screen.getByRole('toolbar', {name: 'Cleanup actions'})).toHaveClass('cleanup-toolbar');
        expect(screen.getByText('Candidates')).toBeInTheDocument();
        expect(screen.getByText('Selected')).toBeInTheDocument();
        expect(screen.getByText('postgres.exe')).toBeInTheDocument();
        expect(screen.getByText('vmmem')).toBeInTheDocument();
        expect(screen.queryByText('chrome.exe')).not.toBeInTheDocument();
        expect(screen.getByText('3000')).toBeInTheDocument();
        expect(screen.getByText('5432')).toBeInTheDocument();

        expect(screen.getByRole('checkbox', {name: 'Select node.exe PID 100'})).not.toBeDisabled();
        expect(screen.getByRole('checkbox', {name: 'Select vmmem PID 500'})).toBeDisabled();
    });

    it('confirms and ends selected Cleanup candidates through the logged PID operation', async () => {
        getProcessListMock
            .mockResolvedValueOnce(processRows)
            .mockResolvedValueOnce(processRows.filter((process) => process.pid !== 100 && process.pid !== 200));
        getPortListMock
            .mockResolvedValueOnce(portRows)
            .mockResolvedValueOnce(portRows.filter((port) => port.pid !== 100 && port.pid !== 200));
        killProcessByPIDMock
            .mockResolvedValueOnce({
                success: true,
                message: 'Process node.exe (PID 100) ended.',
                pid: 100,
                processName: 'node.exe',
            })
            .mockResolvedValueOnce({
                success: true,
                message: 'Process postgres.exe (PID 200) ended.',
                pid: 200,
                processName: 'postgres.exe',
            });

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Cleanup'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', {name: 'Select node.exe PID 100'}));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Select postgres.exe PID 200'}));
        fireEvent.click(screen.getByRole('button', {name: 'End selected processes'}));

        const dialog = screen.getByRole('dialog', {name: 'Confirm cleanup termination'});
        expect(within(dialog).getByText('2 selected processes')).toBeInTheDocument();
        expect(within(dialog).getByText('node.exe')).toBeInTheDocument();
        expect(within(dialog).getByText('postgres.exe')).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', {name: 'Confirm End Selected'}));

        await waitFor(() => expect(killProcessByPIDMock).toHaveBeenCalledWith(100));
        await waitFor(() => expect(killProcessByPIDMock).toHaveBeenCalledWith(200));
        expect(await screen.findByText('2 cleanup operations finished. 2 succeeded, 0 failed.')).toBeInTheDocument();
        await waitFor(() => expect(getProcessListMock.mock.calls.length).toBeGreaterThanOrEqual(2));
        await waitFor(() => expect(getPortListMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    });

    it('loads Settings protection lists and keeps default entries read-only', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Settings'}));

        expect(await screen.findByText('System')).toBeInTheDocument();
        expect(screen.getByText('svchost.exe')).toBeInTheDocument();
        expect(screen.getByText('redis-server.exe')).toBeInTheDocument();

        const defaultList = screen.getByRole('list', {name: 'Default protected processes'});
        const customList = screen.getByRole('list', {name: 'Custom protected processes'});

        expect(within(defaultList).queryByRole('button', {name: /delete/i})).not.toBeInTheDocument();
        expect(within(customList).getByRole('button', {name: 'Delete redis-server.exe'})).toBeInTheDocument();
    });

    it('adds a custom protected process from Settings', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Settings'}));
        expect(await screen.findByText('redis-server.exe')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Custom protected process name'), {target: {value: 'webpack.exe'}});
        fireEvent.click(screen.getByRole('button', {name: 'Add protected process'}));

        await waitFor(() => expect(addCustomProtectedProcessNameMock).toHaveBeenCalledWith('webpack.exe'));
        expect(await screen.findByText('webpack.exe')).toBeInTheDocument();
        expect(screen.getByText('Custom protected process added.')).toBeInTheDocument();
    });

    it('deletes a custom protected process from Settings', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Settings'}));
        expect(await screen.findByText('redis-server.exe')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Delete redis-server.exe'}));

        await waitFor(() => expect(deleteCustomProtectedProcessNameMock).toHaveBeenCalledWith('redis-server.exe'));
        expect(await screen.findByText('No custom protected processes yet.')).toBeInTheDocument();
        expect(screen.getByText('Custom protected process removed.')).toBeInTheDocument();
    });

    it('loads Logs in newest-first order and refreshes them automatically', async () => {
        vi.useFakeTimers();
        getOperationLogsMock
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(operationLogs);

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Logs'}));

        await act(async () => {});
        expect(screen.queryByRole('heading', {name: 'Logs'})).not.toBeInTheDocument();
        expect(screen.getByText('No operation logs found.')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Refresh Logs'})).not.toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});

        expect(screen.getByText('kill_process_by_port')).toBeInTheDocument();
        expect(screen.getByText('kill_process_by_pid')).toBeInTheDocument();
        expect(screen.getByText('Process node.exe (PID 100) ended for TCP port 3000.')).toBeInTheDocument();
        expect(screen.getByText('PID -1 is invalid.')).toBeInTheDocument();
        expect(screen.getAllByTestId('operation-log-action')[0]).toHaveTextContent('kill_process_by_port');
        expect(getOperationLogsMock).toHaveBeenCalledTimes(2);
    });
});
