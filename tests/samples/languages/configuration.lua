-- A small observing scheduler. Runs as plain Lua or with Neovim's -l option.
local Observatory = {}
Observatory.__index = Observatory

local DEFAULT_EXPOSURE = 2.5
local bands = { visible = true, infrared = true }

---Create a scheduler with an independent queue.
---@param name string
---@return table
function Observatory.new(name)
  return setmetatable({ name = name, queue = {}, completed = 0 }, Observatory)
end

---@param target string
---@param options table|nil
function Observatory:add(target, options)
  options = options or {}
  local band = options.band or "visible"
  assert(bands[band], "Unknown observing band: " .. band)
  assert(target:match("^%a[%w%s%-]*$"), "Invalid target name")

  local exposure = options.exposure or DEFAULT_EXPOSURE
  assert(exposure > 0, "Exposure must be positive")
  self.queue[#self.queue + 1] = {
    target = target,
    band = band,
    exposure = exposure,
    enabled = options.enabled ~= false,
  }
end

function Observatory:run(on_observation)
  local total = 0
  for index, observation in ipairs(self.queue) do
    if observation.enabled then
      local ok, message = pcall(on_observation, observation, index)
      if not ok then
        error("Observation failed: " .. tostring(message))
      end
      total = total + observation.exposure
      self.completed = self.completed + 1
    end
  end
  return total
end

--[[ The callback receives data only: this demonstration never talks to hardware.
     Long strings, comments and escaped strings exercise different captures. ]]
local description = [=[
Noctis2 observing session
Units: seconds; bands: visible and infrared.
]=]

local telescope = Observatory.new("North dome")
telescope:add("Vega")
telescope:add("Deneb", { band = "infrared", exposure = 4.0 })
telescope:add("Altair", { exposure = 1.5, enabled = true })

local elapsed = telescope:run(function(observation, index)
  print(string.format("%02d\t%-8s %.1f s", index, observation.target, observation.exposure))
end)

assert(telescope.completed == 3)
assert(elapsed == 8.0)
print(description .. string.format("Total: %.1f s\n", elapsed))
return Observatory
