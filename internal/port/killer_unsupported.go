//go:build !windows

package port

import (
	"context"
	"fmt"
	"runtime"

	processscanner "dev-resource-manager/internal/process"
)

// KillProcessByPort is implemented only for Windows because this app currently targets Windows port management.
func KillProcessByPort(ctx context.Context, port int, protocol string) processscanner.OperationResult {
	return processscanner.OperationResult{
		Success: false,
		Message: fmt.Sprintf("port-based process termination is not supported on %s", runtime.GOOS),
	}
}

// KillProcessByPortWithProtector is implemented only for Windows because this app currently targets Windows port management.
func KillProcessByPortWithProtector(ctx context.Context, port int, protocol string, protector processscanner.Protector) processscanner.OperationResult {
	return processscanner.OperationResult{
		Success: false,
		Message: fmt.Sprintf("port-based process termination is not supported on %s", runtime.GOOS),
	}
}
