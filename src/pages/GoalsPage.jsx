import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { goalsApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useToast } from '../context/useToast.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { goalTypeLabels } from '../services/labels.js'
import { Skeleton } from '../components/Skeleton.jsx'
import { EmptyState, ErrorBanner, ErrorState } from '../components/StatePanels.jsx'

const blank = { title: '', type: 'workouts', target: 10, deadline: '' }

export default function GoalsPage() {
  const { data, loading, error, retry, setData } = useLoad(() => goalsApi.list())
  const { notify } = useToast()
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event) {
    event.preventDefault()
    setFormError(null)
    try {
      const payload = { ...form, target: Number(form.target), deadline: form.deadline || null }
      if (editingId) {
        const updated = await goalsApi.update(editingId, payload)
        setData((items) => items.map((item) => item.id === editingId ? updated : item))
        notify('Цель обновлена')
      } else {
        const created = await goalsApi.create(payload)
        setData((items) => [created, ...items])
        notify('Цель создана')
      }
      setForm(blank); setEditingId(null)
    } catch (requestError) { setFormError(requestError); notify('Не удалось сохранить цель', 'error') }
  }
  async function remove(goal) {
    try { await goalsApi.remove(goal.id); setData((items) => items.filter((item) => item.id !== goal.id)); notify('Цель удалена') }
    catch { notify('Не удалось удалить цель', 'error') }
  }
  const edit = (goal) => { setEditingId(goal.id); setForm({ title: goal.title, type: goal.type, target: goal.target, deadline: goal.deadline || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">ЦЕЛИ</span><h1>Куда<br /><em>идём дальше.</em></h1></div></div>
    <form className="panel-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field">Название<input required minLength={2} maxLength={100} value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="Например: 20 тренировок" /></label>
        <label className="form-field">Тип<select value={form.type} onChange={(event) => set('type', event.target.value)}>{Object.entries(goalTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field">Цель<input type="number" min="1" max="1000" required value={form.target} onChange={(event) => set('target', event.target.value)} /></label>
        <label className="form-field">Срок (необязательно)<input type="date" value={form.deadline} onChange={(event) => set('deadline', event.target.value)} /></label>
      </div>
      <ErrorBanner error={formError} />
      <div className="form-actions">{editingId && <button type="button" className="button button-quiet" onClick={() => { setEditingId(null); setForm(blank) }}>Отмена</button>}<button className="button button-dark" type="submit"><Plus size={16} />{editingId ? 'Сохранить' : 'Добавить цель'}</button></div>
    </form>
    {loading ? <Skeleton lines={4} height={40} /> : error ? <ErrorState message={error} onRetry={retry} /> : data.length === 0
      ? <EmptyState title="Целей пока нет" text="Поставь первую цель — прогресс считается автоматически по выполненным тренировкам." />
      : <div className="card-list">{data.map((goal) => <article className={`goal-card${goal.status === 'completed' ? ' is-done' : ''}`} key={goal.id}>
        <div className="goal-head"><div><strong>{goal.title}</strong><span>{goal.target} {goalTypeLabels[goal.type]}{goal.deadline ? ` · до ${goal.deadline}` : ''}</span></div>
          <span className={`completion-tag${goal.status === 'completed' ? ' tag-done' : ''}`}>{goal.status === 'completed' ? 'Выполнена' : 'В процессе'}</span></div>
        <ProgressBar value={goal.current} max={goal.target} label={goal.title} />
        <div className="goal-foot"><span>{Math.min(goal.current, goal.target)} / {goal.target}{goal.status !== 'completed' && ` · осталось ${Math.max(0, goal.target - goal.current)}`}</span>
          <span className="row-actions"><button className="icon-button" type="button" onClick={() => edit(goal)} aria-label={`Изменить ${goal.title}`}><Pencil size={15} /></button><button className="icon-button" type="button" onClick={() => remove(goal)} aria-label={`Удалить ${goal.title}`}><Trash2 size={15} /></button></span></div>
      </article>)}</div>}
  </div>
}
