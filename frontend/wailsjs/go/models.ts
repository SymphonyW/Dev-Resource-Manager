export namespace main {

	export class SystemResourceInfo {
	    cpuPercent: number;
	    totalMemoryBytes: number;
	    usedMemoryBytes: number;
	    freeMemoryBytes: number;
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

}
