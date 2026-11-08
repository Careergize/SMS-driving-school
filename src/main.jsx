import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, ArrowUp, BookOpen, CarFront, Check, ChevronDown, Clock, GraduationCap, IdCard, Mail, MapPin, Menu, MessageCircle, Phone, Plus, Route, ShieldCheck, X } from 'lucide-react'
import { articles, courses, extras, faqs, school, services } from './content'
import './styles.css'

const slides = [
  { title: 'Learn to drive', accent: 'with confidence.', description: 'From your first time behind the wheel to everyday driving, take it one lesson at a time with SMS Motor Driving School.' },
  { title: 'Find your pace.', accent: 'Own the road.', description: 'Explore programmes for first-time learners, returning drivers and anyone ready for more practice.' },
  { title: 'Build good habits.', accent: 'Drive for life.', description: 'Get comfortable with road signs, everyday manoeuvres and the decisions that make a safer driver.' },
]
const offerings = [...courses, ...services, ...extras]
const featuredProgrammes = [
  { id: 'super-learner', imagePosition: 'left' },
  { id: 'extended', imagePosition: 'center' },
  { id: 'learner', imagePosition: 'right' },
]
const nav = [
  ['Home', 'home'], ['About', 'about'], ['Services', 'services', services],
  ['Courses', 'courses', courses], ['Blog', 'blog'], ['New Cars', 'cars'],
  ['Tours', 'tours'], ['Contact', 'contact'],
]

function Heading({ eyebrow, title, children }) {
  return <header className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children && <p>{children}</p>}</header>
}

function App() {
  const [slide, setSlide] = useState(0)
  const [menu, setMenu] = useState(false)
  const [dropdown, setDropdown] = useState('')
  const [detail, setDetail] = useState(null)
  const [selected, setSelected] = useState('')
  const dialog = useRef(null)

  useEffect(() => {
    if (detail && !dialog.current.open) dialog.current.showModal()
  }, [detail])

  function advance(step) {
    setSlide(current => (current + step + slides.length) % slides.length)
  }

  function enquire(id = '') {
    if (dialog.current.open) dialog.current.close()
    setSelected(id)
    window.location.hash = 'contact'
    document.getElementById('contact').scrollIntoView()
  }

  function closeMenu() {
    setMenu(false)
    setDropdown('')
  }

  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header id="home">
      <div className="topbar"><div className="wrap flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span><CarFront size={15} /> SMS Motor Driving School</span>
          {school.hours && <span><Clock size={15} /> {school.hours}</span>}
          {school.address && <span className="max-sm:hidden"><MapPin size={15} /> {school.address}</span>}
        </div>
        {school.email ? <a href={'mailto:' + school.email}><Mail size={15} /> {school.email}</a> : <a href="#contact"><MessageCircle size={15} /> Enquiries</a>}
      </div></div>
      <div className="wrap navrow">
        <a className="brand" href="#home" onClick={closeMenu}><img src="/sms-logo.jpg" alt=""/><span><strong>SMS</strong><small>MOTOR DRIVING SCHOOL</small></span></a>
        <button className="menu-toggle" aria-expanded={menu} aria-controls="primary" aria-label={menu ? 'Close navigation' : 'Open navigation'} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
        <nav id="primary" className={menu ? 'nav open' : 'nav'} aria-label="Main navigation" onKeyDown={event => { if (event.key === 'Escape' && dropdown) { document.getElementById('toggle-' + dropdown)?.focus(); setDropdown('') } }}>
          {nav.map(([label, id, items]) => <div className="nav-item" key={id}>
            <a href={'#' + id} onClick={closeMenu}>{label}</a>
            {items && <><button id={'toggle-' + id} className="nav-chevron" aria-label={label + ' options'} aria-expanded={dropdown === id} aria-controls={'menu-' + id} onClick={() => setDropdown(dropdown === id ? '' : id)}><ChevronDown size={14}/></button>
            {dropdown === id && <div id={'menu-' + id} className="dropdown">{items.map(item => <button key={item.id} onClick={() => { closeMenu(); setDetail(item) }}>{item.name}</button>)}</div>}</>}
          </div>)}
        </nav>
        <a className="button nav-cta" href="#contact">Book a lesson <ArrowRight size={17}/></a>
      </div>
    </header>

    <main id="main">
      <section className="hero" aria-label="Driving school highlights">
        <div className="wrap hero-inner">
          <div className="hero-copy" key={slide} aria-live="polite">
            <span className="eyebrow">Enjoy the art of driving</span>
            <h1>{slides[slide].title}<br/><em>{slides[slide].accent}</em></h1>
            <p>{slides[slide].description}</p>
            <div className="flex flex-wrap items-center gap-5"><a href="#courses" className="button">Explore courses <ArrowRight size={19}/></a><a className="hero-link" href="#contact">Get in touch <ArrowRight size={17}/></a></div>
          </div>
          <div className="carousel">
            <div className="flex items-center gap-2">{slides.map((item, index) => <button key={item.title} className={'dot ' + (slide === index ? 'active' : '')} aria-label={'Show slide ' + (index + 1)} aria-pressed={slide === index} onClick={() => setSlide(index)} />)}</div>
            <div className="flex gap-2"><button aria-label="Previous slide" onClick={() => advance(-1)}><ArrowLeft size={19}/></button><button aria-label="Next slide" onClick={() => advance(1)}><ArrowRight size={19}/></button></div>
          </div>
        </div>
      </section>

      <div className="wrap benefits">
        {[[CarFront, 'Practical driving', 'Get comfortable behind the wheel'], [GraduationCap, 'Learn at your pace', 'Programmes for different skill levels'], [IdCard, 'Licence guidance', 'Get help planning your next step']].map(([Icon, title, caption]) => <div key={title}><span className="tile-icon"><Icon size={25}/></span><div><strong>{title}</strong><p>{caption}</p></div></div>)}
      </div>

      <section id="about" className="wrap section about grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="about-image"><img src="/about-driving.webp" alt="A learner practising with a driving instructor" loading="lazy"/><span><Route size={24}/> The road starts here</span></div>
        <div><Heading eyebrow="About SMS" title="From first lesson to everyday driving">Learn what to do before you move off, how to handle the car in traffic, and how to practise the manoeuvres you’ll use every day.</Heading>
          <ul className="checklist"><li><Check size={18}/> Step-by-step practice for beginners</li><li><Check size={18}/> Focused lessons for returning drivers</li><li><Check size={18}/> Road awareness and safer driving habits</li></ul>
          <a href="#services" className="text-link">Explore our services <ArrowRight size={17}/></a>
        </div>
      </section>

      <section id="courses" className="section programmes" aria-labelledby="programmes-title"><div className="wrap">
        <Heading eyebrow="Our Programmes" title={<span id="programmes-title">Choose the Programme That Matches Your Pace</span>}/>
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{featuredProgrammes.map(({ id, imagePosition }) => {
          const course = courses.find(item => item.id === id)
          return <article className="programme-card" key={id}>
            <div className="programme-photo" aria-hidden="true"><div style={{ backgroundPosition: imagePosition + ' center' }}/></div>
            <div className="programme-copy"><h3>{course.name}</h3><p>{course.summary}</p></div>
            <div className="programme-action">
              <button aria-label={'Read more about ' + course.name} onClick={() => setDetail(course)}>Read More <Plus size={17}/></button>
            </div>
          </article>
        })}</div>
      </div></section>

      <section id="services" className="section wrap">
        <Heading eyebrow="Our services" title="Build skills beyond the basics" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map((item, index) => {
          const Icon = [IdCard, CarFront, ShieldCheck, BookOpen][index]
          return <article className="card" key={item.id}><span className="tile-icon"><Icon size={24}/></span><h3>{item.name}</h3><p>{item.summary}</p><button className="text-link mt-5" onClick={() => setDetail(item)}>Learn more <ArrowRight size={16}/></button></article>
        })}</div>
      </section>

      <section id="pricing" className="section dark"><div className="wrap">
        <Heading eyebrow="Course comparison" title="Find the right amount of practice">Ask for a quote to confirm the fee, schedule and vehicle options for your programme.</Heading>
        <div className="grid gap-4 md:grid-cols-3">{courses.slice(0, 3).map(course => <article className="card price-card" key={course.id}><span className="card-label">{course.label}</span><h3>{course.name}</h3><ul className="checklist">{course.skills.map(skill => <li key={skill}><Check size={16}/>{skill}</li>)}</ul><button className="button small" onClick={() => enquire(course.id)}>Request a quote <ArrowRight size={16}/></button></article>)}</div>
        <div className="mt-5 flex flex-wrap gap-3">{courses.slice(3).map(course => <button className="button small" key={course.id} onClick={() => setDetail(course)}>{course.name} <ArrowRight size={16}/></button>)}</div>
      </div></section>

      <section className="wrap section grid gap-6 md:grid-cols-2" aria-label="Car and travel enquiries">{extras.map((item, index) => <article className="card extras" id={item.id} key={item.id}>
        <span className="tile-icon">{index === 0 ? <CarFront size={25}/> : <Route size={25}/>}</span><h3>{item.name}</h3><p>{item.summary}</p>
        <div className="card-actions"><button className="text-link" onClick={() => setDetail(item)}>See options <ArrowRight size={16}/></button><button className="button small secondary" onClick={() => enquire(item.id)}>Enquire</button></div>
      </article>)}</section>

      <section id="faq" className="section tinted"><div className="wrap grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <Heading eyebrow="Good to know" title="Frequently asked questions">Find out what to expect before you book your first lesson.</Heading>
        <div className="faq">{faqs.map(([question, answer]) => <details name="sms-faq" key={question}><summary>{question}<ChevronDown size={19}/></summary><p>{answer}</p></details>)}</div>
      </div></section>

      <section id="blog" className="wrap section">
        <Heading eyebrow="The driving journal" title="Driving tips and guides"/>
        <div className="grid gap-5 md:grid-cols-3">{articles.map(article => <article className="card" key={article.id}><span className="tile-icon"><BookOpen size={24}/></span><h3>{article.name}</h3><p>{article.summary}</p><button className="text-link mt-5" onClick={() => setDetail(article)}>Read article <ArrowRight size={16}/></button></article>)}</div>
      </section>

      <section id="contact" className="section contact"><div className="wrap grid gap-9 lg:grid-cols-[1fr_1.25fr]">
        <div><Heading eyebrow="Talk to us" title="Take the first step">Tell us which programme you’re interested in and when you’d like to start.</Heading>
          <div className="contact-links">
            {school.phone && <a href={'tel:' + school.phone}><Phone size={18}/>{school.phone}</a>}
            {school.email && <a href={'mailto:' + school.email}><Mail size={18}/>{school.email}</a>}
            {school.whatsapp && <a href={'https://wa.me/' + school.whatsapp}><MessageCircle size={18}/> WhatsApp SMS</a>}
            {school.address && <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(school.address)}><MapPin size={18}/>{school.address}</a>}
            {school.hours && <span><Clock size={18}/>{school.hours}</span>}
          </div>
        </div>
        <EnquiryForm selected={selected} setSelected={setSelected}/>
      </div></section>
    </main>

    <footer className="dark"><div className="wrap footer-content">
      <a className="brand" href="#home"><img src="/sms-logo.jpg" alt=""/><span><strong>SMS</strong><small>MOTOR DRIVING SCHOOL</small></span></a>
      <nav aria-label="Footer navigation" className="flex flex-wrap gap-5">{[['About', 'about'], ['Courses', 'courses'], ['FAQs', 'faq'], ['Contact', 'contact']].map(([label, id]) => <a key={id} href={'#' + id}>{label}</a>)}</nav>
      <a className="back-top" href="#home" aria-label="Back to top"><ArrowUp size={21}/></a>
    </div><div className="wrap copyright">© {new Date().getFullYear()} SMS Motor Driving School</div></footer>

    <dialog ref={dialog} onClose={() => setDetail(null)} aria-labelledby="detail-title">
      {detail && <div className="dialog-body"><button className="dialog-close" aria-label="Close details" onClick={() => dialog.current.close()}><X size={24}/></button>
        <Heading eyebrow={detail.body ? 'The driving journal' : detail.label || 'SMS Motor Driving School'} title={<span id="detail-title">{detail.name}</span>}>{detail.summary}</Heading>
        {detail.skills && <ul className="checklist">{detail.skills.map(skill => <li key={skill}><Check size={18}/>{skill}</li>)}</ul>}
        {detail.body ? detail.body.map(paragraph => <p key={paragraph}>{paragraph}</p>) : <button className="button mt-4" onClick={() => enquire(detail.id)}>Enquire now <ArrowRight size={17}/></button>}
      </div>}
    </dialog>
  </>
}

function EnquiryForm({ selected, setSelected }) {
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const canSend = Boolean(school.endpoint || school.whatsapp || school.email)

  async function submit(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    data.programme = offerings.find(item => item.id === data.programme)?.name || 'General enquiry'
    const message = ['Enquiry for SMS Motor Driving School', '', ...Object.entries(data).map(([key, value]) => key[0].toUpperCase() + key.slice(1) + ': ' + value)].join('\n')
    setStatus('')
    if (!school.endpoint) {
      if (school.whatsapp) window.location.href = 'https://wa.me/' + school.whatsapp + '?text=' + encodeURIComponent(message)
      else if (school.email) window.location.href = 'mailto:' + school.email + '?subject=' + encodeURIComponent(data.programme) + '&body=' + encodeURIComponent(message)
      else {
        setDraft(message)
        setStatus('Your draft is ready. Download it to keep a copy.')
      }
      return
    }
    setSending(true)
    try {
      const response = await fetch(school.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!response.ok) throw new Error('Enquiry failed')
      setStatus('Your enquiry was sent to SMS Motor Driving School.')
    } catch {
      setStatus('Your enquiry could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function downloadDraft() {
    const url = URL.createObjectURL(new Blob([draft], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'sms-driving-enquiry.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <form className="enquiry" onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2">
      <label>Full name<input name="name" autoComplete="name" required maxLength={120} placeholder="Your name"/></label>
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={25} placeholder="Your phone number"/></label>
      <label>Email address<input name="email" type="email" autoComplete="email" maxLength={160} placeholder="Your email address"/></label>
      <label>I'm interested in<select name="programme" value={selected} onChange={event => setSelected(event.target.value)}><option value="">General enquiry</option>{offerings.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <label>Message<textarea name="message" rows="4" maxLength={2000} placeholder="Preferred dates, driving experience or any questions"/></label>
    {!canSend && <p className="form-note">Online enquiries are being set up. You can prepare and download a draft here.</p>}
    <div className="flex flex-wrap gap-3">
      <button className="button" disabled={sending}>{sending ? 'Sending…' : school.endpoint ? 'Send enquiry' : school.whatsapp ? 'Continue to WhatsApp' : school.email ? 'Open email draft' : 'Prepare enquiry'} <ArrowRight size={18}/></button>
      {draft && <button type="button" className="button secondary" onClick={downloadDraft}>Download draft</button>}
    </div>
    <p className="form-status" role="status">{status}</p>
  </form>
}

createRoot(document.getElementById('root')).render(<App/>)

