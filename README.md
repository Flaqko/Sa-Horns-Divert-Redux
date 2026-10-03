# Horns Divert Redux v1.0

A CLEO Redux port/remaster of **Horns Divert v2.0 (2019)** by **Junior_Djjr**.

Remaster/port by **Flaqko** for **GTA San Andreas Classic 1.0 + CLEO Redux**.

## What it does

While CJ is driving a normal road vehicle, tap the horn near occupied traffic ahead. The traffic driver temporarily pulls/diverts toward a clear side and then returns to normal traffic behavior after about 3.5 seconds.

Compared with the original mod, this remaster also allows occupied stopped/crawling traffic to react and uses a wider forward search so approaching/oncoming traffic can respond more reliably.

## v1.0 behavior

- Moving traffic ahead can pull aside when CJ honks.
- Occupied stopped or crawling traffic can now react.
- Slow/stopped cars receive a small temporary maneuver speed so they can actually move aside.
- Wider forward coverage improves reactions from approaching/oncoming traffic.
- Empty parked cars remain ignored.
- Mission vehicles are ignored.
- Vehicles with an active siren/alarm state are ignored.
- Unsupported vehicle types are ignored.
- CJ's vehicle is ignored if it has hydraulics.
- The side path is checked before the divert maneuver is assigned.
- The traffic driver returns to normal wandering after about 3.5 seconds.

## Optimization

- Uses a fresh horn press as the trigger instead of repeatedly searching every frame while the horn is held.
- Uses a non-blocking restore timer.
- Memory access is read-only and limited to the Classic SA vehicle fields needed for the original safety/filtering behavior.
- Debug logging is disabled in the release build.

## Install

Copy the folder:

`HornsDivert[mem]`

into your GTA San Andreas `CLEO` folder.

Keep **`[mem]`** in the folder name because this mod uses read-only vehicle memory checks.

## Credits

- **Junior_Djjr** — original Horns Divert v2.0 concept and CLEO implementation.
- **Flaqko** — CLEO Redux port/remaster.
