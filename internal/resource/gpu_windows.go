//go:build windows

package resource

import (
	"fmt"

	"github.com/yusufpapurcu/wmi"
	"golang.org/x/sys/windows/registry"
)

const displayAdapterClassRegistryPath = `SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}`

var defaultTotalVRAMReader = newCachedTotalVRAMReader(readTotalVRAMBytes)

// GetGPUInfo returns a Windows GPU usage snapshot from WMI performance counters.
func GetGPUInfo() GPUInfo {
	engineCounters, err := queryGPUEngineCounters()
	if err != nil {
		// TODO: surface GPU engine counter collection errors to the frontend diagnostics panel.
		engineCounters = nil
	}

	memoryCounters, err := queryGPUMemoryCounters()
	if err != nil {
		// TODO: surface GPU memory counter collection errors to the frontend diagnostics panel.
		memoryCounters = nil
	}

	totalVRAMBytes, err := defaultTotalVRAMReader.Read()
	if err != nil {
		// TODO: expose a precise driver-level VRAM total when neither registry nor WMI can provide it.
		totalVRAMBytes = 0
	}

	return buildGPUInfo(engineCounters, memoryCounters, totalVRAMBytes)
}

func queryGPUEngineCounters() ([]gpuEngineCounter, error) {
	var counters []gpuEngineCounter
	err := wmi.QueryNamespace(
		"SELECT Name, UtilizationPercentage FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine",
		&counters,
		"ROOT\\CIMV2",
	)
	if err != nil {
		return nil, fmt.Errorf("query GPU engine counters: %w", err)
	}

	return counters, nil
}

func queryGPUMemoryCounters() ([]gpuMemoryCounter, error) {
	var counters []gpuMemoryCounter
	err := wmi.QueryNamespace(
		"SELECT Name, DedicatedUsage, SharedUsage, TotalCommitted FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory",
		&counters,
		"ROOT\\CIMV2",
	)
	if err != nil {
		return nil, fmt.Errorf("query GPU memory counters: %w", err)
	}

	return counters, nil
}

func readTotalVRAMBytes() (uint64, error) {
	totalVRAMBytes := readTotalVRAMBytesFromRegistry()
	if totalVRAMBytes > 0 {
		return totalVRAMBytes, nil
	}

	totalVRAMBytes, err := readTotalVRAMBytesFromWMI()
	if err != nil {
		return 0, err
	}
	if totalVRAMBytes == 0 {
		return 0, fmt.Errorf("no GPU VRAM total found")
	}

	return totalVRAMBytes, nil
}

func readTotalVRAMBytesFromRegistry() uint64 {
	var totalVRAMBytes uint64
	for index := 0; index < 100; index += 1 {
		keyPath := fmt.Sprintf(`%s\%04d`, displayAdapterClassRegistryPath, index)
		key, err := registry.OpenKey(registry.LOCAL_MACHINE, keyPath, registry.QUERY_VALUE)
		if err != nil {
			continue
		}

		memorySize, _, err := key.GetIntegerValue("HardwareInformation.qwMemorySize")
		_ = key.Close()
		if err == nil && memorySize > 0 {
			totalVRAMBytes += memorySize
		}
	}

	return totalVRAMBytes
}

type videoController struct {
	AdapterRAM *uint64
}

func readTotalVRAMBytesFromWMI() (uint64, error) {
	var controllers []videoController
	err := wmi.QueryNamespace(
		"SELECT AdapterRAM FROM Win32_VideoController",
		&controllers,
		"ROOT\\CIMV2",
	)
	if err != nil {
		return 0, fmt.Errorf("query video controller VRAM total: %w", err)
	}

	var totalVRAMBytes uint64
	for _, controller := range controllers {
		if controller.AdapterRAM != nil {
			totalVRAMBytes += *controller.AdapterRAM
		}
	}

	return totalVRAMBytes, nil
}
