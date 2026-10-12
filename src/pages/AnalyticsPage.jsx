import { useMemo } from 'react'
import { workoutsApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { buildAnalytics } from '../services/analytics.js'
import { computeStreaks, formatMinutes } from '../services/stats.js'
import { BarChart } from '../components/Chart.jsx'
import { Skeleton } from '../components/Skeleton.jsx'
import { EmptyState, ErrorState } from '../components/StatePanels.jsx'

const moodEmoji = ['', '😫', '😐', '🙂', '😄', '🔥']

export default function AnalyticsPage() {
  const { data, loading, error, retry } = useLoad(() => workoutsApi.list())
  const stats = useMemo(() => (data ? buildAnalytics(data) : null), [data])
  const streaks = useMemo(() => (data ? computeStreaks(data) : null), [data])
  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">АНАЛИТИКА</span><h1>Цифры<br /><em>твоего пути.</em></h1></div></div>
    {loading ? <Skeleton lines={6} height={36} /> : error ? <ErrorState message={error} onRetry={retry} /> : stats.total === 0
      ? <EmptyState title="Пока нечего анализировать" text="Выполни первую тренировку — и здесь появятся графики." to="/workouts/new" action="Создать тренировку" />
      : <>
        <div className="stat-grid">
          <div className="stat-card"><span className="section-index">ВСЕГО</span><strong>{stats.total}</strong><small>тренировок</small></div>
          <div className="stat-card"><span className="section-index">ВРЕМЯ</span><strong>{formatMinutes(stats.minutes)}</strong><small>суммарно</small></div>
          <div className="stat-card"><span className="section-index">В СРЕДНЕМ</span><strong>{stats.average} м</strong><small>на тренировку</small></div>
          <div className="stat-card"><span className="section-index">СЕРИЯ</span><strong>{streaks.current}</strong><small>лучшая: {streaks.best}</small></div>
          <div className="stat-card"><span className="section-index">САМАЯ ДОЛГАЯ</span><strong>{stats.longest.duration} м</strong><small>{stats.longest.title}</small></div>
          <div className="stat-card"><span className="section-index">ЧАЩЕ ВСЕГО</span><strong className="stat-text">{stats.topExercise ? stats.topExercise[0] : '—'}</strong><small>{stats.topExercise ? `${stats.topExercise[1]} раз` : 'упражнений нет'}</small></div>
          <div className="stat-card"><span className="section-index">НАСТРОЕНИЕ</span><strong>{stats.averageMood ? `${moodEmoji[Math.round(stats.averageMood)]} ${stats.averageMood}` : '—'}</strong><small>среднее из 5</small></div>
        </div>
        <section className="chart-section"><h2>Тренировки по неделям</h2><BarChart data={stats.weeks.map((w) => ({ label: w.label, value: w.workouts }))} /></section>
        <section className="chart-section"><h2>Минуты по неделям</h2><BarChart data={stats.weeks.map((w) => ({ label: w.label, value: w.minutes }))} /></section>
        <section className="chart-section"><h2>Тренировки по месяцам</h2><BarChart data={stats.months.map((m) => ({ label: m.label, value: m.workouts }))} /></section>
        <div className="chart-pair"><section className="chart-section"><h2>Типы тренировок</h2><BarChart data={stats.types} /></section><section className="chart-section"><h2>Интенсивность</h2><BarChart data={stats.intensity} /></section></div>
      </>}
  </div>
}
