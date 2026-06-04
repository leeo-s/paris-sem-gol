import { redirect } from 'next/navigation'

// Redireciona a raiz para o dashboard (middleware cuida da autenticação)
export default function RootPage() {
  redirect('/dashboard')
}
