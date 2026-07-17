import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { parseCommbankCSV } from '../../parsers/commbankParser'
import { detectBankFormat } from '../../parsers/detectFormat'
import { parseExcel } from '../../parsers/excelParser'
import { parsePDF } from '../../parsers/pdfParser'
import type { Transaction } from '../../types'

type Props = {
  accountName: string
  onParsed: (transactions: Transaction[]) => void
}

export function FileUploader({ accountName, onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string>('No file uploaded yet')
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    if (!file) return

    const format = await detectBankFormat(file)

    try {
      let transactions: Transaction[] = []

      if (format === 'csv') {
        const text = await file.text()
        transactions = parseCommbankCSV(text, accountName)
      } else if (format === 'excel') {
        transactions = await parseExcel(file, accountName)
      } else if (format === 'pdf') {
        transactions = await parsePDF(file, accountName)
      } else {
        setStatus(`⚠️ Unknown bank format in ${file.name}. Please upload a CSV, XLSX, or PDF statement.`)
        return
      }

      setStatus(`✅ Parsed ${transactions.length} transactions from ${file.name}`)
      onParsed(transactions)
    } catch (error) {
      console.error(error)
      setStatus(`⚠️ Could not parse ${file.name}. Please try a different statement export.`)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    void handleFile(file)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void handleFile(file)
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}`}
    >
      <p className="text-gray-500 text-sm mb-2">Drag & drop a CSV, Excel, or PDF bank statement here, or click to browse</p>
      <p className="text-xs text-gray-400">Browser-only parsing with local storage</p>
      <p className="mt-4 text-sm font-medium text-gray-700">{status}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
