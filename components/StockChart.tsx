'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, LineStyle, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { ChartData } from '@/lib/indicators';
import * as indicators from '@/lib/indicators';

interface StockChartProps {
  data: ChartData[];
  mainIndicator: string;
  subIndicators: string[];
}

export default function StockChart({ data, mainIndicator, subIndicators }: StockChartProps) {
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const subChartContainerRef = useRef<HTMLDivElement>(null);
  
  const mainChartRef = useRef<IChartApi | null>(null);
  const subChartRef = useRef<IChartApi | null>(null);

  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const mainOverlaySeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const subSeriesRef = useRef<ISeriesApi<"Histogram" | "Line">[]>([]);

  useEffect(() => {
    if (!mainChartContainerRef.current || !subChartContainerRef.current || data.length === 0) return;

    const handleResize = () => {
      mainChartRef.current?.applyOptions({ width: mainChartContainerRef.current?.clientWidth });
      subChartRef.current?.applyOptions({ width: subChartContainerRef.current?.clientWidth });
    };

    const mainChart = createChart(mainChartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f3fa' },
        horzLines: { color: '#f0f3fa' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#f0f3fa',
      },
      timeScale: {
        borderColor: '#f0f3fa',
        timeVisible: true,
        secondsVisible: false,
      },
      width: mainChartContainerRef.current.clientWidth,
      height: 400,
    });

    const subChart = createChart(subChartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f3fa' },
        horzLines: { color: '#f0f3fa' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#f0f3fa',
      },
      timeScale: {
        borderColor: '#f0f3fa',
        timeVisible: true,
        secondsVisible: false,
        visible: false, // Hide time scale on sub chart to save space
      },
      width: subChartContainerRef.current.clientWidth,
      height: 200,
    });

    mainChartRef.current = mainChart;
    subChartRef.current = subChart;

    // Sync visible logical range
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
      if (timeRange !== null) {
        subChart.timeScale().setVisibleLogicalRange(timeRange);
      }
    });

    subChart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
      if (timeRange !== null) {
        mainChart.timeScale().setVisibleLogicalRange(timeRange);
      }
    });

    // Sync crosshair
    mainChart.subscribeCrosshairMove(param => {
      if (param.time && subSeriesRef.current[0]) {
        // Pass 0 as price for subchart to avoid using pixel coordinates
        subChart.setCrosshairPosition(0, param.time, subSeriesRef.current[0]);
      } else {
        subChart.clearCrosshairPosition();
      }
    });

    subChart.subscribeCrosshairMove(param => {
      if (param.time && candlestickSeriesRef.current) {
        // Find the close price for the current time to sync the main chart
        const dataPoint = data.find(d => d.time === param.time);
        const price = dataPoint ? dataPoint.close : 0;
        mainChart.setCrosshairPosition(price, param.time, candlestickSeriesRef.current);
      } else {
        mainChart.clearCrosshairPosition();
      }
    });

    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#ef5350',
      downColor: '#26a69a',
      borderVisible: false,
      wickUpColor: '#ef5350',
      wickDownColor: '#26a69a',
    });
    candlestickSeries.setData(data);
    candlestickSeriesRef.current = candlestickSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mainChart.remove();
      subChart.remove();
      mainOverlaySeriesRef.current = [];
      subSeriesRef.current = [];
      candlestickSeriesRef.current = null;
    };
  }, [data]);

  // Handle Main Indicator changes
  useEffect(() => {
    if (!mainChartRef.current || data.length === 0) return;

    // Remove existing overlay series
    mainOverlaySeriesRef.current.forEach(series => mainChartRef.current?.removeSeries(series));
    mainOverlaySeriesRef.current = [];

    if (mainIndicator === 'MA') {
      [5, 10, 20, 30].forEach((period, index) => {
        const colors = ['#2962FF', '#FF6D00', '#00C853', '#D50000'];
        const maData = indicators.computeMA(data, period);
        if (maData.length > 0) {
          const series = mainChartRef.current!.addSeries(LineSeries, { color: colors[index], lineWidth: 1, title: `MA${period}` });
          series.setData(maData);
          mainOverlaySeriesRef.current.push(series);
        }
      });
    } else if (mainIndicator === 'EMA') {
      [5, 10, 20, 30].forEach((period, index) => {
        const colors = ['#2962FF', '#FF6D00', '#00C853', '#D50000'];
        const emaData = indicators.computeEMA(data, period);
        if (emaData.length > 0) {
          const series = mainChartRef.current!.addSeries(LineSeries, { color: colors[index], lineWidth: 1, title: `EMA${period}` });
          series.setData(emaData);
          mainOverlaySeriesRef.current.push(series);
        }
      });
    } else if (mainIndicator === 'WMA') {
      [5, 10, 20, 30].forEach((period, index) => {
        const colors = ['#2962FF', '#FF6D00', '#00C853', '#D50000'];
        const wmaData = indicators.computeWMA(data, period);
        if (wmaData.length > 0) {
          const series = mainChartRef.current!.addSeries(LineSeries, { color: colors[index], lineWidth: 1, title: `WMA${period}` });
          series.setData(wmaData);
          mainOverlaySeriesRef.current.push(series);
        }
      });
    } else if (mainIndicator === 'BOLL') {
      const bollData = indicators.computeBOLL(data, 20, 2);
      if (bollData.length > 0) {
        const upperSeries = mainChartRef.current!.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, title: 'UPPER' });
        const middleSeries = mainChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MIDDLE' });
        const lowerSeries = mainChartRef.current!.addSeries(LineSeries, { color: '#00C853', lineWidth: 1, title: 'LOWER' });
        
        upperSeries.setData(bollData.map(d => ({ time: d.time, value: d.upper })));
        middleSeries.setData(bollData.map(d => ({ time: d.time, value: d.middle })));
        lowerSeries.setData(bollData.map(d => ({ time: d.time, value: d.lower })));
        
        mainOverlaySeriesRef.current.push(upperSeries, middleSeries, lowerSeries);
      }
    } else if (mainIndicator === 'VWAP') {
      const vwapData = indicators.computeVWAP(data);
      if (vwapData.length > 0) {
        const series = mainChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'VWAP' });
        series.setData(vwapData);
        mainOverlaySeriesRef.current.push(series);
      }
    } else if (mainIndicator === 'SAR') {
      const sarData = indicators.computeSAR(data);
      if (sarData.length > 0) {
        const series = mainChartRef.current!.addSeries(LineSeries, { color: '#D50000', lineWidth: 2, lineStyle: LineStyle.Dotted, title: 'SAR' });
        series.setData(sarData);
        mainOverlaySeriesRef.current.push(series);
      }
    } else if (mainIndicator === 'SUPER') {
      const superData = indicators.computeSUPER(data);
      if (superData.length > 0) {
        const series = mainChartRef.current!.addSeries(LineSeries, { color: '#00C853', lineWidth: 2, title: 'SUPER' });
        series.setData(superData.map(d => ({ time: d.time, value: d.value })));
        mainOverlaySeriesRef.current.push(series);
      }
    }

  }, [data, mainIndicator]);

  // Handle Sub Indicator changes
  useEffect(() => {
    if (!subChartRef.current || data.length === 0) return;

    // Remove existing sub series
    subSeriesRef.current.forEach(series => subChartRef.current?.removeSeries(series));
    subSeriesRef.current = [];

    const activeIndicators = subIndicators.filter(ind => ind !== 'NONE');
    const subChartHeight = activeIndicators.length * 150;
    
    if (subChartContainerRef.current) {
      subChartContainerRef.current.style.height = `${subChartHeight}px`;
      subChartContainerRef.current.style.display = subChartHeight === 0 ? 'none' : 'block';
      subChartRef.current.applyOptions({ height: Math.max(1, subChartHeight) });
    }

    if (activeIndicators.length === 0) return;

    let activeIndex = 0;
    subIndicators.forEach((subIndicator, index) => {
      if (subIndicator === 'NONE') return;
      
      const priceScaleId = `scale_${index}`;

      if (subIndicator === 'VOL') {
        const volData = indicators.computeVOL(data);
        if (volData.length > 0) {
          const volumeSeries = subChartRef.current!.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId,
          });
          volumeSeries.setData(volData.map(d => ({ time: d.time, value: d.volume, color: d.color })));
          subSeriesRef.current.push(volumeSeries);

          const ma5Series = subChartRef.current!.addSeries(LineSeries, { color: '#F57C00', lineWidth: 1, title: 'MA5', priceScaleId });
          ma5Series.setData(volData.filter(d => indicators.isValid(d.ma5)).map(d => ({ time: d.time, value: d.ma5 })));
          subSeriesRef.current.push(ma5Series);

          const ma10Series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MA10', priceScaleId });
          ma10Series.setData(volData.filter(d => indicators.isValid(d.ma10)).map(d => ({ time: d.time, value: d.ma10 })));
          subSeriesRef.current.push(ma10Series);
        }
      } else if (subIndicator === 'MACD') {
        const macdData = indicators.computeMACD(data);
        if (macdData.length > 0) {
          const macdSeries = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MACD', priceScaleId });
          const signalSeries = subChartRef.current!.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, title: 'SIGNAL', priceScaleId });
          const histSeries = subChartRef.current!.addSeries(HistogramSeries, { priceScaleId });
          
          macdSeries.setData(macdData.map(d => ({ time: d.time, value: d.macd })));
          signalSeries.setData(macdData.map(d => ({ time: d.time, value: d.signal })));
          histSeries.setData(macdData.map(d => ({
            time: d.time,
            value: d.histogram || 0,
            color: (d.histogram || 0) >= 0 ? '#ef5350' : '#26a69a'
          })));
          
          subSeriesRef.current.push(macdSeries, signalSeries, histSeries);
        }
      } else if (subIndicator === 'RSI') {
        const rsiData = indicators.computeRSI(data);
        if (rsiData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'RSI', priceScaleId });
          series.setData(rsiData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'KDJ') {
        const kdjData = indicators.computeKDJ(data);
        if (kdjData.length > 0) {
          const kSeries = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'K', priceScaleId });
          const dSeries = subChartRef.current!.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, title: 'D', priceScaleId });
          const jSeries = subChartRef.current!.addSeries(LineSeries, { color: '#D50000', lineWidth: 1, title: 'J', priceScaleId });
          
          kSeries.setData(kdjData.map(d => ({ time: d.time, value: d.k })));
          dSeries.setData(kdjData.map(d => ({ time: d.time, value: d.d })));
          jSeries.setData(kdjData.map(d => ({ time: d.time, value: d.j })));
          
          subSeriesRef.current.push(kSeries, dSeries, jSeries);
        }
      } else if (subIndicator === 'OBV') {
        const obvData = indicators.computeOBV(data);
        if (obvData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'OBV', priceScaleId });
          series.setData(obvData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'CCI') {
        const cciData = indicators.computeCCI(data);
        if (cciData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'CCI', priceScaleId });
          series.setData(cciData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'StochRSI') {
        const stochRsiData = indicators.computeStochRSI(data);
        if (stochRsiData.length > 0) {
          const kSeries = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'K', priceScaleId });
          const dSeries = subChartRef.current!.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, title: 'D', priceScaleId });
          kSeries.setData(stochRsiData.map(d => ({ time: d.time, value: d.k })));
          dSeries.setData(stochRsiData.map(d => ({ time: d.time, value: d.d })));
          subSeriesRef.current.push(kSeries, dSeries);
        }
      } else if (subIndicator === 'WR') {
        const wrData = indicators.computeWR(data);
        if (wrData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'WR', priceScaleId });
          series.setData(wrData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'DMI') {
        const dmiData = indicators.computeDMI(data);
        if (dmiData.length > 0) {
          const adxSeries = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'ADX', priceScaleId });
          const pdiSeries = subChartRef.current!.addSeries(LineSeries, { color: '#ef5350', lineWidth: 1, title: '+DI', priceScaleId });
          const mdiSeries = subChartRef.current!.addSeries(LineSeries, { color: '#26a69a', lineWidth: 1, title: '-DI', priceScaleId });
          adxSeries.setData(dmiData.map(d => ({ time: d.time, value: d.adx })));
          pdiSeries.setData(dmiData.map(d => ({ time: d.time, value: d.pdi })));
          mdiSeries.setData(dmiData.map(d => ({ time: d.time, value: d.mdi })));
          subSeriesRef.current.push(adxSeries, pdiSeries, mdiSeries);
        }
      } else if (subIndicator === 'MTM') {
        const mtmData = indicators.computeMTM(data);
        if (mtmData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MTM', priceScaleId });
          series.setData(mtmData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'EMV') {
        const emvData = indicators.computeEMV(data);
        if (emvData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'EMV', priceScaleId });
          series.setData(emvData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'MFI') {
        const mfiData = indicators.computeMFI(data);
        if (mfiData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MFI', priceScaleId });
          series.setData(mfiData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'TRIX') {
        const trixData = indicators.computeTRIX(data);
        if (trixData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'TRIX', priceScaleId });
          series.setData(trixData);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'AVL') {
        const avlData = indicators.computeAVL(data);
        if (avlData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'AVL', priceScaleId });
          series.setData(avlData);
          subSeriesRef.current.push(series);
        }
      }

      const top = activeIndex / activeIndicators.length;
      const bottom = 1 - (activeIndex + 1) / activeIndicators.length;
      
      const topMargin = top + (activeIndex > 0 ? 0.02 : 0);
      const bottomMargin = bottom + (activeIndex < activeIndicators.length - 1 ? 0.02 : 0);

      subChartRef.current!.priceScale(priceScaleId).applyOptions({
        scaleMargins: { top: topMargin, bottom: bottomMargin }
      });

      activeIndex++;
    });

  }, [data, subIndicators]);

  const activeIndicatorsCount = subIndicators.filter(ind => ind !== 'NONE').length;

  return (
    <div className="flex flex-col w-full h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div ref={mainChartContainerRef} className="w-full relative" style={{ height: '400px' }} />
      {activeIndicatorsCount > 0 && <div className="w-full h-[1px] bg-gray-200" />}
      <div ref={subChartContainerRef} className="w-full relative" style={{ height: '0px', display: 'none' }} />
    </div>
  );
}
