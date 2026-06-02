import { createServerSupabaseClient } from '@/config/supabase/server'
import cloudinary from '@/config/cloudinary'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// POST /api/upload — faz upload de foto de jogador para o Cloudinary
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const arquivo = formData.get('file') as File | null

        if (!arquivo) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        // Valida tipo de arquivo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
        if (!tiposPermitidos.includes(arquivo.type)) {
            return NextResponse.json(
                { error: 'Formato inválido. Use JPG, PNG ou WebP' },
                { status: 400 }
            )
        }

        // Valida tamanho máximo de 5MB
        const tamanhoMaximo = 5 * 1024 * 1024
        if (arquivo.size > tamanhoMaximo) {
            return NextResponse.json(
                { error: 'Arquivo muito grande. Tamanho máximo: 5MB' },
                { status: 400 }
            )
        }

        // Converte o arquivo para buffer
        const bytes = await arquivo.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Faz upload para o Cloudinary na pasta do projeto
        const resultado = await new Promise<{ secure_url: string; public_id: string }>(
            (resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        folder: 'paris-sem-gol/jogadores',
                        transformation: [
                            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                            { quality: 'auto', fetch_format: 'auto' },
                        ],
                    },
                    (error, result) => {
                        if (error || !result) return reject(error)
                        resolve(result as { secure_url: string; public_id: string })
                    }
                ).end(buffer)
            }
        )

        return NextResponse.json({
            url: resultado.secure_url,
            public_id: resultado.public_id,
        })
    } catch (error) {
        console.error('[POST /api/upload]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}