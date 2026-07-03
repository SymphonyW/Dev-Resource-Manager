//go:build !windows

package process

import (
	"context"
	"fmt"
	"runtime"
)

// KillByPID is implemented only for Windows because this app currently targets Windows process management.
func KillByPID(ctx context.Context, pid int) OperationResult {
	return OperationResult{
		Success: false,
		Message: fmt.Sprintf("process termination is not supported on %s", runtime.GOOS),
		PID:     pid,
	}
}
