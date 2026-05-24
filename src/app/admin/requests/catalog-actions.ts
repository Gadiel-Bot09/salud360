'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Specialty {
  id: string
  name: string
  active: boolean
}

export interface Doctor {
  id: string
  name: string
  specialty_id: string | null
  active: boolean
}

// -- SPECIALTIES --

export async function createSpecialty(institutionId: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('specialties').insert({
    institution_id: institutionId,
    name: name.trim()
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'La especialidad ya existe.' }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/requests')
  return { success: true }
}

export async function toggleSpecialtyActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('specialties').update({ active }).eq('id', id)
  
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/requests')
  return { success: true }
}

export async function deleteSpecialty(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('specialties').delete().eq('id', id)
  
  if (error) return { success: false, error: 'No se puede eliminar porque está en uso por un médico.' }
  revalidatePath('/admin/requests')
  return { success: true }
}

// -- DOCTORS --

export async function createDoctor(institutionId: string, name: string, specialtyId?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('doctors').insert({
    institution_id: institutionId,
    name: name.trim(),
    specialty_id: specialtyId || null
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'El médico ya existe.' }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/requests')
  return { success: true }
}

export async function toggleDoctorActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('doctors').update({ active }).eq('id', id)
  
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/requests')
  return { success: true }
}

export async function deleteDoctor(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('doctors').delete().eq('id', id)
  
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/requests')
  return { success: true }
}
