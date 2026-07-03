export interface ProcessInfo {
    pid: number;
    name: string;
    path: string;
    commandLine: string;
    user: string;
    cpuPercent: number;
    memoryBytes: number;
    isProtected: boolean;
}

export type ProcessSortKey = 'memory' | 'cpu';
