(ns observatory.core
  (:require [clojure.string :as str]))
;; Filter and calibrate a night's observations.
(def scale 1.5)
(def observations [{:target "Vega" :exposure 12.5}
                   {:target "Rigel" :exposure 8.0}])
(defn summarize [items]
  {:targets (str/join ", " (map :target items))
   :total (->> items
               (filter #(pos? (:exposure %)))
               (map #(* scale (:exposure %)))
               (reduce + 0))})
(println (summarize observations))
