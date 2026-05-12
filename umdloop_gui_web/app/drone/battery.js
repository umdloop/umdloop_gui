const BATTERY_CURVE = [
  { percent: 100, perCellVoltage: 4.35 },
  { percent: 95, perCellVoltage: 4.27 },
  { percent: 90, perCellVoltage: 4.20 },
  { percent: 80, perCellVoltage: 4.08 },
  { percent: 70, perCellVoltage: 3.98 },
  { percent: 60, perCellVoltage: 3.92 },
  { percent: 50, perCellVoltage: 3.87 },
  { percent: 40, perCellVoltage: 3.83 },
  { percent: 30, perCellVoltage: 3.79 },
  { percent: 20, perCellVoltage: 3.74 },
  { percent: 10, perCellVoltage: 3.68 },
  { percent: 5, perCellVoltage: 3.60 },
  { percent: 0, perCellVoltage: 3.50 },
];

export const TATTU_HV_6S_22000 = {
  name: "Tattu HV 22000mAh 25C 6S1P",
  chemistry: "LiPo HV",
  cellCount: 6,
  capacityAh: 22,
  nominalVoltage: 22.8,
  fullVoltage: 26.1,
  nominalEnergyWh: 22 * 22.8,
  maxContinuousCurrentA: 22 * 25,
};

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function lerp(start, end, ratio) {
  return start + (end - start) * ratio;
}

export function estimatePackVoltageFromSoc(socPercent, battery = TATTU_HV_6S_22000) {
  const soc = clamp(socPercent, 0, 100);

  for (let i = 0; i < BATTERY_CURVE.length - 1; i += 1) {
    const upper = BATTERY_CURVE[i];
    const lower = BATTERY_CURVE[i + 1];
    if (soc <= upper.percent && soc >= lower.percent) {
      const span = upper.percent - lower.percent || 1;
      const ratio = (soc - lower.percent) / span;
      const perCellVoltage = lerp(lower.perCellVoltage, upper.perCellVoltage, ratio);
      return perCellVoltage * battery.cellCount;
    }
  }

  return BATTERY_CURVE[BATTERY_CURVE.length - 1].perCellVoltage * battery.cellCount;
}

export function buildBatteryHealthSnapshot({ socPercent, loadCurrentA = null, temperatureC = null, packVoltageV: measuredPackVoltageV = null, battery = TATTU_HV_6S_22000 }) {
  const stateOfChargePct = clamp(socPercent, 0, 100);
  const packVoltageV = Number.isFinite(measuredPackVoltageV) ? measuredPackVoltageV : estimatePackVoltageFromSoc(stateOfChargePct, battery);
  const perCellVoltageV = packVoltageV / battery.cellCount;
  const remainingAh = battery.capacityAh * (stateOfChargePct / 100);
  const remainingWh = battery.nominalEnergyWh * (stateOfChargePct / 100);
  const safeLoadCurrentA = Number.isFinite(loadCurrentA) ? Math.max(0, loadCurrentA) : null;
  const estRuntimeMinutes = safeLoadCurrentA && safeLoadCurrentA > 0.25
    ? (remainingAh / safeLoadCurrentA) * 60
    : null;

  let status = "Nominal";
  if (stateOfChargePct <= 10 || perCellVoltageV <= 3.6 || (temperatureC != null && temperatureC >= 55)) {
    status = "Critical";
  } else if (stateOfChargePct <= 25 || perCellVoltageV <= 3.75 || (temperatureC != null && temperatureC >= 45)) {
    status = "Reserve";
  } else if (temperatureC != null && temperatureC >= 40) {
    status = "Warm";
  }

  return {
    batteryName: battery.name,
    chemistry: battery.chemistry,
    stateOfChargePct,
    packVoltageV,
    perCellVoltageV,
    remainingAh,
    remainingWh,
    loadCurrentA: safeLoadCurrentA,
    estRuntimeMinutes,
    temperatureC,
    status,
  };
}
