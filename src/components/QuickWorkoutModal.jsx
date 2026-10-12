import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { workoutsApi } from '../services/api.js'
import { dateKey } from '../services/workoutTemplates.js'
import { workoutTypes } from '../services/stats.js'

const intensities = ['Низкая', 'Средняя', 'Высокая', 'Экстремальная']

export default function QuickWorkoutModal({ onClose, onCreated, onError }) {
  const [form, setForm] = useState({ type: 'Кардио', duration: 30, intensity: 'Средняя', date: dateKey(), completed: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await workoutsApi.create({ title: `Быстрая: ${form.type}`, date: form.date, duration: Number(form.duration), intensity: form.intensity, type: form.type, exercises: [], notes: '', completed: form.completed })
      onCreated(created)
    } catch (error) { onError(error.message); setSaving(false) }
  }

  return <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="quick-title" onSubmit={submit}>
      <div className="modal-head"><div><span className="section-index">БЫСТРАЯ ЗАПИСЬ</span><h2 id="quick-title">Добавить за 10 секунд</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть"><X size={17} /></button></div>
      <div className="form-grid">
        <label className="form-field">Тип<select value={form.type} onChange={(event) => set('type', event.target.value)}>{workoutTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="form-field">Минут<input type="number" min="1" max="600" required value={form.duration} onChange={(event) => set('duration', event.target.value)} /></label>
        <label className="form-field">Интенсивность<select value={form.intensity} onChange={(event) => set('intensity', event.target.value)}>{intensities.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="form-field">Дата<input type="date" required value={form.date} onChange={(event) => set('date', event.target.value)} /></label>
      </div>
      <label className="checkbox-field"><input type="checkbox" checked={form.completed} onChange={(event) => set('completed', event.target.checked)} /><span className="custom-checkbox" /><span>Уже выполнена</span></label>
      <div className="form-actions"><button type="button" className="button button-quiet" onClick={onClose}>Отмена</button><button className="button button-dark" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
    </form>
  </div>
}
