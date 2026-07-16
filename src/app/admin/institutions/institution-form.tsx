'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInstitution } from './actions'
import { Plus, UploadCloud, X, ImageIcon } from 'lucide-react'

export function InstitutionForm() {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  function clearFile() {
    setPreview(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await createInstitution(formData)
    setLoading(false)
    if (result?.success === false) {
      setError(result.error ?? 'Error desconocido')
    } else {
      formRef.current?.reset()
      clearFile()
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5">
      {/* Razón Social */}
      <div className="space-y-2">
        <Label htmlFor="name">Razón Social</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ej. EPS Sanitas"
          required
          className="h-10"
        />
      </div>

      {/* Logo upload */}
      <div className="space-y-2">
        <Label>Logo de la Institución (Opcional)</Label>

        {/* Drop zone / trigger */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all group"
        >
          {preview ? (
            <div className="flex items-center gap-3">
              <img
                src={preview}
                alt="Preview logo"
                className="h-14 w-14 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{fileName}</p>
                <p className="text-xs text-slate-400">Haz clic para cambiar</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearFile() }}
                className="p-1.5 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2 text-slate-400 group-hover:text-teal-600 transition-colors">
              <UploadCloud className="w-8 h-8" />
              <div className="text-center">
                <p className="text-sm font-medium">Adjuntar logo</p>
                <p className="text-xs">PNG, JPG, SVG, WEBP</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          id="logo_file"
          name="logo_file"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-700"
      >
        {loading ? (
          <>
            <span className="animate-spin mr-2">⏳</span> Creando...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" /> Crear Institución
          </>
        )}
      </Button>
    </form>
  )
}
