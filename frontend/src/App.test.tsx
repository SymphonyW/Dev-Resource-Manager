import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import App from './App';

const getSystemResourceInfoMock = vi.fn();

vi.mock('../wailsjs/go/main/App', () => ({
    AppName: () => new Promise(() => {}),
    GetSystemResourceInfo: () => getSystemResourceInfoMock(),
}));

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
});
