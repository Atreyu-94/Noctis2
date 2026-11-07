# A data frame with vectorized calibration and aggregation.
observations <- data.frame(
  target = c("Vega", "Rigel", "Deneb"),
  exposure = c(12.5, 8.0, NA_real_)
)
calibrate <- function(value, scale = 1.5) {
  ifelse(is.na(value) | value < 0, 0, value * scale)
}
observations$calibrated <- calibrate(observations$exposure)
total <- sum(observations$calibrated)
print(subset(observations, calibrated > 0))
cat(sprintf("Calibrated total: %.2f\n", total))
