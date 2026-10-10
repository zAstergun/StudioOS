# Templates de E-mail Oficiais — Aster Account &bull; StudioOS

Este diretório contém os templates HTML de e-mail oficiais do **StudioOS** integrados com a **Aster Account** (Opção 3 — Co-Branding Híbrido), com identidade visual escura premium, tipografia refinada e suporte nativo às tags Go Template do **Supabase Auth**.

---

## 📁 Arquivos Padronizados

| Arquivo | Finalidade | Local no Supabase | Variáveis Go Template |
| :--- | :--- | :--- | :--- |
| `confirm-signup.html` | Confirmação de Cadastro e Verificação | **Authentication > Email Templates > Confirm sign up** | `{{ .ConfirmationURL }}`, `{{ .Token }}` |
| `change-email.html` | Mudança de E-mail do Usuário | **Authentication > Email Templates > Change email address** | `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}` |
| `reset-password.html` | Recuperação e Redefinição de Senha | **Authentication > Email Templates > Reset password** | `{{ .ConfirmationURL }}`, `{{ .Token }}` |

---

## ✉️ Assuntos Recomendados no Supabase (Email Subject)

1. **Confirm sign up:**
   ```
   Aster Account • Confirme seu e-mail para ativar sua conta no StudioOS
   ```

2. **Change email address:**
   ```
   Aster Account • Confirmação de alteração de e-mail
   ```

3. **Reset password:**
   ```
   Aster Account • Redefinição de senha de acesso
   ```

---

## ⚙️ Configuração do SMTP com Zoho Mail (`help@asterdev.me`)

O **Zoho Mail** é uma das melhores e mais confiáveis opções para e-mail profissional de domínio próprio (`help@asterdev.me`).

### 1. Passo Essencial no Zoho Mail: Gerar Senha de Aplicativo (App Password)
> ⚠️ **IMPORTANTE:** O Zoho Mail bloqueia a senha comum da sua conta em conexões SMTP se a autenticação de 2 fatores (2FA) estiver ativa ou por políticas de proteção. Você **deve** gerar uma Senha de Aplicativo específica para o Supabase:

1. Acesse o painel de segurança da sua conta Zoho:  
   👉 [Zoho Accounts - Senhas de Aplicativo](https://accounts.zoho.com/home#security/app_password)
2. Clique em **Gerar nova senha** (Generate New Password).
3. No nome da aplicação, digite: `Supabase StudioOS` (ou `AsterDev-Core`).
4. Clique em **Gerar**. O Zoho exibirá uma senha aleatória sem espaços (ex: `xxxx xxxx xxxx xxxx`). Copie-a.

---

### 2. Verificar se o Acesso SMTP está ativo no Zoho Mail
1. Abra o [Zoho Mail](https://mail.zoho.com) com a conta `help@asterdev.me`.
2. Vá em **Configurações (ícone de engrenagem)** > **Contas de E-mail** (Mail Accounts).
3. Selecione a conta `help@asterdev.me` e certifique-se de que a opção **Acesso SMTP (SMTP Access)** está **marcada/habilitada**.

---

### 3. Preencher no Supabase
Acesse o painel do Supabase do projeto `AsterDev-Core`:  
👉 [Supabase SMTP Settings (AsterDev-Core)](https://supabase.com/dashboard/project/yofvcyarznuvqntgslep/auth/smtp)

Preencha com os dados do Zoho Mail:
* **Enable Custom SMTP**: `ON` (Ativado)
* **Sender email**: `help@asterdev.me`
* **Sender name**: `StudioOS • Aster Account`
* **Host**: `smtppro.zoho.com` *(se o seu Zoho for corporativo/domínio próprio) ou `smtp.zoho.com`*
* **Port**: `465` (com SSL) ou `587` (com TLS)
* **Minimum TLS Version**: `TLSv1.2`
* **User**: `admin@rattenfanger.dev` *(conta principal autenticadora)*
* **Password**: *A Senha de Aplicativo gerada no passo 1*
* **Rate Limit no Supabase**: Configurado para `120 e-mails por hora` (suportando até 2.880 e-mails/dia).

Configurado e sincronizado diretamente via Supabase CLI.

---

### 4. Registros DNS no domínio `asterdev.me` (Garantia de 100% Entregabilidade)
No provedor DNS do seu domínio `asterdev.me` (Cloudflare, etc.), garanta que os registros do Zoho estão adicionados:
* **SPF (TXT)**: `v=spf1 include:zoho.com ~all`
* **DKIM (TXT)**: O código DKIM gerado no Zoho Mail Admin Console (`zoho._domainkey.asterdev.me`).
* **DMARC (TXT)**: `v=DMARC1; p=none; sp=none;`

Desta forma, os e-mails disparados pelo Supabase sairão autenticados com chave criptográfica pelo Zoho Mail, chegando com altíssima reputação direto na **Caixa de Entrada** dos criadores!
