export interface OperationLog {
    id: number;
    action: string;
    pid: number;
    processName: string;
    port: number;
    result: string;
    message: string;
    createdAt: string;
}
