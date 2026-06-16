import { redirect } from "next/navigation";

// Redireciona a rota raiz ('/') diretamente para a tela de login
export default function Home() {
  redirect("/login");
}
