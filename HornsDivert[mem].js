// Horns Divert Redux v1.0
// Original mod: Horns Divert v2.0 by Junior_Djjr (2019)
// CLEO Redux remaster/port by Flaqko
// Target: GTA San Andreas Classic 1.0 + CLEO Redux
//
// v1.0 expands the original behavior so occupied slow/stopped traffic can
// actually pull away from the horn, and uses a two-stage forward search to
// improve coverage of approaching/oncoming traffic without scanning behind CJ.

const MOD = "HornsDivertRedux";
const DEBUG = false;

const PLAYER_ID = 0;

// Two forward-only search bubbles.  The near bubble handles the vehicle right
// in front of CJ; the far bubble gives approaching/oncoming traffic more time
// to be found before it passes the player.
const NEAR_SEARCH_FORWARD = 10.0;
const NEAR_SEARCH_RADIUS = 8.0;
const FAR_SEARCH_FORWARD = 20.0;
const FAR_SEARCH_RADIUS = 10.0;

// The original required target speed > 4.0.  In Redux v1.0 we allow an
// occupied stopped/crawling traffic car, but give it a small maneuver speed so
// a 0-speed car is not assigned a 0-speed drive task.
const MIN_DIVERT_DRIVE_SPEED = 8.0;
const DIVERT_TIME_MS = 3500;
const RETRIGGER_DELAY_MS = 500;

// GTA SA Classic 1.0 CVehicle offsets used by the original script.
const OFF_CREATED_BY = 0x4A4;
const OFF_SUBCLASS = 0x594;
const OFF_SIREN_OR_ALARM_PLAYING = 0x1F7;

// eVehicleCreatedBy
const CREATED_BY_MISSION = 2;

// CVehicle::m_nVehicleSubClass values used by Junior_Djjr's original.
const VEHICLE_AUTOMOBILE = 0;
const VEHICLE_MTRUCK = 1;
const VEHICLE_QUAD = 2;
const VEHICLE_BIKE = 9;
const VEHICLE_BMX = 10;

const player = new Player(PLAYER_ID);

let hornWasDown = false;
let nextTriggerAt = 0;
let active = null;

function dbg(message) {
    if (DEBUG) {
        log(`[${MOD}] ${message}`);
    }
}

function now() {
    return Date.now();
}

function isValidCar(car) {
    try {
        return car && Car.DoesExist(car);
    } catch (e) {
        return false;
    }
}

function isValidChar(char) {
    try {
        return char && Char.DoesExist(char);
    } catch (e) {
        return false;
    }
}

function getVehiclePointer(car) {
    try {
        return Memory.GetVehiclePointer(car);
    } catch (e) {
        return 0;
    }
}

function getVehicleSubclass(car) {
    const ptr = getVehiclePointer(car);
    if (!ptr) return -1;
    return Memory.ReadI32(ptr + OFF_SUBCLASS, false);
}

function isMissionVehicle(car) {
    const ptr = getVehiclePointer(car);
    if (!ptr) return true;
    return Memory.ReadU8(ptr + OFF_CREATED_BY, false) === CREATED_BY_MISSION;
}

function isSirenOrAlarmPlaying(car) {
    const ptr = getVehiclePointer(car);
    if (!ptr) return true;
    return Memory.ReadU8(ptr + OFF_SIREN_OR_ALARM_PLAYING, false) !== 0;
}

function playerVehicleSupported(car) {
    const type = getVehicleSubclass(car);
    return type >= VEHICLE_AUTOMOBILE && type <= VEHICLE_QUAD;
}

function targetVehicleSupported(car) {
    const type = getVehicleSubclass(car);
    return (
        (type >= VEHICLE_AUTOMOBILE && type <= VEHICLE_QUAD) ||
        type === VEHICLE_BIKE ||
        type === VEHICLE_BMX
    );
}

function restoreTrafficCar() {
    if (!active) return;

    const car = active.car;
    const driver = active.driver;

    try {
        if (isValidCar(car) && isValidChar(driver)) {
            driver.clearTasks();
            car.wanderRandomly();
            dbg("Traffic driver restored to normal wandering.");
        }
    } catch (e) {
        dbg(`Restore skipped: ${e}`);
    }

    active = null;
}

function getEligibleTrafficCar(playerCar, forward, radius) {
    const center = playerCar.getOffsetInWorldCoords(0.0, forward, 0.0);

    let car;
    try {
        car = World.GetRandomCarInSphereNoSaveRecursive(
            center.x,
            center.y,
            center.z,
            radius,
            false,
            true
        );
    } catch (e) {
        dbg(`Vehicle search failed: ${e}`);
        return null;
    }

    if (!isValidCar(car)) return null;
    if (getVehiclePointer(car) === getVehiclePointer(playerCar)) return null;
    if (!targetVehicleSupported(car)) return null;
    if (isMissionVehicle(car)) return null;
    if (isSirenOrAlarmPlaying(car)) return null;

    // This is the parked-car safeguard for v1.0: stopped traffic is allowed,
    // but a parked/empty car still has no valid driver and is rejected.
    const driver = car.getDriver();
    if (!isValidChar(driver)) return null;

    return {
        car: car,
        driver: driver
    };
}

function tryDivertTraffic() {
    const playerChar = player.getChar();
    if (!isValidChar(playerChar) || !playerChar.isInAnyCar()) return;

    const playerCar = playerChar.getCarIsUsing();
    if (!isValidCar(playerCar)) return;

    // Original only allows ordinary four-wheel road vehicles as CJ's vehicle.
    if (!playerVehicleSupported(playerCar)) return;

    // Preserve original lowrider/hydraulics exclusion.
    if (playerCar.doesHaveHydraulics()) return;

    // Prefer the traffic car immediately ahead. If nothing eligible is found,
    // try a second bubble farther up the road. This makes oncoming traffic much
    // more likely to react before it has already passed CJ.
    let target = getEligibleTrafficCar(
        playerCar,
        NEAR_SEARCH_FORWARD,
        NEAR_SEARCH_RADIUS
    );

    let searchBand = "near";

    if (!target) {
        target = getEligibleTrafficCar(
            playerCar,
            FAR_SEARCH_FORWARD,
            FAR_SEARCH_RADIUS
        );
        searchBand = "far";
    }

    if (!target) return;

    const targetCar = target.car;
    const driver = target.driver;

    let currentSpeed = 0.0;
    try {
        currentSpeed = targetCar.getSpeed();
    } catch (e) {
        currentSpeed = 0.0;
    }

    const driveSpeed = Math.max(currentSpeed, MIN_DIVERT_DRIVE_SPEED);

    // Junior_Djjr's original first tries one side ahead of the traffic car,
    // then tries the other side if that path is obstructed. Because these are
    // local vehicle offsets, the same maneuver also works for an oncoming car
    // relative to that car's own direction of travel.
    const nearFront = targetCar.getOffsetInWorldCoords(0.0, 3.0, 0.0);
    let divertPoint = targetCar.getOffsetInWorldCoords(-4.0, 8.0, 0.0);
    let divertSide = "left";

    const leftClear = World.IsLineOfSightClear(
        divertPoint.x, divertPoint.y, divertPoint.z,
        nearFront.x, nearFront.y, nearFront.z,
        true, true, true, true, false
    );

    if (!leftClear) {
        divertPoint = targetCar.getOffsetInWorldCoords(4.0, 6.0, 0.0);
        divertSide = "right";

        const rightClear = World.IsLineOfSightClear(
            divertPoint.x, divertPoint.y, divertPoint.z,
            nearFront.x, nearFront.y, nearFront.z,
            true, true, true, true, false
        );

        if (!rightClear) {
            dbg(`Eligible ${searchBand} traffic found, but both divert paths were blocked.`);
            return;
        }
    }

    try {
        Task.CarDriveToCoord(
            driver,
            targetCar,
            divertPoint.x,
            divertPoint.y,
            divertPoint.z,
            driveSpeed,
            0,
            -1,
            0
        );

        active = {
            car: targetCar,
            driver: driver,
            restoreAt: now() + DIVERT_TIME_MS
        };

        const stoppedNote = currentSpeed < MIN_DIVERT_DRIVE_SPEED
            ? `; boosted maneuver speed ${currentSpeed.toFixed(2)} -> ${driveSpeed.toFixed(2)}`
            : `; speed ${currentSpeed.toFixed(2)}`;

        dbg(`Diverted ${searchBand} traffic ${divertSide} for ${DIVERT_TIME_MS} ms${stoppedNote}.`);
    } catch (e) {
        dbg(`Drive task failed: ${e}`);
    }
}

log(`[${MOD}] v1.0 loaded - slow/stopped traffic + wider oncoming coverage; Debug=false.`);

while (true) {
    wait(25);

    if (active && now() >= active.restoreAt) {
        restoreTrafficCar();
    }

    let hornDown = false;
    try {
        hornDown = player.isPressingHorn();
    } catch (e) {
        hornDown = false;
    }

    // Trigger on a fresh horn press. This avoids repeatedly searching traffic
    // every frame while the horn button is held.
    if (hornDown && !hornWasDown && !active && now() >= nextTriggerAt) {
        tryDivertTraffic();
        nextTriggerAt = now() + RETRIGGER_DELAY_MS;
    }

    hornWasDown = hornDown;
}
