import {
    AddCustomProtectedProcessName,
    DeleteCustomProtectedProcessName,
    GetProtectionSettings,
} from '../../wailsjs/go/main/App';
import type {ProtectionSettings} from '../types/settings';

export function loadProtectionSettings(): Promise<ProtectionSettings> {
    return GetProtectionSettings();
}

export function addCustomProtectedProcessName(name: string): Promise<ProtectionSettings> {
    return AddCustomProtectedProcessName(name);
}

export function deleteCustomProtectedProcessName(name: string): Promise<ProtectionSettings> {
    return DeleteCustomProtectedProcessName(name);
}
