package main

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"dev-resource-manager/internal/config"
	processdetail "dev-resource-manager/internal/detail"
	portscanner "dev-resource-manager/internal/port"
	processscanner "dev-resource-manager/internal/process"
	"dev-resource-manager/internal/resource"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	gopsprocess "github.com/shirou/gopsutil/v3/process"
)

// SystemResourceInfo is the resource snapshot returned to the frontend.
type SystemResourceInfo struct {
	CPUPercent       float64 `json:"cpuPercent"`
	TotalMemoryBytes uint64  `json:"totalMemoryBytes"`
	UsedMemoryBytes  uint64  `json:"usedMemoryBytes"`
	FreeMemoryBytes  uint64  `json:"freeMemoryBytes"`
	GPUPercent       float64 `json:"gpuPercent"`
	TotalVRAMBytes   uint64  `json:"totalVRAMBytes"`
	UsedVRAMBytes    uint64  `json:"usedVRAMBytes"`
	FreeVRAMBytes    uint64  `json:"freeVRAMBytes"`
	ProcessCount     int     `json:"processCount"`
	PortCount        int     `json:"portCount"`
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// AppName returns the desktop application name through the Wails binding.
func (a *App) AppName() string {
	return "Dev Resource Manager"
}

// GetSystemResourceInfo returns a best-effort snapshot of local system usage.
func (a *App) GetSystemResourceInfo() SystemResourceInfo {
	info := SystemResourceInfo{}

	if percentages, err := cpu.Percent(200*time.Millisecond, false); err == nil && len(percentages) > 0 {
		info.CPUPercent = roundOneDecimal(percentages[0])
	} else {
		// TODO: surface CPU collection errors to the frontend diagnostics panel.
		info.CPUPercent = 0
	}

	if memory, err := mem.VirtualMemory(); err == nil {
		info.TotalMemoryBytes = memory.Total
		info.UsedMemoryBytes = memory.Used
		info.FreeMemoryBytes = memory.Available
	} else {
		// TODO: surface memory collection errors to the frontend diagnostics panel.
		info.TotalMemoryBytes = 0
		info.UsedMemoryBytes = 0
		info.FreeMemoryBytes = 0
	}

	gpuInfo := resource.GetGPUInfo()
	info.GPUPercent = gpuInfo.GPUPercent
	info.TotalVRAMBytes = gpuInfo.TotalVRAMBytes
	info.UsedVRAMBytes = gpuInfo.UsedVRAMBytes
	info.FreeVRAMBytes = gpuInfo.FreeVRAMBytes

	if pids, err := gopsprocess.Pids(); err == nil {
		info.ProcessCount = len(pids)
	} else {
		// TODO: surface process collection permission errors to the frontend diagnostics panel.
		info.ProcessCount = 0
	}

	if connections, err := net.Connections("inet"); err == nil {
		ports := make(map[uint32]struct{})
		for _, connection := range connections {
			if connection.Laddr.Port > 0 {
				ports[connection.Laddr.Port] = struct{}{}
			}
		}
		info.PortCount = len(ports)
	} else {
		// TODO: surface port collection permission errors to the frontend diagnostics panel.
		info.PortCount = 0
	}

	return info
}

func roundOneDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}

// GetProcessList returns the current Windows process list for the frontend.
func (a *App) GetProcessList() ([]processscanner.Info, error) {
	ctx := a.appContext()
	rules, err := a.loadProtectionRules(ctx)
	if err != nil {
		return nil, err
	}

	processes, err := processscanner.ListWithProtector(ctx, rules)
	if err != nil {
		return nil, err
	}

	return processes, nil
}

// GetProcessDetail returns a single process detail view with ports and recent logs.
func (a *App) GetProcessDetail(pid int) (processdetail.ProcessDetail, error) {
	ctx := a.appContext()
	rules, err := a.loadProtectionRules(ctx)
	if err != nil {
		return processdetail.ProcessDetail{}, err
	}

	snapshot, err := processdetail.ReadProcessSnapshot(ctx, int32(pid), rules)
	if err != nil {
		return processdetail.ProcessDetail{}, err
	}

	ports, portsError := a.processDetailPorts(ctx, rules)
	logs, logsError := a.processDetailLogs(ctx, pid, snapshot.ProcessName)

	return processdetail.BuildProcessDetail(snapshot, ports, logs, portsError, logsError), nil
}

// GetPortList returns the current Windows TCP/UDP port occupancy list for the frontend.
func (a *App) GetPortList() ([]portscanner.Info, error) {
	ctx := a.appContext()
	rules, err := a.loadProtectionRules(ctx)
	if err != nil {
		return nil, err
	}

	ports, err := portscanner.ListWithProtector(ctx, rules)
	if err != nil {
		return nil, err
	}

	return ports, nil
}

func (a *App) processDetailPorts(ctx context.Context, rules config.ProtectionRules) ([]portscanner.Info, string) {
	ports, err := portscanner.ListWithProtector(ctx, rules)
	if err != nil {
		return nil, "Unable to load occupied ports for this process: " + err.Error()
	}

	return ports, ""
}

func (a *App) processDetailLogs(ctx context.Context, pid int, processName string) ([]config.OperationLog, string) {
	store, err := config.NewDefaultStore()
	if err != nil {
		return nil, "Unable to open operation log store: " + err.Error()
	}
	defer store.Close()

	logs, err := store.GetRecentOperationLogsForProcess(ctx, pid, processName, processdetail.RecentLogLimit())
	if err != nil {
		return nil, "Unable to load recent operation logs: " + err.Error()
	}

	return logs, ""
}

// KillProcessByPID ends a non-protected process by PID and returns an operation result.
func (a *App) KillProcessByPID(pid int) processscanner.OperationResult {
	ctx := a.appContext()
	rules, err := a.loadProtectionRules(ctx)
	if err != nil {
		result := processscanner.OperationResult{
			Success: false,
			Message: "Unable to load process protection rules before ending process: " + err.Error(),
			PID:     pid,
		}
		return a.recordOperationLog(ctx, "kill_process_by_pid", 0, result)
	}

	result := processscanner.KillByPIDWithProtector(ctx, pid, rules)
	return a.recordOperationLog(ctx, "kill_process_by_pid", 0, result)
}

// KillProcessByPort resolves a port owner and ends the owning process if it is allowed.
func (a *App) KillProcessByPort(port int, protocol string) processscanner.OperationResult {
	ctx := a.appContext()
	rules, err := a.loadProtectionRules(ctx)
	if err != nil {
		result := processscanner.OperationResult{
			Success: false,
			Message: "Unable to load process protection rules before ending port occupancy: " + err.Error(),
		}
		return a.recordOperationLog(ctx, "kill_process_by_port", port, result)
	}

	result := portscanner.KillProcessByPortWithProtector(ctx, port, protocol, rules)
	return a.recordOperationLog(ctx, "kill_process_by_port", port, result)
}

// GetProtectionSettings returns the built-in and user-managed protected process names.
func (a *App) GetProtectionSettings() (config.ProtectionSettings, error) {
	store, err := config.NewDefaultStore()
	if err != nil {
		return config.ProtectionSettings{}, err
	}
	defer store.Close()

	return store.GetProtectionSettings(a.appContext())
}

// AddCustomProtectedProcessName adds a user-managed protected process name.
func (a *App) AddCustomProtectedProcessName(name string) (config.ProtectionSettings, error) {
	store, err := config.NewDefaultStore()
	if err != nil {
		return config.ProtectionSettings{}, err
	}
	defer store.Close()

	return store.AddCustomProtectedProcessName(a.appContext(), name)
}

// DeleteCustomProtectedProcessName removes a user-managed protected process name.
func (a *App) DeleteCustomProtectedProcessName(name string) (config.ProtectionSettings, error) {
	store, err := config.NewDefaultStore()
	if err != nil {
		return config.ProtectionSettings{}, err
	}
	defer store.Close()

	return store.DeleteCustomProtectedProcessName(a.appContext(), name)
}

// GetOperationLogs returns persisted process operation logs ordered newest first.
func (a *App) GetOperationLogs() ([]config.OperationLog, error) {
	store, err := config.NewDefaultStore()
	if err != nil {
		return nil, err
	}
	defer store.Close()

	return store.GetOperationLogs(a.appContext())
}

// GetRecentOperationLogsForResource returns bounded logs related to one detail target.
func (a *App) GetRecentOperationLogsForResource(pid int, processName string, ports []int) ([]config.OperationLog, error) {
	store, err := config.NewDefaultStore()
	if err != nil {
		return nil, err
	}
	defer store.Close()

	return store.GetRecentOperationLogsForResource(a.appContext(), pid, processName, ports, processdetail.RecentLogLimit())
}

func (a *App) appContext() context.Context {
	if a.ctx == nil {
		return context.Background()
	}

	return a.ctx
}

func (a *App) loadProtectionRules(ctx context.Context) (config.ProtectionRules, error) {
	store, err := config.NewDefaultStore()
	if err != nil {
		return config.ProtectionRules{}, err
	}
	defer store.Close()

	rules, err := store.LoadProtectionRules(ctx)
	if err != nil {
		return config.ProtectionRules{}, err
	}

	return rules, nil
}

func (a *App) recordOperationLog(ctx context.Context, action string, port int, result processscanner.OperationResult) processscanner.OperationResult {
	store, err := config.NewDefaultStore()
	if err != nil {
		return appendOperationLogError(result, err)
	}
	defer store.Close()

	logResult := "failure"
	if result.Success {
		logResult = "success"
	}

	err = store.AddOperationLog(ctx, config.OperationLogInput{
		Action:      action,
		PID:         result.PID,
		ProcessName: result.ProcessName,
		Port:        port,
		Result:      logResult,
		Message:     result.Message,
	})
	if err != nil {
		return appendOperationLogError(result, err)
	}

	return result
}

func appendOperationLogError(result processscanner.OperationResult, err error) processscanner.OperationResult {
	if err == nil {
		return result
	}

	baseMessage := strings.TrimSpace(result.Message)
	logMessage := fmt.Sprintf("Operation log write failed: %v", err)
	if baseMessage == "" {
		result.Message = logMessage
		return result
	}

	result.Message = baseMessage + " " + logMessage
	return result
}
