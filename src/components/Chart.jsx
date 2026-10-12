// Простые графики без библиотек: столбцы на CSS и линия на SVG
export function BarChart({ data, unit = '', height = 140 }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  return <div className="bar-chart" style={{ height }} role="img" aria-label={data.map((item) => `${item.label}: ${item.value}${unit}`).join(', ')}>
    {data.map((item) => <div className="bar-col" key={item.label}>
      <span className="bar-value">{item.value}</span>
      <i style={{ height: `${Math.max(item.value ? 6 : 2, (item.value / max) * 100)}%` }} />
      <span className="bar-label">{item.label}</span>
    </div>)}
  </div>
}

export function LineChart({ points, unit = '' }) {
  if (!points.length) return null
  const width = 600
  const height = 200
  const pad = 28
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (index) => pad + (points.length === 1 ? (width - pad * 2) / 2 : (index / (points.length - 1)) * (width - pad * 2))
  const y = (value) => height - pad - ((value - min) / span) * (height - pad * 2)
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')
  return <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`График: ${points.map((point) => `${point.label} ${point.value}${unit}`).join(', ')}`}>
    <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="chart-axis" />
    <path d={path} className="chart-line" />
    {points.map((point, index) => <g key={point.label + index}>
      <circle cx={x(index)} cy={y(point.value)} r="4.5" className="chart-dot" />
      <text x={x(index)} y={y(point.value) - 10} textAnchor="middle" className="chart-text">{point.value}{unit}</text>
      <text x={x(index)} y={height - 8} textAnchor="middle" className="chart-text chart-muted">{point.label}</text>
    </g>)}
  </svg>
}
