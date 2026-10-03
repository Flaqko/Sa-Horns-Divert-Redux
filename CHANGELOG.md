# Changelog

## v1.0 — 2026-10-03

First public CLEO Redux release.

### Added
- CLEO Redux port/remaster of Horns Divert v2.0 by Junior_Djjr.
- Horn-triggered traffic diversion for normal occupied road vehicles ahead of CJ.
- Support for occupied stopped and crawling traffic.
- Minimum temporary maneuver speed for nearly stationary traffic so vehicles can actually pull aside.
- Wider two-stage forward search for improved approaching/oncoming traffic response.
- Automatic restoration of affected drivers to normal traffic behavior after about 3.5 seconds.

### Preserved safeguards
- Mission vehicles are ignored.
- Empty parked vehicles are ignored.
- Siren/alarm vehicles are ignored.
- Unsupported vehicle classes are ignored.
- CJ's vehicle is ignored when hydraulics are active.
- Side clearance is checked before assigning the divert maneuver.

### Optimization
- Fresh horn-press trigger instead of repeated activation while the horn is held.
- Non-blocking restore timer.
- Read-only vehicle memory checks.
- Debug logging disabled for release.

### Credits
- Junior_Djjr — original Horns Divert v2.0 concept and CLEO implementation.
- Flaqko — CLEO Redux port/remaster.
