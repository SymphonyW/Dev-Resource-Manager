package resource

import "testing"

func TestBuildGPUInfoClampsAggregatedEngineUsage(t *testing.T) {
	info := buildGPUInfo(
		[]gpuEngineCounter{
			{UtilizationPercentage: 70},
			{UtilizationPercentage: 55},
		},
		[]gpuMemoryCounter{
			{DedicatedUsage: 3 * 1024 * 1024 * 1024},
		},
		8*1024*1024*1024,
	)

	if info.GPUPercent != 100 {
		t.Fatalf("expected GPU percent to be clamped to 100, got %.1f", info.GPUPercent)
	}
}

func TestBuildGPUInfoCalculatesVRAMUsage(t *testing.T) {
	info := buildGPUInfo(
		[]gpuEngineCounter{
			{UtilizationPercentage: 12},
		},
		[]gpuMemoryCounter{
			{DedicatedUsage: 2 * 1024 * 1024 * 1024},
			{DedicatedUsage: 1024 * 1024 * 1024},
		},
		8*1024*1024*1024,
	)

	if info.GPUPercent != 12.0 {
		t.Fatalf("expected rounded GPU percent 12.0, got %.1f", info.GPUPercent)
	}
	if info.TotalVRAMBytes != 8*1024*1024*1024 {
		t.Fatalf("expected total VRAM to be retained, got %d", info.TotalVRAMBytes)
	}
	if info.UsedVRAMBytes != 3*1024*1024*1024 {
		t.Fatalf("expected used VRAM to be summed, got %d", info.UsedVRAMBytes)
	}
	if info.FreeVRAMBytes != 5*1024*1024*1024 {
		t.Fatalf("expected free VRAM to be calculated, got %d", info.FreeVRAMBytes)
	}
}
