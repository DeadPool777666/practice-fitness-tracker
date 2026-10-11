import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { workoutsApi } from '../services/api.js'
import { dateKey } from '../services/workoutTemplates.js'

const emptyExercise = () => ({ name: '', sets: 3, reps: 10, weight: '' })
const blankWorkout = () => ({ title: '', date: dateKey(), duration: 30, intensity: 'Средняя', exercises: [emptyExercise()], notes: '', completed: false })

export default function WorkoutFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const location = useLocation()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(() => {
    const template = location.state?.template
    if (editing || !template) return blankWorkout()
    return { ...blankWorkout(), title: template.title, duration: template.duration, intensity: template.intensity, exercises: template.exercises.map((exercise) => ({ ...exercise })), notes: 'Добавлено из каталога тренировок.' }
  })
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    workoutsApi.get(id).then((result) => setWorkout({ ...result, exercises: result.exercises.length ? result.exercises : [emptyExercise()] })).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false))
  }, [editing, id])

  function updateField(field, value) { setWorkout((current) => ({ ...current, [field]: value })) }
  function updateExercise(index, field, value) { setWorkout((current) => ({ ...current, exercises: current.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) })) }
  function addExercise() { setWorkout((current) => ({ ...current, exercises: [...current.exercises, emptyExercise()] })) }
  function removeExercise(index) { setWorkout((current) => ({ ...current, exercises: current.exercises.filter((_, itemIndex) => itemIndex !== index) })) }

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setError('')
    const clean = { ...workout, duration: Number(workout.duration), exercises: workout.exercises.filter((exercise) => exercise.name.trim()).map((exercise) => ({ ...exercise, sets: Number(exercise.sets), reps: Number(exercise.reps), weight: exercise.weight === '' ? null : Number(exercise.weight) })) }
    try {
      const result = editing ? await workoutsApi.update(id, clean) : await workoutsApi.create(clean)
      navigate(`/workouts/${result.id}`)
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="route-loading" role="status">Загружаем тренировку…</div>
  return <div className="inner-page form-page"><Link className="back-link" to="/dashboard"><ArrowLeft size={16} />Личный кабинет</Link><div className="form-page-heading"><span className="section-index">{editing ? 'ОБНОВИТЬ ЗАПИСЬ' : 'НОВАЯ ЗАПИСЬ'}</span><h1>{editing ? 'Измени детали.' : 'Запланируй движение.'}</h1><p>Записи сохраняются в твоём личном журнале.</p></div>
    <form className="workout-form" onSubmit={handleSubmit}><div className="form-grid"><label className="form-field field-wide">Название тренировки<input value={workout.title} onChange={(event) => updateField('title', event.target.value)} required minLength="2" maxLength="100" placeholder="Например, утреннее кардио" /></label><label className="form-field">Дата<input type="date" value={workout.date} onChange={(event) => updateField('date', event.target.value)} required /></label><label className="form-field">Длительность, мин<input type="number" value={workout.duration} onChange={(event) => updateField('duration', event.target.value)} min="1" max="600" required /></label><label className="form-field">Интенсивность<select value={workout.intensity} onChange={(event) => updateField('intensity', event.target.value)}><option>Низкая</option><option>Средняя</option><option>Высокая</option><option>Экстремальная</option></select></label></div>
      <div className="exercise-editor"><div className="editor-heading"><div><span className="section-index">СОСТАВ ТРЕНИРОВКИ</span><h2>Упражнения</h2></div><button className="button button-outline button-small" type="button" onClick={addExercise}><Plus size={15} />Добавить</button></div>{workout.exercises.map((exercise, index) => <div className="exercise-edit-row" key={index}><span className="edit-index">{String(index + 1).padStart(2, '0')}</span><label className="form-field exercise-title-field"><span className="sr-only">Название упражнения</span><input value={exercise.name} onChange={(event) => updateExercise(index, 'name', event.target.value)} maxLength="100" placeholder="Название упражнения" /></label><label className="form-field number-field"><span>Подходы</span><input type="number" value={exercise.sets} onChange={(event) => updateExercise(index, 'sets', event.target.value)} min="1" max="100" /></label><label className="form-field number-field"><span>Повторы</span><input type="number" value={exercise.reps} onChange={(event) => updateExercise(index, 'reps', event.target.value)} min="1" max="1000" /></label><label className="form-field number-field"><span>Вес, кг</span><input type="number" value={exercise.weight ?? ''} onChange={(event) => updateExercise(index, 'weight', event.target.value)} min="0" max="1000" step="0.5" placeholder="—" /></label><button className="icon-button danger-icon remove-exercise" type="button" onClick={() => removeExercise(index)} aria-label="Удалить упражнение" disabled={workout.exercises.length === 1}><Trash2 size={16} /></button></div>)}</div>
      <label className="form-field notes-field">Заметки и самочувствие<textarea value={workout.notes} onChange={(event) => updateField('notes', event.target.value)} maxLength="2000" rows="4" placeholder="Как прошло занятие? Что хочется отметить?" /></label>
      <label className="checkbox-field"><input type="checkbox" checked={workout.completed} onChange={(event) => updateField('completed', event.target.checked)} /><span className="custom-checkbox" /><span>Тренировка уже выполнена</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><Link className="button button-quiet" to="/dashboard">Отмена</Link><button className="button button-dark" type="submit" disabled={saving}><Save size={16} />{saving ? 'Сохраняем…' : editing ? 'Сохранить изменения' : 'Сохранить тренировку'}</button></div>
    </form>
  </div>
}