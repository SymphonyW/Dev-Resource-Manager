import {
    AddCleanupRule,
    AddCustomProtectedProcessName,
    DeleteCleanupRule,
    DeleteCustomProtectedProcessName,
    GetCleanupRules,
    GetProtectionSettings,
    SetCleanupRuleEnabled,
} from '../../wailsjs/go/main/App';
import {config} from '../../wailsjs/go/models';
import type {CleanupRule, CleanupRuleInput, ProtectionSettings} from '../types/settings';

export function loadProtectionSettings(): Promise<ProtectionSettings> {
    return GetProtectionSettings();
}

export function addCustomProtectedProcessName(name: string): Promise<ProtectionSettings> {
    return AddCustomProtectedProcessName(name);
}

export function deleteCustomProtectedProcessName(name: string): Promise<ProtectionSettings> {
    return DeleteCustomProtectedProcessName(name);
}

export function loadCleanupRules(): Promise<CleanupRule[]> {
    return GetCleanupRules();
}

export function addCleanupRule(input: CleanupRuleInput): Promise<CleanupRule[]> {
    return AddCleanupRule(config.CleanupRuleInput.createFrom(input));
}

export function setCleanupRuleEnabled(id: string, enabled: boolean): Promise<CleanupRule[]> {
    return SetCleanupRuleEnabled(id, enabled);
}

export function deleteCleanupRule(id: string): Promise<CleanupRule[]> {
    return DeleteCleanupRule(id);
}
