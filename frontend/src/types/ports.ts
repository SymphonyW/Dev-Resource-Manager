export interface PortInfo {
    port: number;
    protocol: string;
    status: string;
    pid: number;
    processName: string;
    processPath: string;
}

export type PortProtocolFilter = 'all' | 'TCP' | 'UDP';
