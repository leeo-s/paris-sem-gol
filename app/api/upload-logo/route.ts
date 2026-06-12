import { createServerSupabaseClient } from '@/config/supabase/server'
import { buscarPerfilUsuario, ehAdmin } from '../_lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import sharp from 'sharp'
import { writeFile } from 'fs/promises'
import { join } from 'path'

// POST /api/upload-logo — substitui o logo.png do clube (exclusivo para admin)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Apenas o admin pode alterar o logo do clube' }, { status: 403 })
        }

        const formData = await request.formData()
        const arquivo = formData.get('file') as File | null

        if (!arquivo) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        if (!arquivo.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Apenas imagens são aceitas (PNG, JPG, etc.)' }, { status: 400 })
        }

        const tamanhoMaximo = 5 * 1024 * 1024
        if (arquivo.size > tamanhoMaximo) {
            return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB' }, { status: 400 })
        }

        const buffer = Buffer.from(await arquivo.arrayBuffer())

        // Converte qualquer formato de imagem para PNG usando sharp
        const pngBuffer = await sharp(buffer)
            .png({ quality: 100 })
            .toBuffer()

        const caminhoLogo = join(process.cwd(), 'public', 'logo.png')
        await writeFile(caminhoLogo, pngBuffer)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[POST /api/upload-logo]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
