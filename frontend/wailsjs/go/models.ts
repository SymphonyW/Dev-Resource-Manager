export namespace config {
	
	export class OperationLog {
	    id: number;
	    action: string;
	    pid: number;
	    processName: string;
	    port: number;
	    result: string;
	    message: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new OperationLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.action = source["action"];
	        this.pid = source["pid"];
	        this.processName = source["processName"];
	        this.port = source["port"];
	        this.result = source["result"];
	        this.message = source["message"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class ProtectionSettings {
	    defaultProcessNames: string[];
	    customProcessNames: string[];
	
	    static createFrom(source: any = {}) {
	        return new ProtectionSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.defaultProcessNames = source["defaultProcessNames"];
	        this.customProcessNames = source["customProcessNames"];
	    }
	}

}

export namespace detail {
	
	export class ProcessPort {
	    port: number;
	    protocol: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ProcessPort(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.protocol = source["protocol"];
	        this.status = source["status"];
	    }
	}
	export class ProcessDetail {
	    pid: number;
	    processName: string;
	    executablePath: string;
	    executablePathError: string;
	    commandLine: string;
	    commandLineError: string;
	    cpuPercent: number;
	    memoryBytes: number;
	    isProtected: boolean;
	    isDeveloperRelated: boolean;
	    ports: ProcessPort[];
	    portsError: string;
	    recentLogs: config.OperationLog[];
	    logsError: string;
	
	    static createFrom(source: any = {}) {
	        return new ProcessDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.processName = source["processName"];
	        this.executablePath = source["executablePath"];
	        this.executablePathError = source["executablePathError"];
	        this.commandLine = source["commandLine"];
	        this.commandLineError = source["commandLineError"];
	        this.cpuPercent = source["cpuPercent"];
	        this.memoryBytes = source["memoryBytes"];
	        this.isProtected = source["isProtected"];
	        this.isDeveloperRelated = source["isDeveloperRelated"];
	        this.ports = this.convertValues(source["ports"], ProcessPort);
	        this.portsError = source["portsError"];
	        this.recentLogs = this.convertValues(source["recentLogs"], config.OperationLog);
	        this.logsError = source["logsError"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class SystemResourceInfo {
	    cpuPercent: number;
	    totalMemoryBytes: number;
	    usedMemoryBytes: number;
	    freeMemoryBytes: number;
	    gpuPercent: number;
	    totalVRAMBytes: number;
	    usedVRAMBytes: number;
	    freeVRAMBytes: number;
	    processCount: number;
	    portCount: number;
	
	    static createFrom(source: any = {}) {
	        return new SystemResourceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpuPercent = source["cpuPercent"];
	        this.totalMemoryBytes = source["totalMemoryBytes"];
	        this.usedMemoryBytes = source["usedMemoryBytes"];
	        this.freeMemoryBytes = source["freeMemoryBytes"];
	        this.gpuPercent = source["gpuPercent"];
	        this.totalVRAMBytes = source["totalVRAMBytes"];
	        this.usedVRAMBytes = source["usedVRAMBytes"];
	        this.freeVRAMBytes = source["freeVRAMBytes"];
	        this.processCount = source["processCount"];
	        this.portCount = source["portCount"];
	    }
	}

}

export namespace port {
	
	export class Info {
	    port: number;
	    protocol: string;
	    status: string;
	    pid: number;
	    processName: string;
	    processPath: string;
	    isProtected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.protocol = source["protocol"];
	        this.status = source["status"];
	        this.pid = source["pid"];
	        this.processName = source["processName"];
	        this.processPath = source["processPath"];
	        this.isProtected = source["isProtected"];
	    }
	}

}

export namespace process {
	
	export class Info {
	    pid: number;
	    name: string;
	    path: string;
	    commandLine: string;
	    user: string;
	    cpuPercent: number;
	    memoryBytes: number;
	    isProtected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.name = source["name"];
	        this.path = source["path"];
	        this.commandLine = source["commandLine"];
	        this.user = source["user"];
	        this.cpuPercent = source["cpuPercent"];
	        this.memoryBytes = source["memoryBytes"];
	        this.isProtected = source["isProtected"];
	    }
	}
	export class OperationResult {
	    success: boolean;
	    message: string;
	    pid: number;
	    processName: string;
	
	    static createFrom(source: any = {}) {
	        return new OperationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.pid = source["pid"];
	        this.processName = source["processName"];
	    }
	}

}

