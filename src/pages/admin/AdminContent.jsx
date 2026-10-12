import { useState } from 'react'
import { adminApi, challengesApi, exercisesApi } from '../../services/api.js'
import { useLoad } from '../../services/useLoad.js'
import { useToast } from '../../context/useToast.js'
import { Skeleton } from '../../components/Skeleton.jsx'
import { ErrorBanner, ErrorState } from '../../components/StatePanels.jsx'
import { difficulties, equipments, muscles } from '../../services/labels.js'

const blankExercise = { name: '', description: '', muscle: 'Грудь', equipment: 'Штанга', difficulty: 'Новичок', instructions: '', imageUrl: '' }
const blankChallenge = { title: '', description: '', kind: 'workouts', target: 10 }
const kinds = [['workouts', 'тренировок'], ['cardio', 'кардио'], ['hours', 'часов'], ['days', 'дней активности'], ['streak', 'дней подряд']]

function useCrud(loader, api, blank, label) {
  const list = useLoad(loader)
  const { notify } = useToast()
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const reset = () => { setForm(blank); setEditingId(null) }
  async function submit(event) {
    event.preventDefault(); setError(null)
    try {
      if (editingId) { const saved = await api.update(editingId, form); list.setData((items) => items.map((item) => item.id === editingId ? saved : item)); notify(`${label} обновлён`) }
      else { const saved = await api.create(form); list.setData((items) => [...items, saved]); notify(`${label} создан`) }
      reset()
    } catch (requestError) { setError(requestError) }
  }
  async function remove(item) {
    try { await api.remove(item.id); list.setData((items) => items.filter((entry) => entry.id !== item.id)); notify(`${label} удалён`) } catch (requestError) { setError(requestError) }
  }
  return { list, form, setForm, editingId, setEditingId, error, submit, remove, reset }
}

export function AdminExercises() {
  const crud = useCrud(() => exercisesApi.list(), { create: adminApi.createExercise, update: adminApi.updateExercise, remove: adminApi.removeExercise }, blankExercise, 'Упражнение')
  const { list, form, setForm } = crud
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const select = (field, options, label) => <label className="form-field">{label}<select value={form[field]} onChange={(event) => set(field, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  return <>
    <form className="panel-form" onSubmit={crud.submit}><h2>{crud.editingId ? 'Изменить упражнение' : 'Новое упражнение'}</h2>
      <div className="form-grid"><label className="form-field">Название<input required minLength={2} value={form.name} onChange={(event) => set('name', event.target.value)} /></label>{select('muscle', muscles, 'Мышцы')}{select('equipment', equipments, 'Оборудование')}{select('difficulty', difficulties, 'Сложность')}</div>
      <label className="form-field">Описание<input value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
      <label className="form-field">Техника<textarea rows={3} value={form.instructions} onChange={(event) => set('instructions', event.target.value)} /></label>
      <label className="form-field">Ссылка на изображение (необязательно)<input value={form.imageUrl} onChange={(event) => set('imageUrl', event.target.value)} placeholder="https://…" /></label>
      <ErrorBanner error={crud.error} /><div className="form-actions">{crud.editingId && <button className="button button-quiet" type="button" onClick={crud.reset}>Отмена</button>}<button className="button button-dark" type="submit">{crud.editingId ? 'Сохранить' : 'Создать'}</button></div></form>
    {list.loading ? <Skeleton lines={5} height={34} /> : list.error ? <ErrorState message={list.error} onRetry={list.retry} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Название</th><th>Мышцы</th><th>Оборудование</th><th>Сложность</th><th /></tr></thead><tbody>{list.data.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.muscle}</td><td>{item.equipment}</td><td>{item.difficulty}</td>
      <td className="row-actions"><button className="button button-quiet button-small" type="button" onClick={() => { crud.setEditingId(item.id); setForm({ ...blankExercise, ...item }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Изменить</button><button className="button button-quiet button-small" type="button" onClick={() => crud.remove(item)}>Удалить</button></td></tr>)}</tbody></table></div>}
  </>
}

export function AdminChallenges() {
  const crud = useCrud(() => challengesApi.list(), { create: adminApi.createChallenge, update: adminApi.updateChallenge, remove: adminApi.removeChallenge }, blankChallenge, 'Челлендж')
  const { list, form, setForm } = crud
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  return <>
    <form className="panel-form" onSubmit={crud.submit}><h2>{crud.editingId ? 'Изменить челлендж' : 'Новый челлендж'}</h2>
      <div className="form-grid"><label className="form-field">Название<input required minLength={2} value={form.title} onChange={(event) => set('title', event.target.value)} /></label>
        <label className="form-field">Метрика<select value={form.kind} onChange={(event) => set('kind', event.target.value)}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field">Цель<input type="number" min="1" max="1000" required value={form.target} onChange={(event) => set('target', event.target.value)} /></label></div>
      <label className="form-field">Описание<input value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
      <ErrorBanner error={crud.error} /><div className="form-actions">{crud.editingId && <button className="button button-quiet" type="button" onClick={crud.reset}>Отмена</button>}<button className="button button-dark" type="submit">{crud.editingId ? 'Сохранить' : 'Создать'}</button></div></form>
    {list.loading ? <Skeleton lines={4} height={34} /> : list.error ? <ErrorState message={list.error} onRetry={list.retry} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Название</th><th>Метрика</th><th>Цель</th><th /></tr></thead><tbody>{list.data.map((item) => <tr key={item.id}><td>{item.title}</td><td>{item.kind}</td><td>{item.target}</td>
      <td className="row-actions"><button className="button button-quiet button-small" type="button" onClick={() => { crud.setEditingId(item.id); setForm({ title: item.title, description: item.description, kind: item.kind, target: item.target }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Изменить</button><button className="button button-quiet button-small" type="button" onClick={() => crud.remove(item)}>Удалить</button></td></tr>)}</tbody></table></div>}
  </>
}
