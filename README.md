# Lili AI - Chatbot Premium

Lili é um chatbot web elegante, moderno e minimalista, inspirado na identidade visual do Microsoft Copilot (gradientes vibrantes e detalhes fluidos) com um fundo branco limpo e tipografia clássica refinada.

O aplicativo integra diretamente (Client-Side) com a **API oficial do Gemini** (Google Generative AI) utilizando a chave de API inserida de forma segura pelo próprio usuário nas configurações locais.

---

## ✨ Recursos

- **Visual Elegante**: Interface moderna, minimalista com tipografia sofisticada e gradientes inspirados nas cores do Copilot.
- **Histórico Local**: Conversas salvas automaticamente no `localStorage` do navegador para que você não perca seu histórico.
- **Integração Real com o Gemini**: Conecte com os modelos `gemini-2.5-flash`, `gemini-2.5-pro` e `gemini-1.5-flash`.
- **Modo de Demonstração (Simulado)**: O chatbot é 100% funcional imediatamente. Se nenhuma chave de API estiver cadastrada, a Lili responde de maneira simulada explicando como obter a chave.
- **Renderização de Markdown Premium**: Suporte completo a formatações, listas, negrito e blocos de código com realce visual e botão para **Copiar Código** em um clique.
- **Ajustes de Parâmetros**: Altere a temperatura (criatividade do modelo) e envie instruções personalizadas do sistema para mudar a personalidade da Lili.
- **Totalmente Responsivo**: Otimizado para computadores, tablets e smartphones.

---

## 🚀 Como Executar Localmente

Como o projeto foi desenvolvido puramente em **HTML, CSS e JavaScript Vanilla**, não há necessidade de compilar ou instalar dependências pesadas.

1. Clone o repositório ou baixe os arquivos.
2. Abra o arquivo `index.html` diretamente em seu navegador (ou execute usando uma extensão de servidor local, como a *Live Server* do VS Code).
3. Insira sua chave de API nas configurações e comece a conversar!

---

## 🛠️ Configuração e Deploy na Vercel

Este projeto já está configurado para deploy automático na Vercel através da sincronização do GitHub.

### Estrutura de Arquivos:
- `index.html`: Estrutura do app e modais.
- `style.css`: Estilos, design system e animações.
- `app.js`: Lógica de controle do app, histórico e requisições HTTP para a API do Gemini.
- `vercel.json`: Definição de cabeçalhos de segurança HTTP e URLs amigáveis.
- `assets/lili_logo.png`: O logotipo oficial clássico da Lili AI.

---

## 🔒 Segurança

Sua chave da API do Gemini é armazenada de forma estrita no seu navegador via `localStorage`. Ela é enviada unicamente de forma direta para os servidores do Google (`https://generativelanguage.googleapis.com`) no momento da requisição e nunca passa por qualquer servidor intermediário.
