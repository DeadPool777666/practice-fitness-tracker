// Внешний GET-запрос (DummyJSON) с таймаутом; при ошибке интерфейс показывает запасной текст
export async function fetchQuote() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch('https://dummyjson.com/quotes/random', { signal: controller.signal })
    if (!response.ok) throw new Error('Цитата недоступна')
    const { quote, author } = await response.json()
    return { quote, author }
  } catch {
    throw new Error('Цитата недоступна')
  } finally {
    clearTimeout(timer)
  }
}
