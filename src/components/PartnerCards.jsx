// Демо второго источника дохода: партнёрские карточки (ссылки-заглушки, реальных переходов нет)
const partners = [
  { title: 'Гантели разборные', text: 'Для домашних силовых тренировок', badge: 'Экипировка' },
  { title: 'Умные часы для спорта', text: 'Пульс, шаги и сон в одном месте', badge: 'Гаджеты' },
  { title: 'Протеин и добавки', text: 'Спортивное питание от партнёра', badge: 'Питание' },
]

export default function PartnerCards() {
  return <section className="partner-section"><div className="section-heading"><div><span className="section-index">ПАРТНЁРЫ / ДЕМО</span><h2>Для тренировок</h2></div></div>
    <div className="exercise-grid">{partners.map((item) => <article className="exercise-card partner-card" key={item.title}><span className="tag">{item.badge}</span><h3>{item.title}</h3><p>{item.text}</p><small>Партнёрский блок · демонстрация монетизации</small></article>)}</div></section>
}
