import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma'

// Trata erros conhecidos do Prisma e retorna a resposta HTTP adequada
export function tratarErroPrisma(error: unknown): NextResponse | null {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null

    // Violação de constraint única (ex: email duplicado, vaga duplicada no mês)
    if (error.code === 'P2002') {
        const campos = (error.meta?.target as string[])?.join(', ') ?? 'campo'
        return NextResponse.json(
            { error: `Já existe um registro com este valor: ${campos}` },
            { status: 409 }
        )
    }

    // Registro referenciado não encontrado ao tentar atualizar ou deletar
    if (error.code === 'P2025') {
        return NextResponse.json(
            { error: 'Registro não encontrado' },
            { status: 404 }
        )
    }

    // Violação de FK — registro relacionado não existe
    if (error.code === 'P2003') {
        return NextResponse.json(
            { error: 'Referência inválida: registro relacionado não existe' },
            { status: 400 }
        )
    }

    return null
}
