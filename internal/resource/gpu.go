package resource

import "math"

// GPUInfo is a best-effort snapshot of GPU engine and dedicated VRAM usage.
type GPUInfo struct {
	GPUPercent     float64
	TotalVRAMBytes uint64
	UsedVRAMBytes  uint64
	FreeVRAMBytes  uint64
}

type gpuEngineCounter struct {
	Name                  string
	UtilizationPercentage uint64
}

type gpuMemoryCounter struct {
	Name           string
	DedicatedUsage uint64
	SharedUsage    uint64
	TotalCommitted uint64
}

func buildGPUInfo(engineCounters []gpuEngineCounter, memoryCounters []gpuMemoryCounter, totalVRAMBytes uint64) GPUInfo {
	var gpuPercent float64
	for _, counter := range engineCounters {
		gpuPercent += float64(counter.UtilizationPercentage)
	}

	var usedVRAMBytes uint64
	for _, counter := range memoryCounters {
		usedVRAMBytes += counter.DedicatedUsage
	}

	var freeVRAMBytes uint64
	if totalVRAMBytes > usedVRAMBytes {
		freeVRAMBytes = totalVRAMBytes - usedVRAMBytes
	}

	return GPUInfo{
		GPUPercent:     roundOneDecimal(clampPercent(gpuPercent)),
		TotalVRAMBytes: totalVRAMBytes,
		UsedVRAMBytes:  usedVRAMBytes,
		FreeVRAMBytes:  freeVRAMBytes,
	}
}

func roundOneDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}

func clampPercent(value float64) float64 {
	if !isFinite(value) {
		return 0
	}

	return math.Min(100, math.Max(0, value))
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
