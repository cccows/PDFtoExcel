import { type NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"
import { JSDOM } from "jsdom"

export async function POST(request: NextRequest) {
  try {
    // Dynamically import the PDF.js library
    const pdfjs = await import("pdfjs-dist")

    // Set the worker source path
    const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry")
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    return await extractText(file, fileExtension)
  } catch (error) {
    console.error("PDF extraction error:", error)
    return NextResponse.json({ error: "PDF extraction failed" }, { status: 500 })
  }
}

async function extractText(file: File, fileExtension?: string) {
  let extractedText = ""

  switch (fileExtension) {
    case "pdf":
      // Extract text from PDF
      const pdfArrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument({ data: pdfArrayBuffer })
      const pdf = await loadingTask.promise

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(" ")
        extractedText += pageText + "\n\n"
      }
      break

    case "docx":
      // Extract text from DOCX
      const docxArrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer: docxArrayBuffer })
      extractedText = result.value
      break

    case "html":
      // Extract text from HTML
      const htmlText = await file.text()
      const dom = new JSDOM(htmlText)
      extractedText = dom.window.document.body.textContent || ""
      break

    case "txt":
      // Extract text from TXT
      extractedText = await file.text()
      break

    default:
      throw new Error("Unsupported file type for text extraction")
  }

  return NextResponse.json({ content: extractedText })
}
