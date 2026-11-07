# Data-only configuration: no providers or resources are created.
variable "scale" {
  type    = number
  default = 1.5
  validation {
    condition     = var.scale > 0
    error_message = "Scale must be positive."
  }
}
locals {
  exposures = { Vega = 12.5, Rigel = 8.0 }
  calibrated = { for target, value in local.exposures : target => value * var.scale }
}
output "report" { value = local.calibrated }
