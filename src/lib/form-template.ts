/**
 * form-template.ts — Shared types and utilities for form templates.
 * This file has NO 'use client' or 'use server' directive so it can be
 * safely imported from server actions, server components, AND client components.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormFieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'file' | 'textarea'
export type SystemRole = 'documentType' | 'documentNumber' | 'fullName' | 'email' | 'phone'

export interface SubField {
  id: string
  label: string
  type: Exclude<FormFieldType, 'select'>
  required: boolean
  placeholder?: string
}

export interface ConditionalOption {
  value: string
  fields: SubField[]
}

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  systemRole?: SystemRole
  options?: string[]
  hasConditionalOptions?: boolean
  conditionalOptions?: ConditionalOption[]
  allowMultipleFiles?: boolean // Controla si permite <input multiple>
}

export interface RequestType {
  id: string
  label: string
  conditionalFields: FormField[]
}

export interface FormTemplate {
  version: 2
  fields: FormField[]
  requestTypes: RequestType[]
}

// ─── Default Template ─────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATE: FormTemplate = {
  version: 2,
  fields: [
    { id: 'sys-docType', label: 'Tipo de Identificación', type: 'select', required: true, systemRole: 'documentType', options: ['Cédula de Ciudadanía (CC)', 'Tarjeta de Identidad (TI)', 'Cédula de Extranjería (CE)', 'Registro Civil (RC)', 'Pasaporte (PA)'] },
    { id: 'sys-docNum', label: 'Número de Identificación', type: 'text', required: true, systemRole: 'documentNumber', placeholder: 'Ej: 1102345678' },
    { id: 'sys-name', label: 'Nombre Completo', type: 'text', required: true, systemRole: 'fullName', placeholder: 'Ej: Juan Carlos Pérez García' },
    { id: 'sys-email', label: 'Correo de Notificaciones', type: 'email', required: true, systemRole: 'email', placeholder: 'Para recibir su radicado por correo...' },
    { id: 'sys-phone', label: 'Teléfono de Contacto', type: 'text', required: false, systemRole: 'phone', placeholder: 'Ej: 300 123 4567' },
  ],
  requestTypes: [
    { id: 'rt-cita', label: 'Agendamiento de Cita Médica', conditionalFields: [] },
    { id: 'rt-autorizacion', label: 'Autorización de Procedimientos', conditionalFields: [] },
    { id: 'rt-formula', label: 'Renovación de Fórmula', conditionalFields: [] },
    { id: 'rt-pqr', label: 'PQR (Quejas / Reclamos)', conditionalFields: [] },
  ],
}

// ─── Parse old/new format ─────────────────────────────────────────────────────

/**
 * Converts raw JSON from form_templates.fields_json into a validated FormTemplate v2.
 * Handles:
 *  - null / undefined → default template
 *  - v2 object        → returned as-is
 *  - v1 array         → migrated (system fields prepended, old dynamic fields appended)
 */
export function parseTemplate(rawJson: unknown): FormTemplate {
  if (!rawJson) {
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)) // deep clone
  }
  if (typeof rawJson === 'object' && !Array.isArray(rawJson) && (rawJson as any).version === 2) {
    return rawJson as FormTemplate
  }
  // Old format: plain array of dynamic fields
  const oldFields: FormField[] = Array.isArray(rawJson) ? (rawJson as FormField[]) : []
  return {
    version: 2,
    fields: [...DEFAULT_TEMPLATE.fields, ...oldFields],
    requestTypes: JSON.parse(JSON.stringify(DEFAULT_TEMPLATE.requestTypes)),
  }
}
