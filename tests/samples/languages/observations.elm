module Observatory exposing (main)
import Html exposing (Html, text)

-- A pure transformation rendered as text.
type alias Observation = { target : String, exposure : Float }
summarize : List Observation -> Float
summarize items =
    items
        |> List.filter (\item -> item.exposure > 0)
        |> List.map (\item -> item.exposure * 1.5)
        |> List.sum

main : Html msg
main =
    text (String.fromFloat (summarize [ Observation "Vega" 12.5 ]))
