export default function Heatmap({ cells }) {
  return <div className="heatmap" role="img" aria-label="Календарь активности за последние 16 недель">
    {cells.map((cell) => <i key={cell.date} className={`heat-cell heat-${cell.level}`} title={cell.level < 0 ? '' : `${cell.date}: ${cell.minutes} мин`} />)}
  </div>
}
