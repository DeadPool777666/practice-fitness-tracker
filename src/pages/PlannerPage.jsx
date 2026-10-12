import { useState } from 'react'
import { Play, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { planningApi, workoutsApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useToast } from '../context/useToast.js'
import { dateKey } from '../services/workoutTemplates.js'
import { formatExerciseLines, parseExerciseLines, todayWeekday, weekdayNames, workoutTypes } from '../services/stats.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { EmptyState, ErrorBanner, ErrorState } from '../components/StatePanels.jsx'

const intensities = ['Низкая', 'Средняя', 'Высокая', 'Экстремальная']
const blankTemplate = { title: '', type: 'Силовая', duration: 45, intensity: 'Средняя', lines: '' }

export default function PlannerPage() {
  const planner = useLoad(() => planningApi.planner())
  const templates = useLoad(() => planningApi.templates())
  const { notify } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(blankTemplate)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [dayDrafts, setDayDrafts] = useState({})
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const byDay = Object.fromEntries((planner.data ?? []).map((row) => [row.weekday, row]))

  async function saveDay(weekday, plan) {
    setError(null)
    try { const saved = await planningApi.setDay(weekday, plan); planner.setData((rows) => [...rows.filter((row) => row.weekday !== weekday), saved]); notify('План дня сохранён') }
    catch (requestError) { setError(requestError) }
  }
  async function clearDay(weekday) {
    try { await planningApi.clearDay(weekday); planner.setData((rows) => rows.filter((row) => row.weekday !== weekday)) } catch (requestError) { setError(requestError) }
  }
  const fillFromTemplate = (weekday, templateId) => {
    const template = templates.data.find((item) => item.id === Number(templateId))
    if (template) saveDay(weekday, { title: template.title, type: template.type, duration: template.duration, intensity: template.intensity })
  }

  async function submitTemplate(event) {
    event.preventDefault()
    setError(null)
    const payload = { title: form.title, type: form.type, duration: Number(form.duration), intensity: form.intensity, exercises: parseExerciseLines(form.lines) }
    try {
      if (editingId) { const updated = await planningApi.updateTemplate(editingId, payload); templates.setData((items) => items.map((item) => item.id === editingId ? updated : item)); notify('Шаблон обновлён') }
      else { const created = await planningApi.createTemplate(payload); templates.setData((items) => [created, ...items]); notify('Шаблон создан') }
      setForm(blankTemplate); setEditingId(null)
    } catch (requestError) { setError(requestError); notify('Не удалось сохранить шаблон', 'error') }
  }
  async function removeTemplate(template) {
    try { await planningApi.removeTemplate(template.id); templates.setData((items) => items.filter((item) => item.id !== template.id)); notify('Шаблон удалён') } catch (requestError) { setError(requestError) }
  }
  async function startFromTemplate(template) {
    try {
      const created = await workoutsApi.create({ title: template.title, date: dateKey(), duration: template.duration, intensity: template.intensity, type: template.type, exercises: template.exercises, notes: '', completed: false })
      navigate(`/workouts/${created.id}/start`)
    } catch (requestError) { setError(requestError) }
  }
  const editTemplate = (template) => { setEditingId(template.id); setForm({ title: template.title, type: template.type, duration: template.duration, intensity: template.intensity, lines: formatExerciseLines(template.exercises) }); window.scrollTo({ top: 400, behavior: 'smooth' }) }

  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">ПЛАНИРОВЩИК</span><h1>Неделя<br /><em>по плану.</em></h1></div><p>План на сегодня показывается на дашборде.</p></div>
    <ErrorBanner error={error} />
    {planner.loading || templates.loading ? <Skeleton lines={7} height={40} /> : planner.error || templates.error ? <ErrorState message={planner.error || templates.error} onRetry={() => { planner.retry(); templates.retry() }} /> : <>
      <section className="week-plan">{weekdayNames.map((name, weekday) => {
        const plan = byDay[weekday]
        const draft = dayDrafts[weekday] ?? { type: 'Силовая', title: '', duration: 45 }
        const setDraft = (patch) => setDayDrafts((current) => ({ ...current, [weekday]: { ...draft, ...patch } }))
        return <div className={`plan-day${weekday === todayWeekday() ? ' is-today' : ''}`} key={name}>
          <strong>{name}</strong>
          {plan ? <div className="plan-current"><span>{plan.type === 'Отдых' ? 'Отдых' : `${plan.title} · ${plan.duration} мин · ${plan.intensity}`}</span><button className="icon-button" type="button" onClick={() => clearDay(weekday)} aria-label={`Очистить ${name}`}><Trash2 size={15} /></button></div>
            : <div className="plan-edit">
              <select aria-label={`Тип, ${name}`} value={draft.type} onChange={(event) => setDraft({ type: event.target.value })}>{[...workoutTypes, 'Отдых'].map((type) => <option key={type}>{type}</option>)}</select>
              <input aria-label={`Название, ${name}`} placeholder="Название" value={draft.title} onChange={(event) => setDraft({ title: event.target.value })} />
              <button className="button button-quiet button-small" type="button" onClick={() => saveDay(weekday, { title: draft.type === 'Отдых' ? 'Отдых' : (draft.title || draft.type), type: draft.type, duration: Number(draft.duration) || 30, intensity: 'Средняя' })}>Добавить</button>
              {templates.data.length > 0 && <select aria-label={`Из шаблона, ${name}`} value="" onChange={(event) => fillFromTemplate(weekday, event.target.value)}><option value="">Из шаблона…</option>{templates.data.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select>}
            </div>}
        </div>
      })}</section>

      <section className="template-section"><div className="section-heading"><div><span className="section-index">ШАБЛОНЫ</span><h2>Мои шаблоны</h2></div></div>
        <form className="panel-form" onSubmit={submitTemplate}>
          <div className="form-grid">
            <label className="form-field">Название<input required minLength={2} value={form.title} onChange={(event) => set('title', event.target.value)} /></label>
            <label className="form-field">Тип<select value={form.type} onChange={(event) => set('type', event.target.value)}>{workoutTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="form-field">Минут<input type="number" min="1" max="600" required value={form.duration} onChange={(event) => set('duration', event.target.value)} /></label>
            <label className="form-field">Интенсивность<select value={form.intensity} onChange={(event) => set('intensity', event.target.value)}>{intensities.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <label className="form-field">Упражнения (строка: название; подходы; повторы; вес)<textarea rows={4} value={form.lines} onChange={(event) => set('lines', event.target.value)} placeholder={'Жим лёжа; 3; 10; 60\nПодтягивания; 3; 8'} /></label>
          <div className="form-actions">{editingId && <button type="button" className="button button-quiet" onClick={() => { setEditingId(null); setForm(blankTemplate) }}>Отмена</button>}<button className="button button-dark" type="submit"><Plus size={16} />{editingId ? 'Сохранить шаблон' : 'Создать шаблон'}</button></div>
        </form>
        {templates.data.length === 0 ? <EmptyState title="Шаблонов пока нет" text="Создай шаблон и запускай тренировку одним нажатием." /> : <div className="card-list">{templates.data.map((template) => <article className="goal-card" key={template.id}>
          <div className="goal-head"><div><strong>{template.title}</strong><span>{template.type} · {template.duration} мин · {template.intensity}</span></div></div>
          {template.exercises.length > 0 && <ul className="mini-list">{template.exercises.map((exercise, index) => <li key={index}>{exercise.name} · {exercise.sets} × {exercise.reps}{exercise.weight ? ` · ${exercise.weight} кг` : ''}</li>)}</ul>}
          <div className="form-actions"><button className="button button-quiet button-small" type="button" onClick={() => editTemplate(template)}>Изменить</button><button className="button button-quiet button-small" type="button" onClick={() => removeTemplate(template)}>Удалить</button><button className="button button-dark button-small" type="button" onClick={() => startFromTemplate(template)}><Play size={14} />Запустить</button></div>
        </article>)}</div>}
      </section></>}
  </div>
}
