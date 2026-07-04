export interface PortInfo {
    port: number;
    protocol: string;
    status: string;
    pid: number;
    processName: string;
    processPath: string;
    isProtected: boolean;
}

export type PortProtocolFilter = 'all' | 'TCP' | 'UDP';
