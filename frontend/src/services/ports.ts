import {GetPortList} from '../../wailsjs/go/main/App';
import type {PortInfo} from '../types/ports';

export const commonDevelopmentPorts = new Set([3000, 5173, 8000, 8080, 5432, 3306, 6379]);

export function loadPortList(): Promise<PortInfo[]> {
    return GetPortList();
}

export function isCommonDevelopmentPort(port: number): boolean {
    return commonDevelopmentPorts.has(port);
}
