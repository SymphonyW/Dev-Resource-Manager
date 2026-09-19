export interface SystemResourceInfo {
    cpuPercent: number;
    cpuName: string;
    cpuPhysicalCores: number;
    cpuLogicalProcessors: number;
    cpuMaxMHz: number;
    totalMemoryBytes: number;
    usedMemoryBytes: number;
    freeMemoryBytes: number;
    gpuPercent: number;
    gpuNames: string[];
    totalVRAMBytes: number;
    usedVRAMBytes: number;
    freeVRAMBytes: number;
    processCount: number;
    threadCount: number;
    portCount: number;
    uptimeSeconds: number;
}
