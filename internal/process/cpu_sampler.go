package process

import (
	"math"
	"runtime"
	"sync"
	"time"
)

var defaultCPUSampler = newProcessCPUSampler(runtime.NumCPU())

type processCPUSampler struct {
	mu          sync.Mutex
	logicalCPUs float64
	previous    map[int32]processCPUSample
}

type processCPUSample struct {
	totalCPUSeconds float64
	sampledAt       time.Time
}

func newProcessCPUSampler(logicalCPUs int) *processCPUSampler {
	if logicalCPUs <= 0 {
		logicalCPUs = 1
	}

	return &processCPUSampler{
		logicalCPUs: float64(logicalCPUs),
		previous:    make(map[int32]processCPUSample),
	}
}

func (sampler *processCPUSampler) Percent(pid int32, totalCPUSeconds float64, sampledAt time.Time) float64 {
	if sampler == nil || pid <= 0 || sampledAt.IsZero() || invalidCPUValue(totalCPUSeconds) {
		return 0
	}

	sampler.mu.Lock()
	defer sampler.mu.Unlock()

	previous, hasPrevious := sampler.previous[pid]
	sampler.previous[pid] = processCPUSample{
		totalCPUSeconds: totalCPUSeconds,
		sampledAt:       sampledAt,
	}

	if !hasPrevious {
		return 0
	}

	elapsedSeconds := sampledAt.Sub(previous.sampledAt).Seconds()
	deltaCPUSeconds := totalCPUSeconds - previous.totalCPUSeconds
	if elapsedSeconds <= 0 || deltaCPUSeconds <= 0 {
		return 0
	}

	return normalizeCPUPercent(deltaCPUSeconds/elapsedSeconds*100, sampler.logicalCPUs)
}

func (sampler *processCPUSampler) Prune(seenPIDs map[int32]struct{}) {
	if sampler == nil {
		return
	}

	sampler.mu.Lock()
	defer sampler.mu.Unlock()

	for pid := range sampler.previous {
		if _, ok := seenPIDs[pid]; !ok {
			delete(sampler.previous, pid)
		}
	}
}

// NormalizeCPUPercent converts gopsutil's per-logical-CPU process percentage into a total-system percentage.
func NormalizeCPUPercent(value float64) float64 {
	return normalizeCPUPercent(value, float64(runtime.NumCPU()))
}

func normalizeCPUPercent(value float64, logicalCPUs float64) float64 {
	if invalidCPUValue(value) {
		return 0
	}
	if logicalCPUs <= 0 {
		logicalCPUs = 1
	}

	percent := value / logicalCPUs
	if percent < 0 {
		return 0
	}
	if percent > 100 {
		return 100
	}

	return roundOneDecimal(percent)
}

func invalidCPUValue(value float64) bool {
	return math.IsNaN(value) || math.IsInf(value, 0)
}
