//go:build !windows

package process

import (
	"context"
	"fmt"
	"runtime"
)

// List is implemented only for Windows because this app currently targets Windows process management.
func List(ctx context.Context) ([]Info, error) {
	return nil, fmt.Errorf("process scanning is not supported on %s", runtime.GOOS)
}

// ListWithProtector is implemented only for Windows because this app currently targets Windows process management.
func ListWithProtector(ctx context.Context, protector Protector) ([]Info, error) {
	return nil, fmt.Errorf("process scanning is not supported on %s", runtime.GOOS)
}
