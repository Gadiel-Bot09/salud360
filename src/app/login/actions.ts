'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/login?error=Credenciales incorrectas. Verifique su correo y contraseña.')
    }

    revalidatePath('/', 'layout')
    redirect('/admin/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/admin/dashboard')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

// ── Forgot Password: sends reset link to email ────────────────────────────────
export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Por favor ingrese su correo electrónico.' }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '') || 'http://localhost:3000'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/login/reset-password`,
    })

    if (error) {
        console.error('Reset password error:', error)
        return { error: 'No se pudo enviar el correo. Verifique la dirección ingresada.' }
    }

    return { success: true }
}

// ── Update Password: sets new password after clicking the reset link ──────────
export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password    = formData.get('password') as string
    const confirmPass = formData.get('confirm_password') as string

    if (!password || password.length < 8) {
        return { error: 'La contraseña debe tener al menos 8 caracteres.' }
    }
    if (password !== confirmPass) {
        return { error: 'Las contraseñas no coinciden.' }
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        console.error('Update password error:', error)
        return { error: 'No se pudo actualizar la contraseña. El enlace puede haber expirado.' }
    }

    return { success: true }
}

