'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, LineStyle, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import { ChartData } from '@/lib/indicators';
import * as indicators from '@/lib/indicators';

interface StockChartProps {
  data: ChartData[];
  mainIndicator: string;
  subIndicators: string[];
  macdColors?: {
    macdLine: string;
    signalLine: string;
    histPositive: string;
    histNegative: string;
  };
  chartType?: 'candlestick' | 'line';
}

export default function StockChart({ data, mainIndicator, subIndicators, macdColors, chartType = 'candlestick' }: StockChartProps) {
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const subChartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const subTooltipRef = useRef<HTMLDivElement>(null);
  const mainLegendRef = useRef<HTMLDivElement>(null);
  const subLegendRef = useRef<HTMLDivElement>(null);
  
  const mainChartRef = useRef<IChartApi | null>(null);
  const subChartRef = useRef<IChartApi | null>(null);

  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const mainOverlaySeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const subSeriesRef = useRef<ISeriesApi<"Histogram" | "Line">[]>([]);

  const lastMainDataRef = useRef<Map<ISeriesApi<any>, any>>(new Map());
  const lastSubDataRef = useRef<Map<ISeriesApi<any>, any>>(new Map());

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const chartTypeRef = useRef(chartType);
  useEffect(() => {
    chartTypeRef.current = chartType;
  }, [chartType]);

  const setSeriesData = (series: ISeriesApi<any>, seriesData: any[], isMain: boolean) => {
    series.setData(seriesData);
    if (seriesData.length > 0) {
      if (isMain) {
        lastMainDataRef.current.set(series, seriesData[seriesData.length - 1]);
      } else {
        lastSubDataRef.current.set(series, seriesData[seriesData.length - 1]);
      }
    }
  };

  useEffect(() => {
    if (!mainChartContainerRef.current || !subChartContainerRef.current) return;

    const handleResize = () => {
      if (mainChartContainerRef.current && mainChartContainerRef.current.clientWidth > 0) {
        mainChartRef.current?.applyOptions({ width: mainChartContainerRef.current.clientWidth });
      }
      if (subChartContainerRef.current && subChartContainerRef.current.clientWidth > 0) {
        subChartRef.current?.applyOptions({ width: subChartContainerRef.current.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(mainChartContainerRef.current);
    resizeObserver.observe(subChartContainerRef.current);

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

    // Sync crosshair and update tooltip
    const updateMainLegend = (param?: any) => {
      if (!mainLegendRef.current || !candlestickSeriesRef.current || dataRef.current.length === 0) return;
      
      let dataPoint: any;
      let isHovered = false;

      if (param && param.time && param.point && param.point.x >= 0 && param.point.x <= mainChartContainerRef.current!.clientWidth && param.point.y >= 0 && param.point.y <= mainChartContainerRef.current!.clientHeight) {
        dataPoint = dataRef.current.find(d => d.time === param.time);
        isHovered = true;
      } else {
        const lastData = dataRef.current[dataRef.current.length - 1];
        dataPoint = {
          open: lastData.open,
          high: lastData.high,
          low: lastData.low,
          close: lastData.close,
        };
      }

      if (dataPoint) {
        const isUp = dataPoint.close >= dataPoint.open;
        const colorClass = isUp ? 'text-red-500' : 'text-green-500';
        let html = `<div class="flex items-center gap-2 mr-4">
          <span class="font-semibold text-slate-700">O</span><span class="${colorClass}">${dataPoint.open.toFixed(2)}</span>
          <span class="font-semibold text-slate-700">H</span><span class="${colorClass}">${dataPoint.high.toFixed(2)}</span>
          <span class="font-semibold text-slate-700">L</span><span class="${colorClass}">${dataPoint.low.toFixed(2)}</span>
          <span class="font-semibold text-slate-700">C</span><span class="${colorClass}">${dataPoint.close.toFixed(2)}</span>
        </div>`;

        mainOverlaySeriesRef.current.forEach(series => {
          let point: any;
          if (isHovered) {
            point = param.seriesData.get(series);
          } else {
            point = lastMainDataRef.current.get(series);
          }
          
          if (point && point.value !== undefined) {
            const title = series.options().title || 'Indicator';
            const color = series.options().color || '#333';
            html += `<div class="flex items-center gap-1 mr-3">
              <span class="font-semibold" style="color: ${color}">${title}</span>
              <span class="text-slate-900">${point.value.toFixed(2)}</span>
            </div>`;
          }
        });
        
        mainLegendRef.current.innerHTML = html;
      }
    };

    const updateSubLegend = (param?: any) => {
      if (!subLegendRef.current || subSeriesRef.current.length === 0) return;
      
      let isHovered = false;
      if (param && param.time && param.point && param.point.x >= 0 && param.point.x <= subChartContainerRef.current!.clientWidth && param.point.y >= 0 && param.point.y <= subChartContainerRef.current!.clientHeight) {
        isHovered = true;
      }

      let html = '';
      subSeriesRef.current.forEach(series => {
        let point: any;
        if (isHovered) {
          point = param.seriesData.get(series);
        } else {
          point = lastSubDataRef.current.get(series);
        }
        
        if (point && point.value !== undefined) {
          const title = series.options().title || 'Value';
          const color = point.color || series.options().color || '#333';
          html += `<div class="flex items-center gap-1 mr-3">
            <span class="font-semibold" style="color: ${color}">${title}</span>
            <span class="text-gray-900">${point.value.toFixed(2)}</span>
          </div>`;
        }
      });
      
      subLegendRef.current.innerHTML = html;
    };

    mainChart.subscribeCrosshairMove(param => {
      updateMainLegend(param);
      if (param.time && subSeriesRef.current[0]) {
        // Pass 0 as price for subchart to avoid using pixel coordinates
        subChart.setCrosshairPosition(0, param.time, subSeriesRef.current[0]);
      } else {
        subChart.clearCrosshairPosition();
      }

      if (tooltipRef.current) {
        if (
          param.point === undefined ||
          !param.time ||
          param.point.x < 0 ||
          param.point.x > mainChartContainerRef.current!.clientWidth ||
          param.point.y < 0 ||
          param.point.y > mainChartContainerRef.current!.clientHeight
        ) {
          tooltipRef.current.style.display = 'none';
        } else {
          const dataPoint = dataRef.current.find(d => d.time === param.time);
          if (dataPoint) {
            let extraHtml = '';
            mainOverlaySeriesRef.current.forEach(series => {
              const point = param.seriesData.get(series) as any;
              if (point && point.value !== undefined) {
                const title = series.options().title || 'Indicator';
                extraHtml += `<div class="text-gray-500">${title}: <span class="text-gray-900 font-medium">${point.value.toFixed(2)}</span></div>`;
              }
            });

            subSeriesRef.current.forEach(series => {
              const point = series.data().find((d: any) => d.time === param.time) as any;
              if (point && point.value !== undefined) {
                const title = series.options().title || 'Indicator';
                extraHtml += `<div class="text-gray-500">${title}: <span class="text-gray-900 font-medium">${point.value.toFixed(2)}</span></div>`;
              }
            });

            const dateStr = typeof param.time === 'string' ? param.time : new Date((param.time as number) * 1000).toLocaleString();
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.innerHTML = `
              <div class="font-semibold mb-1">${dateStr}</div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div class="text-gray-500">O: <span class="text-gray-900 font-medium">${dataPoint.open.toFixed(2)}</span></div>
                <div class="text-gray-500">H: <span class="text-gray-900 font-medium">${dataPoint.high.toFixed(2)}</span></div>
                <div class="text-gray-500">L: <span class="text-gray-900 font-medium">${dataPoint.low.toFixed(2)}</span></div>
                <div class="text-gray-500">C: <span class="text-gray-900 font-medium">${dataPoint.close.toFixed(2)}</span></div>
                ${extraHtml}
              </div>
            `;
            
            // Position tooltip
            const tooltipWidth = 150;
            const tooltipHeight = 80 + ((mainOverlaySeriesRef.current.length + subSeriesRef.current.length) * 10);
            const margin = 15;
            
            let left = param.point.x + margin;
            if (left + tooltipWidth > mainChartContainerRef.current!.clientWidth) {
              left = param.point.x - tooltipWidth - margin;
            }
            
            let top = param.point.y + margin;
            if (top + tooltipHeight > mainChartContainerRef.current!.clientHeight) {
              top = param.point.y - tooltipHeight - margin;
            }
            
            tooltipRef.current.style.left = left + 'px';
            tooltipRef.current.style.top = top + 'px';
          } else {
            tooltipRef.current.style.display = 'none';
          }
        }
      }
    });

    subChart.subscribeCrosshairMove(param => {
      updateSubLegend(param);
      if (param.time && (candlestickSeriesRef.current || lineSeriesRef.current)) {
        // Find the close price for the current time to sync the main chart
        const dataPoint = dataRef.current.find(d => d.time === param.time);
        const price = dataPoint ? dataPoint.close : 0;
        const activeSeries = chartTypeRef.current === 'line' ? lineSeriesRef.current : candlestickSeriesRef.current;
        if (activeSeries) {
          mainChart.setCrosshairPosition(price, param.time, activeSeries);
        }
      } else {
        mainChart.clearCrosshairPosition();
      }

      if (subTooltipRef.current) {
        if (
          param.point === undefined ||
          !param.time ||
          param.point.x < 0 ||
          param.point.x > subChartContainerRef.current!.clientWidth ||
          param.point.y < 0 ||
          param.point.y > subChartContainerRef.current!.clientHeight
        ) {
          subTooltipRef.current.style.display = 'none';
        } else {
          let extraHtml = '';
          const dataPoint = dataRef.current.find(d => d.time === param.time);
          if (dataPoint) {
            extraHtml += `<div class="text-gray-500">O: <span class="text-gray-900 font-medium">${dataPoint.open.toFixed(2)}</span></div>`;
            extraHtml += `<div class="text-gray-500">H: <span class="text-gray-900 font-medium">${dataPoint.high.toFixed(2)}</span></div>`;
            extraHtml += `<div class="text-gray-500">L: <span class="text-gray-900 font-medium">${dataPoint.low.toFixed(2)}</span></div>`;
            extraHtml += `<div class="text-gray-500">C: <span class="text-gray-900 font-medium">${dataPoint.close.toFixed(2)}</span></div>`;
          }

          mainOverlaySeriesRef.current.forEach(series => {
            const point = series.data().find((d: any) => d.time === param.time) as any;
            if (point && point.value !== undefined) {
              const title = series.options().title || 'Indicator';
              extraHtml += `<div class="text-gray-500">${title}: <span class="text-gray-900 font-medium">${point.value.toFixed(2)}</span></div>`;
            }
          });

          subSeriesRef.current.forEach(series => {
            const point = param.seriesData.get(series) as any;
            if (point && point.value !== undefined) {
              const title = series.options().title || 'Value';
              extraHtml += `<div class="text-gray-500">${title}: <span class="text-gray-900 font-medium">${point.value.toFixed(2)}</span></div>`;
            }
          });

          if (extraHtml) {
            const dateStr = typeof param.time === 'string' ? param.time : new Date((param.time as number) * 1000).toLocaleString();
            subTooltipRef.current.style.display = 'block';
            subTooltipRef.current.innerHTML = `
              <div class="font-semibold mb-1">${dateStr}</div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                ${extraHtml}
              </div>
            `;
            
            // Position tooltip
            const tooltipWidth = 150;
            const tooltipHeight = 80 + ((mainOverlaySeriesRef.current.length + subSeriesRef.current.length) * 10);
            const margin = 15;
            
            let left = param.point.x + margin;
            if (left + tooltipWidth > subChartContainerRef.current!.clientWidth) {
              left = param.point.x - tooltipWidth - margin;
            }
            
            let top = param.point.y + margin;
            if (top + tooltipHeight > subChartContainerRef.current!.clientHeight) {
              top = param.point.y - tooltipHeight - margin;
            }
            
            subTooltipRef.current.style.left = left + 'px';
            subTooltipRef.current.style.top = top + 'px';
          } else {
            subTooltipRef.current.style.display = 'none';
          }
        }
      }
    });

    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#ef5350',
      downColor: '#26a69a',
      borderVisible: false,
      wickUpColor: '#ef5350',
      wickDownColor: '#26a69a',
      visible: true,
    });
    candlestickSeriesRef.current = candlestickSeries;

    const lineSeries = mainChart.addSeries(LineSeries, {
      color: '#2962FF',
      lineWidth: 2,
      visible: false,
    });
    lineSeriesRef.current = lineSeries;

    const lastMainData = lastMainDataRef.current;
    const lastSubData = lastSubDataRef.current;

    return () => {
      resizeObserver.disconnect();
      mainChart.remove();
      subChart.remove();
      mainOverlaySeriesRef.current = [];
      subSeriesRef.current = [];
      candlestickSeriesRef.current = null;
      lastMainData.clear();
      lastSubData.clear();
    };
  }, []);

  // Handle Data changes
  const previousDataInfo = useRef({ length: 0, firstTime: null as any });
  useEffect(() => {
    if (!candlestickSeriesRef.current || !lineSeriesRef.current || data.length === 0) return;
    
    const firstTime = data[0].time;
    const lineData = data.map(d => ({ time: d.time, value: d.close }));

    if (
      previousDataInfo.current.length === data.length && 
      previousDataInfo.current.firstTime === firstTime &&
      data.length > 0
    ) {
      // Only the last candle might have changed, use update for better performance and to preserve zoom
      candlestickSeriesRef.current.update(data[data.length - 1]);
      lineSeriesRef.current.update(lineData[lineData.length - 1]);
    } else {
      candlestickSeriesRef.current.setData(data);
      lineSeriesRef.current.setData(lineData);
    }
    previousDataInfo.current = { length: data.length, firstTime };
  }, [data]);

  // Handle Chart Type changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !lineSeriesRef.current) return;
    
    if (chartType === 'candlestick') {
      candlestickSeriesRef.current.applyOptions({ visible: true });
      lineSeriesRef.current.applyOptions({ visible: false });
    } else {
      candlestickSeriesRef.current.applyOptions({ visible: false });
      lineSeriesRef.current.applyOptions({ visible: true });
    }
  }, [chartType]);

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
          setSeriesData(series, maData, true);
          mainOverlaySeriesRef.current.push(series);
        }
      });
    } else if (mainIndicator === 'EMA') {
      [5, 10, 20, 30].forEach((period, index) => {
        const colors = ['#2962FF', '#FF6D00', '#00C853', '#D50000'];
        const emaData = indicators.computeEMA(data, period);
        if (emaData.length > 0) {
          const series = mainChartRef.current!.addSeries(LineSeries, { color: colors[index], lineWidth: 1, title: `EMA${period}` });
          setSeriesData(series, emaData, true);
          mainOverlaySeriesRef.current.push(series);
        }
      });
    } else if (mainIndicator === 'WMA') {
      [5, 10, 20, 30].forEach((period, index) => {
        const colors = ['#2962FF', '#FF6D00', '#00C853', '#D50000'];
        const wmaData = indicators.computeWMA(data, period);
        if (wmaData.length > 0) {
          const series = mainChartRef.current!.addSeries(LineSeries, { color: colors[index], lineWidth: 1, title: `WMA${period}` });
          setSeriesData(series, wmaData, true);
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
        
        lastMainDataRef.current.set(upperSeries, { time: bollData[bollData.length - 1].time, value: bollData[bollData.length - 1].upper });
        lastMainDataRef.current.set(middleSeries, { time: bollData[bollData.length - 1].time, value: bollData[bollData.length - 1].middle });
        lastMainDataRef.current.set(lowerSeries, { time: bollData[bollData.length - 1].time, value: bollData[bollData.length - 1].lower });

        mainOverlaySeriesRef.current.push(upperSeries, middleSeries, lowerSeries);
      }
    } else if (mainIndicator === 'VWAP') {
      const vwapData = indicators.computeVWAP(data);
      if (vwapData.length > 0) {
        const series = mainChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'VWAP' });
        setSeriesData(series, vwapData, true);
        mainOverlaySeriesRef.current.push(series);
      }
    } else if (mainIndicator === 'SAR') {
      const sarData = indicators.computeSAR(data);
      if (sarData.length > 0) {
        const series = mainChartRef.current!.addSeries(LineSeries, { color: '#D50000', lineWidth: 2, lineStyle: LineStyle.Dotted, title: 'SAR' });
        setSeriesData(series, sarData, true);
        mainOverlaySeriesRef.current.push(series);
      }
    } else if (mainIndicator === 'SUPER') {
      const superData = indicators.computeSUPER(data);
      if (superData.length > 0) {
        const series = mainChartRef.current!.addSeries(LineSeries, { color: '#00C853', lineWidth: 2, title: 'SUPER' });
        setSeriesData(series, superData.map(d => ({ time: d.time, value: d.value })), true);
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
          setSeriesData(volumeSeries, volData.map(d => ({ time: d.time, value: d.volume, color: d.color })), false);
          subSeriesRef.current.push(volumeSeries);

          const ma5Series = subChartRef.current!.addSeries(LineSeries, { color: '#F57C00', lineWidth: 1, title: 'MA5', priceScaleId });
          setSeriesData(ma5Series, volData.filter(d => indicators.isValid(d.ma5)).map(d => ({ time: d.time, value: d.ma5 })), false);
          subSeriesRef.current.push(ma5Series);

          const ma10Series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MA10', priceScaleId });
          setSeriesData(ma10Series, volData.filter(d => indicators.isValid(d.ma10)).map(d => ({ time: d.time, value: d.ma10 })), false);
          subSeriesRef.current.push(ma10Series);
        }
      } else if (subIndicator === 'MACD') {
        const macdData = indicators.computeMACD(data);
          if (macdData.length > 0) {
            const macdLineColor = macdColors?.macdLine || '#2962FF';
            const signalLineColor = macdColors?.signalLine || '#FF6D00';
            const histPosColor = macdColors?.histPositive || '#26a69a';
            const histNegColor = macdColors?.histNegative || '#ef5350';

            const macdSeries = subChartRef.current!.addSeries(LineSeries, { color: macdLineColor, lineWidth: 1, title: 'MACD', priceScaleId });
            const signalSeries = subChartRef.current!.addSeries(LineSeries, { color: signalLineColor, lineWidth: 1, title: 'SIGNAL', priceScaleId });
            const histSeries = subChartRef.current!.addSeries(HistogramSeries, { title: 'HIST', priceScaleId });
            
            setSeriesData(macdSeries, macdData.map(d => ({ time: d.time, value: d.macd })), false);
            setSeriesData(signalSeries, macdData.map(d => ({ time: d.time, value: d.signal })), false);
            setSeriesData(histSeries, macdData.map(d => ({
              time: d.time,
              value: d.histogram || 0,
              color: (d.histogram || 0) >= 0 ? histPosColor : histNegColor
            })), false);
            
            subSeriesRef.current.push(macdSeries, signalSeries, histSeries);
          }
      } else if (subIndicator === 'MACD_HIST') {
        const macdData = indicators.computeMACD(data);
        if (macdData.length > 0) {
          const histPosColor = macdColors?.histPositive || '#26a69a';
          const histNegColor = macdColors?.histNegative || '#ef5350';
          const histSeries = subChartRef.current!.addSeries(HistogramSeries, { title: 'MACD_HIST', priceScaleId });
          
          setSeriesData(histSeries, macdData.map(d => ({
            time: d.time,
            value: d.histogram || 0,
            color: (d.histogram || 0) >= 0 ? histPosColor : histNegColor
          })), false);
          
          subSeriesRef.current.push(histSeries);
        }
      } else if (subIndicator === 'MACD_EMA9') {
        const emaData = indicators.computeMACD_EMA(data, 9);
        if (emaData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, title: 'MACD_EMA9', priceScaleId });
          setSeriesData(series, emaData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'MACD_EMA26') {
        const emaData = indicators.computeMACD_EMA(data, 26);
        if (emaData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MACD_EMA26', priceScaleId });
          setSeriesData(series, emaData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'RSI') {
        const rsiData = indicators.computeRSI(data);
        if (rsiData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'RSI', priceScaleId });
          setSeriesData(series, rsiData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'KDJ') {
        const kdjData = indicators.computeKDJ(data);
        if (kdjData.length > 0) {
          const kSeries = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'K', priceScaleId });
          const dSeries = subChartRef.current!.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, title: 'D', priceScaleId });
          const jSeries = subChartRef.current!.addSeries(LineSeries, { color: '#D50000', lineWidth: 1, title: 'J', priceScaleId });
          
          setSeriesData(kSeries, kdjData.map(d => ({ time: d.time, value: d.k })), false);
          setSeriesData(dSeries, kdjData.map(d => ({ time: d.time, value: d.d })), false);
          setSeriesData(jSeries, kdjData.map(d => ({ time: d.time, value: d.j })), false);
          
          subSeriesRef.current.push(kSeries, dSeries, jSeries);
        }
      } else if (subIndicator === 'OBV') {
        const obvData = indicators.computeOBV(data);
        if (obvData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'OBV', priceScaleId });
          setSeriesData(series, obvData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'CCI') {
        const cciData = indicators.computeCCI(data);
        if (cciData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'CCI', priceScaleId });
          setSeriesData(series, cciData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'StochRSI') {
        const stochRsiData = indicators.computeStochRSI(data);
        if (stochRsiData.length > 0) {
          const kSeries = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'K', priceScaleId });
          const dSeries = subChartRef.current!.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1, title: 'D', priceScaleId });
          setSeriesData(kSeries, stochRsiData.map(d => ({ time: d.time, value: d.k })), false);
          setSeriesData(dSeries, stochRsiData.map(d => ({ time: d.time, value: d.d })), false);
          subSeriesRef.current.push(kSeries, dSeries);
        }
      } else if (subIndicator === 'WR') {
        const wrData = indicators.computeWR(data);
        if (wrData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'WR', priceScaleId });
          setSeriesData(series, wrData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'DMI') {
        const dmiData = indicators.computeDMI(data);
        if (dmiData.length > 0) {
          const adxSeries = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'ADX', priceScaleId });
          const pdiSeries = subChartRef.current!.addSeries(LineSeries, { color: '#ef5350', lineWidth: 1, title: '+DI', priceScaleId });
          const mdiSeries = subChartRef.current!.addSeries(LineSeries, { color: '#26a69a', lineWidth: 1, title: '-DI', priceScaleId });
          setSeriesData(adxSeries, dmiData.map(d => ({ time: d.time, value: d.adx })), false);
          setSeriesData(pdiSeries, dmiData.map(d => ({ time: d.time, value: d.pdi })), false);
          setSeriesData(mdiSeries, dmiData.map(d => ({ time: d.time, value: d.mdi })), false);
          subSeriesRef.current.push(adxSeries, pdiSeries, mdiSeries);
        }
      } else if (subIndicator === 'MTM') {
        const mtmData = indicators.computeMTM(data);
        if (mtmData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MTM', priceScaleId });
          setSeriesData(series, mtmData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'EMV') {
        const emvData = indicators.computeEMV(data);
        if (emvData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'EMV', priceScaleId });
          setSeriesData(series, emvData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'MFI') {
        const mfiData = indicators.computeMFI(data);
        if (mfiData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MFI', priceScaleId });
          setSeriesData(series, mfiData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'TRIX') {
        const trixData = indicators.computeTRIX(data);
        if (trixData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'TRIX', priceScaleId });
          setSeriesData(series, trixData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'AVL') {
        const avlData = indicators.computeAVL(data);
        if (avlData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'AVL', priceScaleId });
          setSeriesData(series, avlData, false);
          subSeriesRef.current.push(series);
        }
      } else if (subIndicator === 'SAR') {
        const sarData = indicators.computeSAR(data);
        if (sarData.length > 0) {
          const series = subChartRef.current!.addSeries(LineSeries, { color: '#E91E63', lineWidth: 2, lineStyle: LineStyle.Dotted, title: 'SAR', priceScaleId });
          setSeriesData(series, sarData, false);
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

  }, [data, subIndicators, macdColors]);

  const activeIndicatorsCount = subIndicators.filter(ind => ind !== 'NONE').length;

  // Initial legend update
  useEffect(() => {
    if (mainChartRef.current && candlestickSeriesRef.current && data.length > 0) {
      // Trigger a fake crosshair move to update the legend with the last data point
      const lastData = data[data.length - 1];
      const param = { time: lastData.time, point: undefined, seriesData: new Map() };
      
      if (mainLegendRef.current) {
        const isUp = lastData.close >= lastData.open;
        const colorClass = isUp ? 'text-red-500' : 'text-green-500';
        let html = `<div class="flex items-center gap-2 mr-4">
          <span class="font-semibold text-gray-700">O</span><span class="${colorClass}">${lastData.open.toFixed(2)}</span>
          <span class="font-semibold text-gray-700">H</span><span class="${colorClass}">${lastData.high.toFixed(2)}</span>
          <span class="font-semibold text-gray-700">L</span><span class="${colorClass}">${lastData.low.toFixed(2)}</span>
          <span class="font-semibold text-gray-700">C</span><span class="${colorClass}">${lastData.close.toFixed(2)}</span>
        </div>`;

        mainOverlaySeriesRef.current.forEach(series => {
          const point = lastMainDataRef.current.get(series);
          if (point && point.value !== undefined) {
            const title = series.options().title || 'Indicator';
            const color = series.options().color || '#333';
            html += `<div class="flex items-center gap-1 mr-3">
              <span class="font-semibold" style="color: ${color}">${title}</span>
              <span class="text-gray-900">${point.value.toFixed(2)}</span>
            </div>`;
          }
        });
        
        mainLegendRef.current.innerHTML = html;
      }

      if (subLegendRef.current) {
        let html = '';
        subSeriesRef.current.forEach(series => {
          const point = lastSubDataRef.current.get(series);
          if (point && point.value !== undefined) {
            const title = series.options().title || 'Value';
            const color = point.color || series.options().color || '#333';
            html += `<div class="flex items-center gap-1 mr-3">
              <span class="font-semibold" style="color: ${color}">${title}</span>
              <span class="text-gray-900">${point.value.toFixed(2)}</span>
            </div>`;
          }
        });
        
        subLegendRef.current.innerHTML = html;
      }
    }
  }, [data, mainIndicator, subIndicators, macdColors]);

  return (
    <div className="flex flex-col w-full border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div ref={mainChartContainerRef} className="w-full relative" style={{ height: '400px' }}>
        <div 
          ref={mainLegendRef}
          className="absolute z-40 top-2 left-2 flex flex-wrap gap-2 text-xs pointer-events-none"
        />
        <div 
          ref={tooltipRef} 
          className="absolute z-50 bg-white border border-gray-200 shadow-lg rounded p-2 pointer-events-none"
          style={{ display: 'none', width: '150px' }}
        />
      </div>
      {activeIndicatorsCount > 0 && <div className="w-full h-[1px] bg-gray-200" />}
      <div ref={subChartContainerRef} className="w-full relative" style={{ height: '0px', display: 'none' }}>
        <div 
          ref={subLegendRef}
          className="absolute z-40 top-2 left-2 flex flex-wrap gap-2 text-xs pointer-events-none"
        />
        <div 
          ref={subTooltipRef} 
          className="absolute z-50 bg-white border border-gray-200 shadow-lg rounded p-2 pointer-events-none"
          style={{ display: 'none', width: '150px' }}
        />
      </div>
    </div>
  );
}
