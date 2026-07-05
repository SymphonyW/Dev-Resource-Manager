package process

import (
	"math"
	"testing"
	"time"
)

func TestProcessCPUSamplerUsesIntervalAndNormalizesByLogicalCPUCount(t *testing.T) {
	sampler := newProcessCPUSampler(4)
	sampledAt := time.Date(2026, 7, 5, 12, 0, 0, 0, time.UTC)

	if percent := sampler.Percent(100, 10, sampledAt); percent != 0 {
		t.Fatalf("first sample should not report a synthetic spike, got %.1f", percent)
	}

	percent := sampler.Percent(100, 12, sampledAt.Add(time.Second))
	if percent != 50 {
		t.Fatalf("expected 50.0%% total-system CPU, got %.1f", percent)
	}
}

func TestProcessCPUSamplerClampsToTotalSystemCapacity(t *testing.T) {
	sampler := newProcessCPUSampler(2)
	sampledAt := time.Date(2026, 7, 5, 12, 0, 0, 0, time.UTC)

	_ = sampler.Percent(100, 10, sampledAt)
	percent := sampler.Percent(100, 20, sampledAt.Add(time.Second))

	if percent != 100 {
		t.Fatalf("expected CPU percent to be capped at 100.0, got %.1f", percent)
	}
}

func TestProcessCPUSamplerPrunesExitedProcesses(t *testing.T) {
	sampler := newProcessCPUSampler(4)
	sampledAt := time.Date(2026, 7, 5, 12, 0, 0, 0, time.UTC)

	_ = sampler.Percent(100, 10, sampledAt)
	_ = sampler.Percent(200, 20, sampledAt)
	sampler.Prune(map[int32]struct{}{200: {}})

	if _, ok := sampler.previous[100]; ok {
		t.Fatalf("expected pid 100 to be pruned")
	}
	if _, ok := sampler.previous[200]; !ok {
		t.Fatalf("expected pid 200 to remain cached")
	}
}

func TestNormalizeCPUPercentRejectsInvalidValues(t *testing.T) {
	if percent := normalizeCPUPercent(math.NaN(), 4); percent != 0 {
		t.Fatalf("expected NaN to normalize to 0, got %.1f", percent)
	}
	if percent := normalizeCPUPercent(math.Inf(1), 4); percent != 0 {
		t.Fatalf("expected infinity to normalize to 0, got %.1f", percent)
	}
}
