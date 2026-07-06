import {useEffect, useRef} from 'react';

export type AutoRefreshLoader = (showLoading?: boolean) => Promise<void> | void;

export function useSequentialAutoRefresh(loader: AutoRefreshLoader, intervalMs: number) {
    const loaderRef = useRef(loader);

    useEffect(() => {
        loaderRef.current = loader;
    }, [loader]);

    useEffect(() => {
        let isDisposed = false;
        let isRunning = false;
        let timerId: number | undefined;

        const clearScheduledRefresh = () => {
            if (timerId !== undefined) {
                window.clearTimeout(timerId);
                timerId = undefined;
            }
        };

        const scheduleNextRefresh = () => {
            if (isDisposed) {
                return;
            }

            clearScheduledRefresh();
            timerId = window.setTimeout(() => {
                void runRefresh(false);
            }, intervalMs);
        };

        const runRefresh = async (showLoading: boolean) => {
            if (isDisposed || isRunning) {
                return;
            }
            if (!showLoading && document.visibilityState === 'hidden') {
                scheduleNextRefresh();
                return;
            }

            isRunning = true;
            try {
                await loaderRef.current(showLoading);
            } finally {
                isRunning = false;
                scheduleNextRefresh();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            clearScheduledRefresh();
            void runRefresh(false);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        void runRefresh(true);

        return () => {
            isDisposed = true;
            clearScheduledRefresh();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [intervalMs]);
}
