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

