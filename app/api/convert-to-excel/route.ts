import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    // Create a workbook
    const workbook = XLSX.utils.book_new()

    // For text extraction, create a simple worksheet with text content
    const lines = content.split("\n").filter((line) => line.trim() !== "")
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Extracted Text"], // Header row
      ...lines.map((line) => [line]), // Data rows
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Text")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=extracted_text.xlsx",
      },
    })
  } catch (error) {
    console.error("Excel conversion error:", error)
    return NextResponse.json({ error: "Failed to convert to Excel" }, { status: 500 })
  }
}
