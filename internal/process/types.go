package process

// Info is the process row returned to the Wails frontend.
type Info struct {
	PID         int32   `json:"pid"`
	Name        string  `json:"name"`
	Path        string  `json:"path"`
	CommandLine string  `json:"commandLine"`
	User        string  `json:"user"`
	CPUPercent  float64 `json:"cpuPercent"`
	MemoryBytes uint64  `json:"memoryBytes"`
	IsProtected bool    `json:"isProtected"`
}
