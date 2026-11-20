function linesFromPage(items) {
  const positioned = items.filter(item => item.str?.trim()).sort((a, b) => b.transform[5] - a.transform[5])
  const rows = []
  for (const item of positioned) {
    const y = item.transform[5]
    const last = rows.at(-1)
    if (last && Math.abs(last.y - y) <= 5) last.items.push(item)
    else rows.push({ y, items: [item] })
  }
  return rows.map(({ items: row }) => row.sort((a, b) => a.transform[4] - b.transform[4])
    .map(item => item.str.trim()).join(' ').replace(/\s+/g, ' ').trim())
}

function parseBirthDate(value) {
  const parts = value?.match(/^(?:(\d{4})[-/](\d{1,2})[-/](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}))(?!\d)/)
  if (!parts) return ''
  const [, yearFirst, monthFirst, dayFirst, dayLast, monthLast, yearLast] = parts
  const year = yearFirst ?? yearLast
  const month = (monthFirst ?? monthLast).padStart(2, '0')
  const day = (dayFirst ?? dayLast).padStart(2, '0')
  const iso = `${year}-${month}-${day}`
  const date = new Date(iso + 'T00:00:00Z')
  return Number(year) > 0 && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : ''
}

export function extractParivahanFields(pages) {
  const lines = pages.flatMap(linesFromPage)
  const valueFor = pattern => lines.map(line => line.match(pattern)?.[1]?.trim()).find(Boolean) ?? ''
  if (!lines.some(line => /parivahan|sarathi|learner['’]?s? licen[cs]e/i.test(line))) return null
  const name = valueFor(/^(?:\d+\.\s*)?(?:name of (?:the )?applicant|applicant(?:['’]s)? name|full name|name)\s*[:.]+\s*(.+)$/i)
  const birthDate = parseBirthDate(valueFor(/^(?:\d+\.\s*)?(?:date of birth|d\.?\s*o\.?\s*b\.?)\s*[:.]*\s*(.+)$/i))
  if (!name || name.length > 120 || !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]{1,119}$/u.test(name) || !birthDate) return null
  const application = valueFor(/^application\s+(?:no\.?|number)[.\s:]*([\w/-]{4,40})(?=\s|$)/i)
  const phone = valueFor(/^(?:\d+\.\s*)?(?:mobile|phone)(?:\s+(?:no\.?|number))?\s*[:.]+\s*(\+?\d[\d ()-]{6,24})$/i)
  const email = valueFor(/^(?:\d+\.\s*)?e[ -]?mail(?:\s+(?:address|id))?\s*[:.]+\s*([^\s@]+@[^\s@]+\.[^\s@]+)$/i)
  return { name, birthDate, application, phone, email }
}
