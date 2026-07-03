import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import App from './App';

const getSystemResourceInfoMock = vi.fn();
const getProcessListMock = vi.fn();

vi.mock('../wailsjs/go/main/App', () => ({
    AppName: () => new Promise(() => {}),
    GetProcessList: () => getProcessListMock(),
    GetSystemResourceInfo: () => getSystemResourceInfoMock(),
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

    it('loads Processes into a table with protected markers and disabled actions', async () => {
        render(<App/>);

        fireEvent.click(screen.getByRole('button', {name: 'Processes'}));

        expect(await screen.findByRole('heading', {name: 'Processes'})).toBeInTheDocument();
        expect(await screen.findByText('node.exe')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
        expect(screen.getAllByText('Protected').length).toBeGreaterThan(1);
        expect(screen.getAllByRole('button', {name: 'Terminate'})).toHaveLength(3);
        expect(screen.getAllByRole('button', {name: 'Terminate'}).every((button) => button.hasAttribute('disabled'))).toBe(true);
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
});
