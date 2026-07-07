//go:build !windows

package detail

import (
	"context"
	"fmt"
	"runtime"

	processscanner "dev-resource-manager/internal/process"
)

// ReadProcessSnapshot is implemented only for Windows because this app targets Windows process management.
func ReadProcessSnapshot(ctx context.Context, pid int32, protector processscanner.Protector) (ProcessSnapshot, error) {
	return ProcessSnapshot{}, fmt.Errorf("process detail is not supported on %s", runtime.GOOS)
}
