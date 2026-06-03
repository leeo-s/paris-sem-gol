import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import cloudinary from '@/config/cloudinary'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// PATCH /api/users/:id/photo — faz upload da foto e atualiza o perfil do jogador
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params

        // Jogador só pode atualizar a própria foto
        // Admin e co-admin podem atualizar a foto de qualquer jogador
        const perfilSolicitante = await prisma.users.findUnique({
            where: { id: user.id },
            select: { role: true },
        })

        const ehProprioUsuario = user.id === id
        const ehAdminOuCoAdmin = ['admin', 'co_admin'].includes(perfilSolicitante?.role ?? '')

        if (!ehProprioUsuario && !ehAdminOuCoAdmin) {
            return NextResponse.json(
                { error: 'Sem permissão para realizar esta ação' },
                { status: 403 }
            )
        }

        // Verifica se o jogador existe
        const jogador = await prisma.users.findUnique({
            where: { id },
            select: { id: true, photo_url: true },
        })

        if (!jogador) {
            return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
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

        // Se o jogador já tem foto, deleta a anterior do Cloudinary para não acumular arquivos
        if (jogador.photo_url) {
            try {
                // Extrai o public_id da URL do Cloudinary
                // Formato da URL: https://res.cloudinary.com/cloud/image/upload/v123/paris-sem-gol/jogadores/public_id.ext
                const partes = jogador.photo_url.split('/')
                const arquivoComExtensao = partes[partes.length - 1]
                const publicIdParcial = arquivoComExtensao.split('.')[0]
                const publicId = `paris-sem-gol/jogadores/${publicIdParcial}`
                await cloudinary.uploader.destroy(publicId)
            } catch (erroDeletar) {
                // Não falha se não conseguir deletar a foto antiga — apenas loga
                console.warn('[PATCH /api/users/:id/photo] Não foi possível deletar foto anterior:', erroDeletar)
            }
        }

        // Converte o arquivo para buffer
        const bytes = await arquivo.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Faz upload para o Cloudinary
        const resultado = await new Promise<{ secure_url: string; public_id: string }>(
            (resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        folder: 'paris-sem-gol/jogadores',
                        public_id: `jogador_${id}`, // ID fixo por jogador — substitui automaticamente
                        overwrite: true,
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

        // Atualiza o campo photo_url na tabela do jogador
        const jogadorAtualizado = await prisma.users.update({
            where: { id },
            data: { photo_url: resultado.secure_url },
            select: {
                id: true,
                name: true,
                photo_url: true,
            },
        })

        return NextResponse.json({
            ...jogadorAtualizado,
            public_id: resultado.public_id,
        })
    } catch (error) {
        console.error('[PATCH /api/users/:id/photo]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
