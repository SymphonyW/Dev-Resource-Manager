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
		[]string{"NVIDIA GeForce RTX"},
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
		[]string{"NVIDIA GeForce RTX", "NVIDIA GeForce RTX", ""},
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
	if len(info.Names) != 1 || info.Names[0] != "NVIDIA GeForce RTX" {
		t.Fatalf("expected duplicate GPU names to be removed, got %v", info.Names)
	}
}

func TestCachedTotalVRAMReaderReusesSuccessfulValue(t *testing.T) {
	calls := 0
	reader := newCachedTotalVRAMReader(func() (uint64, error) {
		calls += 1
		return 8 * 1024 * 1024 * 1024, nil
	})

	first, err := reader.Read()
	if err != nil {
		t.Fatalf("read first total VRAM value: %v", err)
	}
	second, err := reader.Read()
	if err != nil {
		t.Fatalf("read cached total VRAM value: %v", err)
	}

	if first != second {
		t.Fatalf("expected cached VRAM value %d to match first value %d", second, first)
	}
	if calls != 1 {
		t.Fatalf("expected one underlying total VRAM read, got %d", calls)
	}
}
