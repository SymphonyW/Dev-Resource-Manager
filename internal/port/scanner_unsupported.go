//go:build !windows

package port

import (
	"context"
	"fmt"
	"runtime"
)

// List is implemented only for Windows because this app currently targets Windows port management.
func List(ctx context.Context) ([]Info, error) {
	return nil, fmt.Errorf("port scanning is not supported on %s", runtime.GOOS)
}
