//go:build windows

package port

import (
	"context"
	"fmt"
	"strings"

	processscanner "dev-resource-manager/internal/process"

	gopsnet "github.com/shirou/gopsutil/v3/net"
)

type portKillOperations interface {
	connectionsWithContext(ctx context.Context, protocol string) ([]gopsnet.ConnectionStat, error)
	killProcessByPID(ctx context.Context, pid int) processscanner.OperationResult
}

type gopsutilPortKillOperations struct{}

func (gopsutilPortKillOperations) connectionsWithContext(ctx context.Context, protocol string) ([]gopsnet.ConnectionStat, error) {
	return gopsnet.ConnectionsWithContext(ctx, protocol)
}

func (gopsutilPortKillOperations) killProcessByPID(ctx context.Context, pid int) processscanner.OperationResult {
	return processscanner.KillByPID(ctx, pid)
}

// KillProcessByPort resolves the current port owner PID and ends that process if it is allowed.
func KillProcessByPort(ctx context.Context, port int, protocol string) processscanner.OperationResult {
	return killProcessByPort(ctx, port, protocol, gopsutilPortKillOperations{})
}

func killProcessByPort(ctx context.Context, port int, protocol string, ops portKillOperations) processscanner.OperationResult {
	if ctx == nil {
		ctx = context.Background()
	}

	result := processscanner.OperationResult{PID: 0}
	if err := ctx.Err(); err != nil {
		result.Message = fmt.Sprintf("Unable to end process occupying port %d/%s: %v", port, strings.ToUpper(strings.TrimSpace(protocol)), err)
		return result
	}
	if port <= 0 {
		result.Message = fmt.Sprintf("Port %d is invalid.", port)
		return result
	}

	protocolKey, protocolLabel, ok := normalizeKillProtocol(protocol)
	if !ok {
		result.Message = fmt.Sprintf("Unsupported protocol %q. Only TCP and UDP are supported.", protocol)
		return result
	}

	connections, err := ops.connectionsWithContext(ctx, protocolKey)
	if err != nil {
		result.Message = fmt.Sprintf("Unable to inspect %s port %d ownership: %v", protocolLabel, port, err)
		return result
	}

	pids := uniquePIDsForPort(connections, port)
	if len(pids) == 0 {
		result.Message = fmt.Sprintf("No %s process found on port %d.", protocolLabel, port)
		return result
	}
	if len(pids) > 1 {
		result.Message = fmt.Sprintf("%s port %d is owned by multiple PIDs (%s); refusing to end a process without a single owner.", protocolLabel, port, formatPIDList(pids))
		return result
	}

	return ops.killProcessByPID(ctx, int(pids[0]))
}

func normalizeKillProtocol(protocol string) (key string, label string, ok bool) {
	normalized := strings.ToUpper(strings.TrimSpace(protocol))
	switch normalized {
	case ProtocolTCP:
		return "tcp", ProtocolTCP, true
	case ProtocolUDP:
		return "udp", ProtocolUDP, true
	default:
		return "", normalized, false
	}
}

func uniquePIDsForPort(connections []gopsnet.ConnectionStat, port int) []int32 {
	seen := make(map[int32]struct{})
	pids := make([]int32, 0, 1)

	for _, connection := range connections {
		if int(connection.Laddr.Port) != port || connection.Pid <= 0 {
			continue
		}
		if _, exists := seen[connection.Pid]; exists {
			continue
		}

		seen[connection.Pid] = struct{}{}
		pids = append(pids, connection.Pid)
	}

	return pids
}

func formatPIDList(pids []int32) string {
	values := make([]string, 0, len(pids))
	for _, pid := range pids {
		values = append(values, fmt.Sprintf("%d", pid))
	}

	return strings.Join(values, ", ")
}
