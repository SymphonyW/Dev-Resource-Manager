import {readFileSync} from 'node:fs';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import App from './App';

const appStyles = readFileSync('src/App.css', 'utf8');

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
const getRecentOperationLogsForResourceMock = vi.fn();

vi.mock('../wailsjs/go/main/App', () => ({
    AddCustomProtectedProcessName: (name: string) => addCustomProtectedProcessNameMock(name),
    AppName: () => new Promise(() => {}),
    DeleteCustomProtectedProcessName: (name: string) => deleteCustomProtectedProcessNameMock(name),
    GetOperationLogs: () => getOperationLogsMock(),
    GetPortList: () => getPortListMock(),
    GetProcessDetail: (pid: number) => getProcessDetailMock(pid),
    GetProcessList: () => getProcessListMock(),
    GetProtectionSettings: () => getProtectionSettingsMock(),
    GetRecentOperationLogsForResource: (pid: number, processName: string, ports: number[]) => getRecentOperationLogsForResourceMock(pid, processName, ports),
    GetSystemResourceInfo: () => getSystemResourceInfoMock(),
    KillProcessByPID: (pid: number) => killProcessByPIDMock(pid),
    KillProcessByPort: (port: number, protocol: string) => killProcessByPortMock(port, protocol),
}));

const nodeIconDataURL = 'data:image/png;base64,node-icon';

const processRows = [
    {
        pid: 4,
        name: 'System',
        iconDataURL: '',
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
        iconDataURL: nodeIconDataURL,
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
        iconDataURL: '',
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
        iconDataURL: '',
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
        iconDataURL: '',
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
    iconDataURL: nodeIconDataURL,
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
        getRecentOperationLogsForResourceMock.mockReset();
        getRecentOperationLogsForResourceMock.mockResolvedValue(operationLogs);
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
        expect(screen.getAllByText('Updates every 3 seconds').length).toBeGreaterThan(0);

        expect(screen.queryByRole('button', {name: 'Refresh'})).not.toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(2999);
        });
        await act(async () => {});
        expect(getSystemResourceInfoMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            vi.advanceTimersByTime(1);
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
            vi.advanceTimersByTime(3000);
        });
        await act(async () => {});

        expect(getSystemResourceInfoMock).toHaveBeenCalledTimes(2);
        expect(screen.getAllByText('25.0%').length).toBeGreaterThan(0);
        expect(screen.getAllByText('50.0%').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('28.4%')).toBeInTheDocument();
    });

    it('shows interactive Dashboard chart values when hovering a chart', async () => {
        render(<App/>);

        const chart = await screen.findByLabelText('CPU usage chart');
        fireEvent.mouseMove(chart, {clientX: 20});

        expect(screen.getByText('CPU 42.5%')).toBeInTheDocument();
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

    it('loads Processes into selectable rows without inline action buttons', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));

        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
        expect(screen.getAllByText('Protected').length).toBeGreaterThan(1);

        const table = screen.getByRole('table', {name: 'Process list'});
        const nodeRow = screen.getByText('node.exe').closest('tr');

        expect(nodeRow).not.toBeNull();
        expect(nodeRow).toHaveAttribute('tabindex', '0');
        expect(within(table).queryByRole('button', {name: 'Details'})).not.toBeInTheDocument();
        expect(within(table).queryByRole('button', {name: 'End Process'})).not.toBeInTheDocument();
        expect(screen.queryByRole('complementary', {name: 'Process detail'})).not.toBeInTheDocument();
    });

    it('shows process icons with a fallback initial in process name cells', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();

        const nodeRow = screen.getByText('node.exe').closest('tr');
        const systemRow = screen.getByText('System').closest('tr');
        expect(nodeRow).not.toBeNull();
        expect(systemRow).not.toBeNull();

        const nodeIcon = within(nodeRow as HTMLTableRowElement).getByRole('img', {name: 'node.exe icon'});
        expect(nodeIcon.querySelector('img')).toHaveAttribute('src', nodeIconDataURL);

        const fallbackIcon = within(systemRow as HTMLTableRowElement).getByRole('img', {name: 'System icon'});
        expect(fallbackIcon).toHaveTextContent('S');
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
        fireEvent.click(nodeRow as HTMLTableRowElement);

        await waitFor(() => expect(getProcessDetailMock).toHaveBeenCalledWith(100));
        const drawer = await screen.findByRole('complementary', {name: 'Process detail'});

        expect(nodeRow).toHaveAttribute('aria-selected', 'true');
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
        fireEvent.click(nodeRow as HTMLTableRowElement);

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

    it('does not overlap process refreshes while a scan is still pending', async () => {
        vi.useFakeTimers();
        let resolveInitialProcesses: (value: typeof processRows) => void = () => {};
        getProcessListMock
            .mockReturnValueOnce(new Promise<typeof processRows>((resolve) => {
                resolveInitialProcesses = resolve;
            }))
            .mockResolvedValueOnce([]);

        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        await act(async () => {});
        expect(screen.getByText('Loading process list...')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(15000);
        });
        await act(async () => {});
        expect(getProcessListMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveInitialProcesses(processRows);
        });
        expect(screen.getByText('node.exe')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await act(async () => {});
        expect(getProcessListMock).toHaveBeenCalledTimes(2);
    });

    it('loads Ports into selectable rows with a detail panel and no inline action buttons', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));

        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByText('3000')).toBeInTheDocument();
        expect(screen.getByText('5432')).toBeInTheDocument();
        expect(screen.getAllByText('Dev port')).toHaveLength(2);

        const table = screen.getByRole('table', {name: 'Port list'});
        const nodeRow = screen.getByText('node.exe').closest('tr');
        const protectedRow = screen.getByText('svchost.exe').closest('tr');

        expect(nodeRow).not.toBeNull();
        expect(protectedRow).not.toBeNull();
        expect(nodeRow).toHaveAttribute('tabindex', '0');
        expect(within(table).queryByRole('button', {name: 'End Occupancy'})).not.toBeInTheDocument();
        expect(screen.queryByRole('complementary', {name: 'Port detail'})).not.toBeInTheDocument();

        fireEvent.click(nodeRow as HTMLTableRowElement);

        const detailPanel = screen.getByRole('complementary', {name: 'Port detail'});
        expect(nodeRow).toHaveAttribute('aria-selected', 'true');
        await waitFor(() => expect(getRecentOperationLogsForResourceMock).toHaveBeenCalledWith(100, 'node.exe', [3000]));
        expect(within(detailPanel).getByText('3000')).toBeInTheDocument();
        expect(within(detailPanel).getByText('TCP')).toBeInTheDocument();
        expect(within(detailPanel).getByText('LISTEN')).toBeInTheDocument();
        expect(within(detailPanel).getByText('100')).toBeInTheDocument();
        expect(within(detailPanel).getByText('C:\\Program Files\\nodejs\\node.exe')).toBeInTheDocument();
        await waitFor(() => expect(within(detailPanel).getByText('kill_process_by_port')).toBeInTheDocument());
        expect(within(detailPanel).getByRole('button', {name: 'End Occupancy'})).not.toBeDisabled();

        fireEvent.click(protectedRow as HTMLTableRowElement);
        await act(async () => {});

        expect(protectedRow).toHaveAttribute('aria-selected', 'true');
        expect(within(detailPanel).getByText('135')).toBeInTheDocument();
        expect(within(detailPanel).getByRole('button', {name: 'End Occupancy'})).toBeDisabled();
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
        fireEvent.click(nodeRow as HTMLTableRowElement);

        const detailPanel = screen.getByRole('complementary', {name: 'Port detail'});
        fireEvent.click(within(detailPanel).getByRole('button', {name: 'End Occupancy'}));

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

    it('loads Cleanup candidates into selectable rows with details and keeps protected processes unselectable', async () => {
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

        const nodeRow = screen.getByText('node.exe').closest('tr');
        const protectedRow = screen.getByText('vmmem').closest('tr');

        expect(screen.queryByRole('complementary', {name: 'Cleanup detail'})).not.toBeInTheDocument();
        expect(nodeRow).not.toBeNull();
        expect(protectedRow).not.toBeNull();
        expect(nodeRow).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('checkbox', {name: 'Select node.exe PID 100'})).not.toBeDisabled();
        expect(screen.getByRole('checkbox', {name: 'Select vmmem PID 500'})).toBeDisabled();

        fireEvent.click(nodeRow as HTMLTableRowElement);

        const detailPanel = screen.getByRole('complementary', {name: 'Cleanup detail'});
        expect(nodeRow).toHaveAttribute('aria-selected', 'true');
        await waitFor(() => expect(getRecentOperationLogsForResourceMock).toHaveBeenCalledWith(100, 'node.exe', [3000]));
        expect(within(detailPanel).getByRole('heading', {name: 'node.exe PID 100'})).toBeInTheDocument();
        expect(within(detailPanel).getByText('100')).toBeInTheDocument();
        expect(within(detailPanel).getByText('C:\\Program Files\\nodejs\\node.exe')).toBeInTheDocument();
        expect(within(detailPanel).getByText('node server.js')).toBeInTheDocument();
        expect(within(detailPanel).getByText('3000')).toBeInTheDocument();
        await waitFor(() => expect(within(detailPanel).getByText('kill_process_by_port')).toBeInTheDocument());
        expect(within(detailPanel).getByRole('button', {name: 'End Process'})).not.toBeDisabled();

        fireEvent.click(protectedRow as HTMLTableRowElement);
        await act(async () => {});

        expect(protectedRow).toHaveAttribute('aria-selected', 'true');
        expect(within(detailPanel).getByRole('heading', {name: 'vmmem PID 500'})).toBeInTheDocument();
        expect(within(detailPanel).getByRole('button', {name: 'End Process'})).toBeDisabled();
    });

    it('keeps resource tables on the same process-first column model', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(getColumnHeaders('Process list')).toEqual([
            'PID',
            'Process Name',
            'Path',
            'Command',
            'CPU',
            'Memory',
            'Ports',
            'Protected',
        ]);

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        expect(await screen.findByText('3000')).toBeInTheDocument();
        expect(getColumnHeaders('Port list')).toEqual([
            'PID',
            'Process Name',
            'Path',
            'Command',
            'CPU',
            'Memory',
            'Port',
            'Protocol',
            'Status',
            'Protected',
        ]);

        fireEvent.click(screen.getByRole('button', {name: 'Cleanup'}));
        expect(await screen.findByText('postgres.exe')).toBeInTheDocument();
        expect(getColumnHeaders('Cleanup candidate list')).toEqual([
            'Select',
            'PID',
            'Process Name',
            'Path',
            'Command',
            'CPU',
            'Memory',
            'Ports',
            'Protected',
        ]);
    });

    it('renders bottom horizontal scrollbars for process data tables', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByLabelText('Process list horizontal scroll')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Ports'}));
        expect(await screen.findByText('3000')).toBeInTheDocument();
        expect(screen.getByLabelText('Port list horizontal scroll')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Cleanup'}));
        expect(await screen.findByText('postgres.exe')).toBeInTheDocument();
        expect(screen.getByLabelText('Cleanup candidate list horizontal scroll')).toBeInTheDocument();
    });

    it('keeps data table rows at a fixed height with single-line cells', () => {
        expect(appStyles).toContain('--resource-table-header-height: 34px;');
        expect(appStyles).toContain('--resource-table-row-height: 38px;');
        expect(appStyles).toMatch(/\.process-table th\s*\{[^}]*height: var\(--resource-table-header-height\);/s);
        expect(appStyles).toMatch(/\.process-table tbody tr\s*\{[^}]*height: var\(--resource-table-row-height\);/s);
        expect(appStyles).toMatch(/\.process-table td\s*\{[^}]*height: var\(--resource-table-row-height\);/s);
        expect(appStyles).toMatch(/\.command-cell\s*\{[^}]*white-space: nowrap;/s);
        expect(appStyles).toMatch(/\.process-name-cell\s*\{[^}]*display: flex;/s);
        expect(appStyles).toMatch(/\.process-table-shell\s*\{[^}]*max-height: calc\(100vh - 154px\);/s);
        expect(appStyles).toMatch(/\.process-table-wrap\s*\{[^}]*overflow-x: hidden;/s);
        expect(appStyles).toMatch(/\.process-table-wrap\s*\{[^}]*overflow-y: auto;/s);
        expect(appStyles).toMatch(/\.process-table-scrollbar\s*\{[^}]*position: relative;/s);
        expect(appStyles).toMatch(/\.process-table-scrollbar\s*\{[^}]*scrollbar-color: auto;/s);
        expect(appStyles).not.toMatch(/\.process-table-scrollbar::-webkit-scrollbar-thumb\s*\{[^}]*var\(--accent/s);
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

function getColumnHeaders(tableName: string): string[] {
    const table = screen.getByRole('table', {name: tableName});

    return within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.trim() ?? '');
}
