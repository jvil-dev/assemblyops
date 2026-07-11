/**
 * Chart
 *
 * Recharts wrapper supporting area, line, and bar chart types.
 * Provides consistent styling, axis formatting, and tooltip behavior.
 *
 * Props:
 *   - data: Array of data points
 *   - dataKey / xKey: Value and category keys
 *   - type: 'area' | 'line' | 'bar' (default: area)
 *   - color, height, formatX, formatY, unit: Visual customization
 *
 * Used by: Costs, Infrastructure, Metrics pages
 */
'use client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
  type?: 'area' | 'line' | 'bar';
  color?: string;
  height?: number;
  formatX?: (v: unknown) => string;
  formatY?: (v: unknown) => string;
  unit?: string;
}

export function Chart({
  data,
  dataKey,
  xKey,
  type = 'area',
  color = '#1a3d5d',
  height = 200,
  formatX,
  formatY,
  unit,
}: ChartProps) {
  const commonProps = {
    data,
    margin: { top: 4, right: 4, left: 0, bottom: 0 },
  };

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
      <XAxis
        dataKey={xKey}
        tick={{ fontSize: 11, fill: '#999999' }}
        tickFormatter={formatX as ((v: unknown) => string) | undefined}
        tickLine={false}
        axisLine={false}
      />
      <YAxis
        tick={{ fontSize: 11, fill: '#999999' }}
        tickFormatter={formatY as ((v: unknown) => string) | undefined}
        tickLine={false}
        axisLine={false}
        unit={unit}
      />
      <Tooltip
        contentStyle={{
          fontSize: 12,
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
        }}
        formatter={(v) => [formatY ? formatY(v) : String(v), dataKey]}
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === 'bar' ? (
        <BarChart {...commonProps}>
          {axes}
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      ) : type === 'line' ? (
        <LineChart {...commonProps}>
          {axes}
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <AreaChart {...commonProps}>
          {axes}
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.12} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            dot={false}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
