package process

// OperationResult is returned by process management actions.
type OperationResult struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	PID         int    `json:"pid"`
	ProcessName string `json:"processName"`
}
