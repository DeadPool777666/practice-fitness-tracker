import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, Check, Clock3, Dumbbell, Footprints, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { workoutsApi } from '../services/api.js'
import { dateKey, getRecommendation } from '../services/workoutTemplates.js'

export default function HomePage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!user) return
    workoutsApi.list().then((items) => { setWorkouts(items); setStatus('ready') }).catch(() => setStatus('error'))
  }, [user])

  const todayWorkouts = workouts.filter((workout) => workout.date === dateKey() && workout.completed)
  const recommendation = user ? getRecommendation(user, workouts) : null

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> ТРЕКЕР ДВИЖЕНИЯ И ПРОГРЕССА</div>
          <h1>Сильнее.<br /><em>В своём ритме.</em></h1>
          <p className="hero-description">Тренируйся осознанно: фиксируй занятия, замечай закономерности и выбирай нагрузку, которая подходит именно тебе.</p>
          <div className="hero-actions"><Link className="button button-dark" to={user ? '/dashboard' : '/register'}>{user ? 'Открыть мой прогресс' : 'Начать бесплатно'}<ArrowRight size={17} /></Link><Link className="text-link" to="/workouts">Посмотреть тренировки<ArrowDownRight size={15} /></Link></div>
          <div className="hero-proof"><span className="proof-icon"><Check size={15} /></span><span>Никаких идеальных планов.<br /><strong>Только твой следующий шаг.</strong></span></div>
        </div>
        <div className="hero-visual">
          <div className="hero-image" role="img" aria-label="Бегун тренируется на улице" />
          <div className="image-stamp"><span>MOVE</span><span>WITH INTENTION</span></div>
          <div className="hero-note"><span className="note-dot" /><span>ПРОГРЕСС НЕ ТРЕБУЕТ<br />ИДЕАЛЬНОГО ДНЯ</span><Footprints size={24} /></div>
        </div>
      </section>

      <section className="today-strip" aria-live="polite">
        <div className="today-date"><span className="section-index">01 / СЕГОДНЯ</span><h2>Как прошёл твой день?</h2></div>
        {user ? <div className={`today-status${todayWorkouts.length ? ' has-trained' : ''}`}>
          <span className="status-icon">{todayWorkouts.length ? <Check size={19} /> : <Dumbbell size={18} />}</span>
          <div><strong>{status === 'error' ? 'Статус временно недоступен' : status === 'ready' && todayWorkouts.length ? 'Тренировка выполнена' : 'Пока без тренировки'}</strong><span>{status === 'ready' && todayWorkouts.length ? `${todayWorkouts.length} занятие сегодня` : 'Любое движение уже считается'}</span></div>
          <Link className="icon-arrow" to="/dashboard" aria-label="Перейти к прогрессу"><ArrowRight size={17} /></Link>
        </div> : <div className="today-status guest-status"><span className="status-icon"><Dumbbell size={18} /></span><div><strong>Твой ритм начинается с записи</strong><span>Создай профиль, чтобы отмечать тренировки</span></div><Link className="icon-arrow" to="/register" aria-label="Создать профиль"><ArrowRight size={17} /></Link></div>}
      </section>

      {recommendation && <section className="recommendation-bar"><div className="recommendation-symbol"><Sparkles size={19} /></div><div><span className="section-index">ТВОЙ ОРИЕНТИР · ИМТ {recommendation.bmi} · ВОЗРАСТ {recommendation.ageCategory}</span><p>{recommendation.advice}</p></div><Link to="/dashboard" className="text-link">Подробнее<ArrowRight size={15} /></Link></section>}

      <section className="home-collections"><div className="section-heading"><div><span className="section-index">02 / НАЧНИ С ПРОСТОГО</span><h2>Движение на выбор</h2></div><Link className="text-link" to="/workouts">Все тренировки<ArrowRight size={15} /></Link></div>
        <div className="feature-grid">
          <Link to="/workouts" className="feature-tile feature-green"><span className="feature-number">01</span><Dumbbell size={23} /><h3>Собери свою<br />тренировку</h3><span className="feature-bottom">СИЛА · КАРДИО · МОБИЛЬНОСТЬ<ArrowRight size={16} /></span></Link>
          <Link to="/explore" className="feature-tile feature-dark"><span className="feature-number">02</span><Sparkles size={23} /><h3>Найди новый<br />челлендж</h3><span className="feature-bottom">ИДЕИ НА КАЖДЫЙ ДЕНЬ<ArrowRight size={16} /></span></Link>
          <div className="feature-stat"><Clock3 size={22} /><strong>20 мин</strong><span>тоже полноценная<br />тренировка</span><div className="stat-lines"><i /><i /><i /><i /><i /><i /><i /></div></div>
        </div>
      </section>
    </div>
  )
}