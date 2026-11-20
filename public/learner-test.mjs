import { learnerQuestions } from './learner-questions.mjs'

const questionSeconds = 60
const card = document.querySelector('[data-learner-test]')

function shuffled(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  if (className) node.className = className
  return node
}

function signImage(question) {
  const image = element('img', undefined, 'learner-sign')
  image.src = question.image
  image.alt = 'Road sign to identify'
  return image
}

function setupTest(container) {
  let questions = []
  let answers = []
  let timer
  let deadline

  function showResults() {
    const correct = answers.filter((answer, index) => answer === questions[index].answer).length
    const unanswered = answers.filter(answer => answer === null).length
    const title = element('h2', `Score: ${correct} of ${questions.length}`)
    title.tabIndex = -1
    const retry = element('button', 'Start another practice test')
    retry.type = 'button'
    retry.addEventListener('click', start)
    const review = element('ol', undefined, 'learner-review')
    questions.forEach((question, index) => {
      const answer = answers[index]
      const item = element('li')
      item.append(element('strong', question.prompt))
      if (question.image) {
        const image = signImage(question)
        image.loading = 'lazy'
        item.append(image)
      }
      const result = answer === null ? 'Unanswered' : answer === question.answer ? 'Correct' : 'Incorrect'
      item.append(element('p', answer === null ? result : `${result} · Your answer: ${question.options[answer]}`))
      item.append(element('p', `Correct answer: ${question.options[question.answer]}`))
      review.append(item)
    })
    container.replaceChildren(
      title,
      element('p', `${correct} correct · ${answers.length - correct - unanswered} incorrect · ${unanswered} unanswered`),
      retry,
      element('h3', 'Answer review'),
      review,
    )
    title.focus()
  }

  function showQuestion() {
    const index = answers.length
    const question = questions[index]
    const heading = element('h2', `Question ${index + 1} of ${questions.length}`)
    heading.tabIndex = -1
    const countdown = element('span', undefined, 'learner-countdown')
    countdown.setAttribute('role', 'timer')
    const header = element('div', undefined, 'learner-test-header')
    header.append(heading, countdown)
    const form = element('form')
    const choices = element('fieldset', undefined, 'learner-choices')
    choices.append(element('legend', question.prompt))
    if (question.image) choices.append(signImage(question))
    for (const option of shuffled(question.options.map((text, value) => ({ text, value })))) {
      const label = element('label')
      const input = element('input')
      input.type = 'radio'
      input.name = 'answer'
      input.value = String(option.value)
      input.required = true
      label.append(input, element('span', option.text))
      choices.append(label)
    }

    function advance(answer) {
      if (answers.length !== index) return
      clearInterval(timer)
      answers.push(Date.now() < deadline ? answer : null)
      if (answers.length === questions.length) showResults()
      else showQuestion()
    }

    const next = element('button', index + 1 === questions.length ? 'See results' : 'Next question')
    next.type = 'submit'
    const skip = element('button', 'Skip question', 'learner-skip')
    skip.type = 'button'
    skip.addEventListener('click', () => advance(null))
    const actions = element('div', undefined, 'learner-actions')
    actions.append(next, skip)
    form.append(choices, actions)
    form.addEventListener('submit', event => {
      event.preventDefault()
      advance(Number(new FormData(form).get('answer')))
    })
    container.replaceChildren(header, form)
    heading.focus()

    deadline = Date.now() + questionSeconds * 1000
    function updateTimer() {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      const label = `${seconds}s left`
      if (countdown.textContent !== label) countdown.textContent = label
      if (seconds === 0) advance(null)
    }
    updateTimer()
    timer = setInterval(updateTimer, 250)
  }

  function start() {
    clearInterval(timer)
    const signs = shuffled(learnerQuestions.filter(question => question.image)).slice(0, 6)
    const rules = shuffled(learnerQuestions.filter(question => !question.image)).slice(0, 14)
    questions = shuffled([...signs, ...rules])
    answers = []
    showQuestion()
  }

  const startButton = container.querySelector('[data-action="start"]')
  startButton.addEventListener('click', start)
  startButton.hidden = false
}

if (card) setupTest(card)
