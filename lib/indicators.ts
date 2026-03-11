import * as ti from 'technicalindicators';

export interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function isValid(val: any): boolean {
  return val !== null && val !== undefined && !Number.isNaN(val) && Number.isFinite(val);
}

export function computeVOL(data: ChartData[], maPeriods: number[] = [5, 10]) {
  const volumes = data.map(d => d.volume);
  
  const maResults = maPeriods.map(period => {
    const result = ti.SMA.calculate({ period, values: volumes });
    const diff = data.length - result.length;
    return { period, result, diff };
  });

  return data.map((d, i) => {
    const item: any = {
      time: d.time,
      volume: d.volume,
      color: d.close >= d.open ? '#ef5350' : '#26a69a',
    };
    
    maResults.forEach(({ period, result, diff }) => {
      item[`ma${period}`] = i >= diff ? result[i - diff] : null;
    });
    
    return item;
  });
}

export function computeMA(data: ChartData[], period: number) {
  const values = data.map(d => d.close);
  const result = ti.SMA.calculate({ period, values });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeEMA(data: ChartData[], period: number) {
  const values = data.map(d => d.close);
  const result = ti.EMA.calculate({ period, values });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeWMA(data: ChartData[], period: number) {
  const values = data.map(d => d.close);
  const result = ti.WMA.calculate({ period, values });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeBOLL(data: ChartData[], period: number = 20, stdDev: number = 2) {
  const values = data.map(d => d.close);
  const result = ti.BollingerBands.calculate({ period, values, stdDev });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    upper: i >= diff ? result[i - diff]?.upper : null,
    middle: i >= diff ? result[i - diff]?.middle : null,
    lower: i >= diff ? result[i - diff]?.lower : null,
  })).filter(d => isValid(d.upper) && isValid(d.middle) && isValid(d.lower));
}

export function computeRSI(data: ChartData[], period: number = 14) {
  const values = data.map(d => d.close);
  const result = ti.RSI.calculate({ period, values });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeKDJ(data: ChartData[], period: number = 9, signalPeriod: number = 3) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);
  const result = ti.Stochastic.calculate({ high, low, close, period, signalPeriod });
  const diff = data.length - result.length;
  return data.map((d, i) => {
    if (i >= diff) {
      const stoch = result[i - diff];
      if (!stoch) return { time: d.time, k: null, d: null, j: null };
      const k = stoch.k;
      const dVal = stoch.d;
      const j = 3 * k - 2 * dVal;
      return { time: d.time, k, d: dVal, j };
    }
    return { time: d.time, k: null, d: null, j: null };
  }).filter(d => isValid(d.k) && isValid(d.d) && isValid(d.j));
}

export function computeMACD(data: ChartData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const values = data.map(d => d.close);
  const result = ti.MACD.calculate({ values, fastPeriod, slowPeriod, signalPeriod, SimpleMAOscillator: false, SimpleMASignal: false });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    macd: i >= diff ? result[i - diff]?.MACD : null,
    signal: i >= diff ? result[i - diff]?.signal : null,
    histogram: i >= diff ? result[i - diff]?.histogram : null,
  })).filter(d => isValid(d.macd) && isValid(d.signal) && isValid(d.histogram));
}

export function computeMACD_EMA(data: ChartData[], emaPeriod: number, fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const values = data.map(d => d.close);
  const macdResult = ti.MACD.calculate({ values, fastPeriod, slowPeriod, signalPeriod, SimpleMAOscillator: false, SimpleMASignal: false });
  
  const macdValues = macdResult.map(r => r.MACD).filter(v => v !== undefined) as number[];
  const emaResult = ti.EMA.calculate({ period: emaPeriod, values: macdValues });
  
  const diff = data.length - emaResult.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? emaResult[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeOBV(data: ChartData[]) {
  const close = data.map(d => d.close);
  const volume = data.map(d => d.volume);
  const result = ti.OBV.calculate({ close, volume });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeCCI(data: ChartData[], period: number = 14) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);
  const result = ti.CCI.calculate({ high, low, close, period });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeWR(data: ChartData[], period: number = 14) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);
  const result = ti.WilliamsR.calculate({ high, low, close, period });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeMFI(data: ChartData[], period: number = 14) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);
  const volume = data.map(d => d.volume);
  const result = ti.MFI.calculate({ high, low, close, volume, period });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeVWAP(data: ChartData[]) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);
  const volume = data.map(d => d.volume);
  const result = ti.VWAP.calculate({ high, low, close, volume });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeSAR(data: ChartData[], step: number = 0.02, max: number = 0.2) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const result = ti.PSAR.calculate({ high, low, step, max });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeTRIX(data: ChartData[], period: number = 18) {
  const values = data.map(d => d.close);
  const result = ti.TRIX.calculate({ values, period });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeStochRSI(data: ChartData[], rsiPeriod: number = 14, stochPeriod: number = 14, kPeriod: number = 3, dPeriod: number = 3) {
  const values = data.map(d => d.close);
  const result = ti.StochasticRSI.calculate({ values, rsiPeriod, stochasticPeriod: stochPeriod, kPeriod, dPeriod });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    k: i >= diff ? result[i - diff]?.k : null,
    d: i >= diff ? result[i - diff]?.d : null,
  })).filter(d => isValid(d.k) && isValid(d.d));
}

export function computeDMI(data: ChartData[], period: number = 14) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);
  const result = ti.ADX.calculate({ high, low, close, period });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    adx: i >= diff ? result[i - diff]?.adx : null,
    pdi: i >= diff ? result[i - diff]?.pdi : null,
    mdi: i >= diff ? result[i - diff]?.mdi : null,
  })).filter(d => isValid(d.adx) && isValid(d.pdi) && isValid(d.mdi));
}

// Custom simple implementations for missing ones if any
export function computeMTM(data: ChartData[], period: number = 12) {
  return data.map((d, i) => ({
    time: d.time,
    value: i >= period ? d.close - data[i - period].close : null,
  })).filter(d => isValid(d.value));
}

export function computeEMV(data: ChartData[], period: number = 14) {
  // Ease of Movement
  const emv = [];
  for (let i = 1; i < data.length; i++) {
    const mid = ((data[i].high + data[i].low) / 2) - ((data[i - 1].high + data[i - 1].low) / 2);
    const boxRatio = (data[i].volume / 100000000) / (data[i].high - data[i].low);
    emv.push(mid / boxRatio);
  }
  const sma = ti.SMA.calculate({ period, values: emv });
  const diff = data.length - sma.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? sma[i - diff] : null,
  })).filter(d => isValid(d.value));
}

export function computeAVL(data: ChartData[], period: number = 14) {
  // Average Volume
  const volume = data.map(d => d.volume);
  const result = ti.SMA.calculate({ period, values: volume });
  const diff = data.length - result.length;
  return data.map((d, i) => ({
    time: d.time,
    value: i >= diff ? result[i - diff] : null,
  })).filter(d => isValid(d.value));
}

// SuperTrend
export function computeSUPER(data: ChartData[], period: number = 10, multiplier: number = 3) {
  const atrResult = ti.ATR.calculate({ high: data.map(d=>d.high), low: data.map(d=>d.low), close: data.map(d=>d.close), period });
  
  let supertrend: (number | null)[] = [];
  let finalUpperband: (number | null)[] = [];
  let finalLowerband: (number | null)[] = [];
  let trend: number[] = []; // 1 for up, -1 for down

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      supertrend.push(null);
      finalUpperband.push(null);
      finalLowerband.push(null);
      trend.push(1);
      continue;
    }

    const atr = atrResult[i - period];
    const hl2 = (data[i].high + data[i].low) / 2;
    const basicUpperband = hl2 + multiplier * atr;
    const basicLowerband = hl2 - multiplier * atr;

    let prevFinalUpperband = finalUpperband[i - 1] || 0;
    let prevFinalLowerband = finalLowerband[i - 1] || 0;
    let prevClose = data[i - 1].close;

    let currFinalUpperband = (basicUpperband < prevFinalUpperband || prevClose > prevFinalUpperband) ? basicUpperband : prevFinalUpperband;
    let currFinalLowerband = (basicLowerband > prevFinalLowerband || prevClose < prevFinalLowerband) ? basicLowerband : prevFinalLowerband;

    finalUpperband.push(currFinalUpperband);
    finalLowerband.push(currFinalLowerband);

    let prevTrend = trend[i - 1];
    let currTrend = prevTrend;

    if (prevTrend === 1 && data[i].close < currFinalLowerband) {
      currTrend = -1;
    } else if (prevTrend === -1 && data[i].close > currFinalUpperband) {
      currTrend = 1;
    }
    trend.push(currTrend);

    if (currTrend === 1) {
      supertrend.push(currFinalLowerband);
    } else {
      supertrend.push(currFinalUpperband);
    }
  }

  return data.map((d, i) => ({
    time: d.time,
    value: supertrend[i],
    trend: trend[i]
  })).filter(d => isValid(d.value));
}
