import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extractParivahanFields } from './parivahan-fields.mjs'

GlobalWorkerOptions.workerSrc = workerUrl

export async function readParivahanPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') return null
  const task = getDocument({ data, isEvalSupported: false, stopAtErrors: true })
  try {
    const pdf = await task.promise
    const pages = []
    for (let index = 1; index <= Math.min(pdf.numPages, 4); index++) {
      const page = await pdf.getPage(index)
      pages.push((await page.getTextContent()).items)
    }
    return extractParivahanFields(pages)
  } finally {
    await task.destroy()
  }
}
