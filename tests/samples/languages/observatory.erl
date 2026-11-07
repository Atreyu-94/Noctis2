-module(observatory).
-export([total/1, demo/0]).
-define(SCALE, 1.5).
%% A guarded fold over target/exposure tuples.
total(Items) ->
    lists:foldl(fun
        ({_Target, Value}, Sum) when Value > 0 -> Sum + Value * ?SCALE;
        (_, Sum) -> Sum
    end, 0.0, Items).
demo() ->
    Items = [{<<"Vega">>, 12.5}, {<<"Rigel">>, 8.0}],
    io:format("Total: ~.2f~n", [total(Items)]).
