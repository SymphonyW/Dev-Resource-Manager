package main

import (
	"sync"
	"time"

	"openend/internal/resource"
)

const (
	dynamicResourceRefreshInterval = 5 * time.Second
	staticResourceRefreshInterval  = time.Minute
)

type asyncSystemResourceCollectors struct {
	CPUInfo     func() cpuResourceInfo
	GPU         func() resource.GPUInfo
	ThreadCount func() int
	PortCount   func() int
}

var defaultAsyncSystemResourceCollectors = newAsyncSystemResourceCollectors()

func newAsyncSystemResourceCollectors() asyncSystemResourceCollectors {
	cpuInfo := newAsyncCachedCollector(collectCPUResourceInfo, staticResourceRefreshInterval)
	gpu := newAsyncCachedCollector(resource.GetGPUInfo, dynamicResourceRefreshInterval)
	threadCount := newAsyncCachedCollector(collectThreadCount, dynamicResourceRefreshInterval)
	portCount := newAsyncCachedCollector(collectPortCount, dynamicResourceRefreshInterval)

	return asyncSystemResourceCollectors{
		CPUInfo:     cpuInfo.Get,
		GPU:         gpu.Get,
		ThreadCount: threadCount.Get,
		PortCount:   portCount.Get,
	}
}

type asyncCachedCollector[T any] struct {
	mu                 sync.Mutex
	collect            func() T
	minRefreshInterval time.Duration
	value              T
	hasValue           bool
	inFlight           bool
	lastStarted        time.Time
}

func newAsyncCachedCollector[T any](collect func() T, minRefreshInterval time.Duration) *asyncCachedCollector[T] {
	return &asyncCachedCollector[T]{
		collect:            collect,
		minRefreshInterval: minRefreshInterval,
	}
}

func (collector *asyncCachedCollector[T]) Get() T {
	var zero T
	if collector == nil || collector.collect == nil {
		return zero
	}

	now := time.Now()
	collector.mu.Lock()
	cached := collector.value
	hasCached := collector.hasValue
	shouldRefresh := !collector.inFlight && (collector.lastStarted.IsZero() || now.Sub(collector.lastStarted) >= collector.minRefreshInterval)
	if shouldRefresh {
		collector.inFlight = true
		collector.lastStarted = now
		collect := collector.collect
		go collector.refresh(collect)
	}
	collector.mu.Unlock()

	if hasCached {
		return cached
	}

	return zero
}

func (collector *asyncCachedCollector[T]) refresh(collect func() T) {
	var next T
	didCollect := false
	defer func() {
		if recover() != nil {
			didCollect = false
		}

		collector.mu.Lock()
		defer collector.mu.Unlock()

		if didCollect {
			collector.value = next
			collector.hasValue = true
		}
		collector.inFlight = false
	}()

	next = collect()
	didCollect = true
}
