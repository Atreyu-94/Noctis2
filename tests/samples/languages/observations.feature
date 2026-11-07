@observatory @calibration
Feature: Calibrate a night's observations
  Positive exposures contribute to the nightly total.

  Background:
    Given the calibration scale is 1.5

  Scenario Outline: Calibrating a single target
    Given an observation of "<target>" lasting <seconds> seconds
    When I calculate its calibrated exposure
    Then the result should be <expected> seconds

    Examples:
      | target | seconds | expected |
      | Vega   | 12      | 18       |
      | Rigel  | 8       | 12       |
