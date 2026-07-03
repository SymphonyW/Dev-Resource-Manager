import {GetSystemResourceInfo} from '../../wailsjs/go/main/App';
import type {SystemResourceInfo} from '../types/systemResources';

const bytesPerMegabyte = 1024 * 1024;
const bytesPerGigabyte = bytesPerMegabyte * 1024;

export function loadSystemResourceInfo(): Promise<SystemResourceInfo> {
    return GetSystemResourceInfo();
}

export function formatMemorySize(bytes: number): string {
    if (bytes >= bytesPerGigabyte) {
        return `${(bytes / bytesPerGigabyte).toFixed(1)} GB`;
    }

    return `${(bytes / bytesPerMegabyte).toFixed(1)} MB`;
}

export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}
