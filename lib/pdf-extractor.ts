export async function extractTextFromPdf(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("pdf", file)

  const response = await fetch("/api/extract", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Failed to extract text from PDF")
  }

  const data = await response.json()
  return data.text
}
