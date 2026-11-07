(* Records, labelled arguments and list pipelines. *)
type observation = { target : string; exposure : float }
let calibrated ?(scale = 1.5) item = item.exposure *. scale
let total items =
  items
  |> List.filter (fun item -> item.exposure > 0.)
  |> List.fold_left (fun sum item -> sum +. calibrated item) 0.
let () =
  let items = [{ target = "Vega"; exposure = 12.5 };
               { target = "Rigel"; exposure = 8. }] in
  Printf.printf "Total: %.2f\n" (total items)
