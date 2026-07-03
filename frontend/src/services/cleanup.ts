import type {CleanupCandidate} from '../types/cleanup';
import type {PortInfo} from '../types/ports';
import type {ProcessInfo} from '../types/processes';

const developmentProcessKeywords = [
    'node.exe',
    'npm',
    'pnpm',
    'yarn',
    'vite',
    'python.exe',
    'uvicorn',
    'go.exe',
    'java.exe',
    'redis-server',
    'postgres',
    'mysql',
    'nginx',
    'docker',
    'wsl',
    'vmmem',
];

export function buildCleanupCandidates(processes: ProcessInfo[], ports: PortInfo[]): CleanupCandidate[] {
    const portsByPID = buildPortsByPID(ports);

    return processes
        .map((process) => {
            const match = matchedDevelopmentProcessKeyword(process);
            if (!match) {
                return null;
            }

            return {
                ...process,
                ports: portsByPID.get(process.pid) ?? [],
                match,
            };
        })
        .filter((candidate): candidate is CleanupCandidate => candidate !== null)
        .sort((left, right) => right.memoryBytes - left.memoryBytes);
}

function buildPortsByPID(ports: PortInfo[]): Map<number, number[]> {
    const portsByPID = new Map<number, Set<number>>();

    for (const port of ports) {
        if (port.pid <= 0 || port.port <= 0) {
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

function matchedDevelopmentProcessKeyword(process: ProcessInfo): string {
    const tokens = processTokens(process);

    for (const keyword of developmentProcessKeywords) {
        if (tokens.some((token) => tokenMatchesKeyword(token, keyword))) {
            return keyword;
        }
    }

    return '';
}

function processTokens(process: ProcessInfo): string[] {
    return [
        process.name,
        process.path,
        process.commandLine,
    ]
        .join(' ')
        .toLowerCase()
        .split(/[^a-z0-9_.-]+/)
        .filter(Boolean);
}

function tokenMatchesKeyword(token: string, keyword: string): boolean {
    const normalizedKeyword = keyword.toLowerCase();
    if (token === normalizedKeyword) {
        return true;
    }

    if (normalizedKeyword.endsWith('.exe')) {
        return false;
    }

    return token === `${normalizedKeyword}.exe`
        || token.startsWith(`${normalizedKeyword}.`)
        || token.startsWith(`${normalizedKeyword}-`);
}
