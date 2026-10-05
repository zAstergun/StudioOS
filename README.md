# 🚀 Painel de Conteúdo (Content Dashboard)

Um painel de comando unificado, veloz e focado em produtividade para criadores de conteúdo (YouTube e Redes Sociais). O projeto integra ferramentas utilitárias — como um Teleprompter nativo — com um **Mentor IA** robusto, alimentado por *skills* específicas para transformar ideias brutas em peças de conteúdo de alta performance (alto CTR e retenção).

## 💡 Principais Funcionalidades

O projeto conta com ferramentas ativadas por Inteligência Artificial (conectada via chave de API salva diretamente no seu navegador, sem banco de dados intermediário), baseadas em diretrizes estruturadas (`.md` skills):

- **🧠 Mentor AI de Validação:** Rankeia a ideia do seu vídeo de 0 a 10 usando critérios reais de mercado (Pool de atenção, Prova visível, Conexão, Fit e Outlier).
- **✍️ Roteirizador Prático:** Cria roteiros diretos e sem enrolação, prontos para serem lidos no Teleprompter.
- **🎣 Gerador de Títulos e Hooks:** Extrai variações matadoras de títulos (curtos e virais) e hooks (aberturas) de 2 linhas focados em retenção.
- **🖼️ Briefing de Thumbnails:** Direciona a arte da sua capa com base no CTR, sugerindo a melhor composição de elementos visuais.
- **🦠 Matriz Viral:** Analisa posts de sucesso e extrai sua engenharia reversa para você aplicar em qualquer tema novo.
- **🛡️ Auditoria e Humanizador:** Avalia rascunhos de roteiro ou posts e aplica um "Score", além de remover a "voz robótica de IA" garantindo um ritmo mais humano e direto.
- **💎 Estratégia de Membros:** Calcula a viabilidade matemática e traça um plano de assinatura/monetização para o seu canal.
- **📺 Teleprompter Nativo:** Leia seus roteiros em tela cheia com controle de velocidade e scroll automático.

## 🛠️ Tecnologias Utilizadas

- [Astro](https://astro.build) - Framework Web focado em velocidade e HTML estático.
- **Vanilla JS & CSS** - Sem frameworks complexos de frontend, garantindo extrema leveza e customização total.
- **Marked.js** - Renderizador de Markdown embutido para exibir as respostas da IA com formatação rica e estética (títulos, listas, blocos, etc).
- **Integração IA Edge:** Chamadas diretas de API via Client-Side (fetch) usando `localStorage` para proteger a chave de API do usuário.

## ⚙️ Como rodar o projeto localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/zAstergun/Painel-de-Conte-do.git
   cd Painel-de-Conte-do
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acesse no navegador:**
   Abra `http://localhost:4321` (ou a porta informada no terminal).

## 🔑 Configurando a IA

1. Abra a aplicação no navegador.
2. Na interface, vá até a aba de **Configurações de API**.
3. Escolha o seu provedor favorito (OpenAI, Gemini, etc).
4. Insira sua chave de API e salve.
5. *Nota: Sua chave fica salva apenas no seu `localStorage` (no próprio navegador). O painel não envia sua chave para nenhum servidor externo além da API do provedor escolhido.*

## 📂 Estrutura de Arquivos

- `src/pages/index.astro`: O coração do Painel, contendo o HTML, as lógicas em JS (Teleprompter, Fetch IA) e o DOM.
- `src/skills/*.md`: O cérebro do **Mentor AI**. Cada arquivo Markdown dita uma regra/framework diferente para a inteligência artificial seguir.
- `src/styles/global.css`: Design System completo (Cores em CSS Variables, botões, modais, typography e formatação de Markdown).
- `src/layouts/Layout.astro`: Template base da aplicação (Tags de `<head>`, CDN do Marked.js, fontes).

---

Feito com ⚡ por criadores, para criadores.
