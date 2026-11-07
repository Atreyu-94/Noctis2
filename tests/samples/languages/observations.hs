module Main where
-- Records, pattern matching and a list comprehension.
data Observation = Observation { target :: String, exposure :: Double }
  deriving (Show)
calibrate :: Observation -> Double
calibrate (Observation _ seconds) = seconds * 1.5
summarize :: [Observation] -> Double
summarize items = sum [calibrate item | item <- items, exposure item > 0]
main :: IO ()
main = do
  let items = [Observation "Vega" 12.5, Observation "Rigel" 8.0]
  putStrLn $ "Total: " ++ show (summarize items)
