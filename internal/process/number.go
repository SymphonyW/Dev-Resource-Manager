package process

import "math"

func roundOneDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}
