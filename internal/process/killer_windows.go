//go:build windows

package process

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"dev-resource-manager/internal/config"

	gopsprocess "github.com/shirou/gopsutil/v3/process"
	"golang.org/x/sys/windows"
)

type killOperations interface {
	pidsWithContext(ctx context.Context) ([]int32, error)
	nameWithContext(ctx context.Context, pid int32) (string, error)
	killWithContext(ctx context.Context, pid int32) error
}

type gopsutilKillOperations struct{}

func (gopsutilKillOperations) pidsWithContext(ctx context.Context) ([]int32, error) {
	return gopsprocess.PidsWithContext(ctx)
}

func (gopsutilKillOperations) nameWithContext(ctx context.Context, pid int32) (string, error) {
	process, err := gopsprocess.NewProcessWithContext(ctx, pid)
	if err != nil {
		return "", err
	}

	return process.NameWithContext(ctx)
}

func (gopsutilKillOperations) killWithContext(ctx context.Context, pid int32) error {
	process, err := gopsprocess.NewProcessWithContext(ctx, pid)
	if err != nil {
		return err
	}

	return process.KillWithContext(ctx)
}

// KillByPID terminates a non-protected Windows process by PID.
func KillByPID(ctx context.Context, pid int) OperationResult {
	rules, err := config.LoadDefaultProtectionRules(ctx)
	if err != nil {
		return OperationResult{
			Success: false,
			Message: fmt.Sprintf("Unable to load process protection rules before ending PID %d: %v", pid, err),
			PID:     pid,
		}
	}

	return KillByPIDWithProtector(ctx, pid, rules)
}

// KillByPIDWithProtector terminates a non-protected Windows process using supplied protection rules.
func KillByPIDWithProtector(ctx context.Context, pid int, protector Protector) OperationResult {
	return killByPIDWithOperations(ctx, pid, gopsutilKillOperations{}, protector)
}

func killByPID(ctx context.Context, pid int, ops killOperations) OperationResult {
	return killByPIDWithOperations(ctx, pid, ops, config.DefaultProtectionRules())
}

func killByPIDWithOperations(ctx context.Context, pid int, ops killOperations, protector Protector) OperationResult {
	if ctx == nil {
		ctx = context.Background()
	}
	if protector == nil {
		protector = config.DefaultProtectionRules()
	}

	result := OperationResult{PID: pid}
	if err := ctx.Err(); err != nil {
		result.Message = fmt.Sprintf("Unable to end process %d: %v", pid, err)
		return result
	}
	if pid <= 0 {
		result.Message = fmt.Sprintf("PID %d is invalid.", pid)
		return result
	}

	targetPID := int32(pid)
	pids, err := ops.pidsWithContext(ctx)
	if err != nil {
		result.Message = fmt.Sprintf("Unable to inspect running process IDs: %v", err)
		return result
	}
	if !containsPID(pids, targetPID) {
		result.Message = fmt.Sprintf("Process with PID %d does not exist.", pid)
		return result
	}

	processName, err := ops.nameWithContext(ctx, targetPID)
	if err != nil {
		if isAccessDenied(err) {
			result.Message = fmt.Sprintf("Permission denied while inspecting process PID %d. Run as administrator if this process should be manageable.", pid)
		} else {
			result.Message = fmt.Sprintf("Unable to inspect process PID %d before ending it: %v", pid, err)
		}
		return result
	}
	processName = strings.TrimSpace(processName)
	result.ProcessName = processName

	if protector.IsProtectedName(processName) {
		result.Message = fmt.Sprintf("Process %s (PID %d) is protected and cannot be ended.", displayProcessName(processName), pid)
		return result
	}

	if err := ops.killWithContext(ctx, targetPID); err != nil {
		if isAccessDenied(err) {
			result.Message = fmt.Sprintf("Permission denied while ending process %s (PID %d). Run as administrator if this process should be manageable.", displayProcessName(processName), pid)
		} else {
			result.Message = fmt.Sprintf("Failed to end process %s (PID %d): %v", displayProcessName(processName), pid, err)
		}
		return result
	}

	result.Success = true
	result.Message = fmt.Sprintf("Process %s (PID %d) ended.", displayProcessName(processName), pid)
	return result
}

func containsPID(pids []int32, pid int32) bool {
	for _, currentPID := range pids {
		if currentPID == pid {
			return true
		}
	}

	return false
}

func displayProcessName(name string) string {
	if strings.TrimSpace(name) == "" {
		return "Unknown"
	}

	return name
}

func isAccessDenied(err error) bool {
	return errors.Is(err, windows.ERROR_ACCESS_DENIED)
}
