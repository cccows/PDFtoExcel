"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, Download, FileSpreadsheet, Loader2, FileType } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export default function DocumentExtractor() {
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPythonLoading, setIsPythonLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptedFileTypes = ".pdf,.docx,.html,.txt"

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase()

    // Check if file type is supported
    if (["pdf", "docx", "html", "txt"].includes(fileExtension || "")) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError(`This file type is not supported for text extraction`)
      setFile(null)
    }
  }

  const handleExtract = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)
    setExtractedText("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to extract text from document`)
      }

      const data = await response.json()
      setExtractedText(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const downloadAsText = () => {
    if (!extractedText) return

    const blob = new Blob([extractedText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file?.name.split(".")[0]}_extracted.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadAsExcel = async () => {
    if (!extractedText) return

    try {
      const response = await fetch("/api/convert-to-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: extractedText,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to convert to Excel")
      }

      // Get the blob from the response
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${file?.name.split(".")[0]}_extracted.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download as Excel")
    }
  }

  const processWithPython = async () => {
    if (!file) return;

    setIsPythonLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/python-extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Python extraction failed:", errorData);
        throw new Error(errorData.error || "Failed to process with Python");
      }

      // For successful responses, get the blob for Excel download
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("spreadsheet")) {
        // This is an Excel file - download it
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${file.name.split(".")[0]}_extracted.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // This is an error response
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process with Python");
      }
    } catch (err) {
      console.error("Error processing file:", err);
      setError(err instanceof Error ? err.message : "Failed to process with Python");
    } finally {
      setIsPythonLoading(false);
    }
  };

  const getFileTypeIcon = () => {
    if (!file) return <Upload className="h-10 w-10 text-gray-400 mb-4" />

    const extension = file.name.split(".").pop()?.toLowerCase()

    switch (extension) {
      case "pdf":
        return <FileText className="h-10 w-10 text-red-500 mb-4" />
      case "docx":
        return <FileText className="h-10 w-10 text-blue-500 mb-4" />
      case "html":
        return <FileText className="h-10 w-10 text-orange-500 mb-4" />
      default:
        return <FileType className="h-10 w-10 text-gray-500 mb-4" />
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Text Extraction Tool</CardTitle>
          <CardDescription>Upload a document to extract its text content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            {getFileTypeIcon()}
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Upload your file
              </p>
              <input
                id="file-upload"
                type="file"
                accept={acceptedFileTypes}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button asChild variant="secondary">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
            </div>
            {file && (
              <div className="mt-4 text-sm">
                <p className="font-medium">Selected file:</p>
                <p className="text-gray-500">{file.name}</p>
              </div>
            )}
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={handleExtract} disabled={!file || isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Extract Text
                </>
              )}
            </Button>

            <Button onClick={downloadAsText} variant="outline" className="w-full sm:w-auto" disabled={!extractedText}>
              <Download className="mr-2 h-4 w-4" />
              Download as Text
            </Button>

            <Button onClick={downloadAsExcel} className="w-full sm:w-auto" disabled={!extractedText}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download as Excel
            </Button>

            <Button 
              onClick={processWithPython} 
              className="w-full sm:w-auto" 
              disabled={!file || isPythonLoading}
              variant="default"
            >
              {isPythonLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Extract with Python
                </>
              )}
            </Button>
          </div>

          {extractedText && (
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Extracted Text:</h3>
                <Textarea value={extractedText} readOnly className="min-h-[200px] w-full" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
