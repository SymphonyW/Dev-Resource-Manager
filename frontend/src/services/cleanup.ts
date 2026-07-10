import type {CleanupCandidate, CleanupRuleMatch} from '../types/cleanup';
import type {PortInfo} from '../types/ports';
import type {ProcessInfo} from '../types/processes';
import type {CleanupPortRange, CleanupRule} from '../types/settings';

export function buildCleanupCandidates(
    processes: ProcessInfo[],
    ports: PortInfo[],
    rules: CleanupRule[],
): CleanupCandidate[] {
    const portsByPID = buildPortsByPID(ports);
    const enabledRules = rules.filter((rule) => rule.enabled);

    return processes
        .filter((process) => !process.isProtected)
        .map((process) => {
            const processPorts = portsByPID.get(process.pid) ?? [];
            const matchedRules = matchCleanupRules(process, processPorts, enabledRules);
            if (matchedRules.length === 0) {
                return null;
            }

            return {
                ...process,
                ports: processPorts,
                matchedRules,
            };
        })
        .filter((candidate): candidate is CleanupCandidate => candidate !== null)
        .sort((left, right) => right.memoryBytes - left.memoryBytes);
}

export function formatCleanupRuleNames(candidate: CleanupCandidate): string {
    return candidate.matchedRules.map((match) => match.ruleName).join(', ');
}

export function formatCleanupRuleReasons(candidate: CleanupCandidate): string {
    return candidate.matchedRules
        .map((match) => `${match.ruleName}: ${match.reasons.join('; ')}`)
        .join(' | ');
}

function buildPortsByPID(ports: PortInfo[]): Map<number, number[]> {
    const portsByPID = new Map<number, Set<number>>();

    for (const port of ports) {
        if (port.pid <= 0 || port.port <= 0 || port.isProtected) {
            continue;
        }

        const pidPorts = portsByPID.get(port.pid) ?? new Set<number>();
        pidPorts.add(port.port);
        portsByPID.set(port.pid, pidPorts);
    }

    return new Map(
        Array.from(portsByPID.entries()).map(([pid, pidPorts]) => [
            pid,
            Array.from(pidPorts).sort((left, right) => left - right),
        ]),
    );
}

function matchCleanupRules(
    process: ProcessInfo,
    processPorts: number[],
    rules: CleanupRule[],
): CleanupRuleMatch[] {
    const matches: CleanupRuleMatch[] = [];

    for (const rule of rules) {
        const reasons = cleanupRuleMatchReasons(process, processPorts, rule);
        if (reasons.length === 0) {
            continue;
        }

        matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            reasons,
        });
    }

    return matches;
}

function cleanupRuleMatchReasons(process: ProcessInfo, processPorts: number[], rule: CleanupRule): string[] {
    const reasons: string[] = [];

    for (const processName of rule.matchProcessNames) {
        if (processNameMatches(process.name, processName) || processNameMatches(process.path, processName)) {
            reasons.push(`process name ${processName}`);
            break;
        }
    }

    const commandLine = process.commandLine.toLowerCase();
    for (const keyword of rule.matchCommandKeywords) {
        if (keyword !== '' && commandLine.includes(keyword.toLowerCase())) {
            reasons.push(`command keyword ${keyword}`);
            break;
        }
    }

    for (const port of rule.matchPorts) {
        if (processPorts.includes(port)) {
            reasons.push(`port ${port}`);
        }
    }

    for (const portRange of rule.matchPortRanges) {
        const matchedPort = processPorts.find((port) => portInRange(port, portRange));
        if (matchedPort !== undefined) {
            reasons.push(`port ${matchedPort} in ${portRange.start}-${portRange.end}`);
        }
    }

    return reasons;
}

function processNameMatches(value: string, matcher: string): boolean {
    const normalizedValue = normalizeProcessName(value);
    const normalizedMatcher = normalizeProcessName(matcher);
    if (normalizedValue === '' || normalizedMatcher === '') {
        return false;
    }
    if (normalizedValue === normalizedMatcher) {
        return true;
    }
    if (normalizedMatcher.endsWith('.exe')) {
        return false;
    }

    return normalizedValue === `${normalizedMatcher}.exe`
        || normalizedValue.startsWith(`${normalizedMatcher}.`)
        || normalizedValue.startsWith(`${normalizedMatcher}-`);
}

function normalizeProcessName(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '') {
        return '';
    }

    const parts = trimmed.split(/[\\/]/);
    return parts[parts.length - 1] ?? '';
}

function portInRange(port: number, portRange: CleanupPortRange): boolean {
    return port >= portRange.start && port <= portRange.end;
}
