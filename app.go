package main

import (
	"context"
	"math"
	"time"

	processscanner "dev-resource-manager/internal/process"

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
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	processes, err := processscanner.List(ctx)
	if err != nil {
		return nil, err
	}

	return processes, nil
}
