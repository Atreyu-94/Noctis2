-- A self-contained query over inline measurement data.
WITH observations(target, exposure) AS (
    VALUES ('Vega', 12.5), ('Rigel', 8.0), ('Deneb', NULL)
), calibrated AS (
    SELECT target, COALESCE(exposure, 0) * 1.5 AS seconds
    FROM observations
)
SELECT target,
       ROUND(seconds, 2) AS calibrated_seconds,
       CASE WHEN seconds > 0 THEN 'ready' ELSE 'missing' END AS status,
       SUM(seconds) OVER () AS nightly_total
FROM calibrated
ORDER BY seconds DESC;
