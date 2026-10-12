import { useState } from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountApi } from '../services/api.js'
import { useLoad } from '../services/useLoad.js'
import { useAuth } from '../context/useAuth.js'
import { useToast } from '../context/useToast.js'
import { ErrorBanner } from '../components/StatePanels.jsx'

const usd = (cents) => `$${(cents / 100).toFixed(2)}`
const freeFeatures = ['Журнал тренировок и календарь', 'Библиотека упражнений', 'Аналитика, достижения, XP', 'До 3 целей, 2 шаблонов и 1 активного челленджа']
const proFeatures = ['Безлимитные цели, шаблоны и челленджи', 'Все функции Free', 'Значок Pro в профиле', 'Приоритетные новые функции']

export default function PricingPage() {
  const { user, refresh } = useAuth()
  const billing = useLoad(() => (user ? accountApi.billing() : Promise.resolve(null)), user?.id)
  const { notify } = useToast()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function subscribe(plan) {
    setBusy(true); setError(null)
    try { billing.setData(await accountApi.subscribe(plan)); await refresh(); notify('Pro активирован (демо-оплата)') } catch (requestError) { setError(requestError) } finally { setBusy(false) }
  }
  async function cancel() {
    try { billing.setData(await accountApi.cancel()); await refresh(); notify('Подписка отменена') } catch (requestError) { setError(requestError) }
  }
  const pro = billing.data?.isPro
  return <div className="inner-page">
    <div className="page-heading"><div><span className="section-index">ТАРИФЫ</span><h1>Начни бесплатно,<br /><em>расти с Pro.</em></h1></div><p>Демо-режим: оплата имитируется, деньги не списываются.</p></div>
    <ErrorBanner error={error} />
    <div className="pricing-grid">
      <article className="price-card"><span className="section-index">FREE</span><strong className="price">$0</strong><ul>{freeFeatures.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>{user && !pro && <span className="completion-tag tag-done">Ваш тариф</span>}</article>
      <article className="price-card price-pro"><span className="section-index">PRO</span><strong className="price">{usd(499)}<small> / мес</small></strong><ul>{proFeatures.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        {!user ? <Link className="button button-dark" to="/register">Создать аккаунт</Link> : pro ? <><span className="completion-tag tag-done">Активен до {billing.data.expiresAt.slice(0, 10)}</span><button className="button button-quiet" type="button" onClick={cancel}>Отменить подписку</button></>
          : <div className="form-actions"><button className="button button-dark" type="button" disabled={busy} onClick={() => subscribe('month')}>Pro на месяц · {usd(499)}</button><button className="button button-quiet" type="button" disabled={busy} onClick={() => subscribe('year')}>Pro на год · {usd(3999)}</button></div>}
      </article>
    </div>
    {billing.data && !pro && <p className="muted-line">Использовано: цели {billing.data.usage.goals}/{billing.data.limits.goals}, шаблоны {billing.data.usage.templates}/{billing.data.limits.templates}, челленджи {billing.data.usage.challenges}/{billing.data.limits.challenges}.</p>}
  </div>
}
