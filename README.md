# Repertório da Igreja

Um sistema profissional, moderno e responsivo para gerenciar hinos e repertórios de cultos em igrejas.

## 🎯 Funcionalidades

✅ **Cadastrar Hinos Comuns** - Adicione hinos com tom, cantor, letra completa e observações
✅ **Gerenciar Hinos da Harpa Cristã** - Busque automaticamente pelo número e complete com tom e cantor
✅ **Montar Repertórios** - Organize hinos em sequência para cultos
✅ **Gerar PDFs** - Baixe PDFs de hinos individuais ou repertórios completos
✅ **Compartilhar no WhatsApp** - Envie repertórios via WhatsApp com um clique
✅ **Persistência Local** - Todos os dados são salvos automaticamente no navegador
✅ **Backup e Restauração** - Exporte e importe dados em JSON
✅ **Interface Responsiva** - Funciona em computador, tablet e celular
✅ **Configurações Personalizadas** - Nome da igreja, responsável, rodapé dos PDFs

## 📋 Requisitos

- Node.js 16+ 
- npm ou yarn
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## 🚀 Instalação

### 1. Clone ou baixe o projeto

```bash
cd repertorio-igreja
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Execute em modo desenvolvimento

```bash
npm run dev
```

O aplicativo abrirá automaticamente em `http://localhost:5173`

### 4. Build para produção

```bash
npm run build
```

Os arquivos prontos ficarão em `dist/`

## 📁 Estrutura do Projeto

```
repertorio-igreja/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CadastrarHino.tsx
│   │   ├── Harpa.tsx
│   │   ├── MontarRepertorio.tsx
│   │   ├── RepertoriosSalvos.tsx
│   │   ├── Configuracoes.tsx
│   │   └── ModalVisualizaLetra.tsx
│   ├── services/            # Serviços da aplicação
│   │   ├── db.ts           # Banco de dados (Dexie/IndexedDB)
│   │   └── pdf.ts          # Geração de PDFs
│   ├── types/              # Tipagens TypeScript
│   │   └── index.ts
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Ponto de entrada
│   └── index.css           # Estilos globais
├── index.html              # HTML principal
├── package.json            # Dependências
├── tsconfig.json           # Configuração TypeScript
├── vite.config.ts          # Configuração Vite
├── tailwind.config.js      # Configuração Tailwind CSS
└── postcss.config.js       # Configuração PostCSS
```

## 💾 Como os Dados São Salvos

Os dados são armazenados **localmente no seu navegador** usando:
- **IndexedDB** - Banco de dados local do navegador (até vários GB)
- **Dexie.js** - Wrapper simplificado para IndexedDB

Todos os dados ficam no seu computador. Nada é enviado para servidores!

## 🔐 Dados Salvos

O sistema persiste:
- ✅ Hinos comuns cadastrados
- ✅ Hinos da Harpa Cristã cadastrados
- ✅ Repertórios montados
- ✅ Configurações (nome da igreja, responsável, etc)
- ✅ Base de nomes dos hinos da Harpa

## 📊 Modelos de Dados

### Hino
```typescript
{
  id: string;                    // ID único
  nome: string;                  // Nome do hino
  tom: string;                   // Tom (C, C#, D, etc)
  cantor: string;                // Nome de quem vai cantar
  letra: string;                 // Letra completa
  categoria: string;             // Alfa, Manancial, Louvor, etc
  observacoes?: string;          // Observações opcionais
  tipo: 'comum' | 'harpa';       // Tipo de hino
  numeroHarpa?: number;          // Número na Harpa Cristã
  criadoEm: string;              // Data de criação
  atualizadoEm: string;          // Data de atualização
}
```

### Repertório
```typescript
{
  id: string;                    // ID único
  nome: string;                  // Nome do repertório
  data: string;                  // Data do culto
  horario?: string;              // Horário (opcional)
  observacoes?: string;          // Observações gerais
  hinos: HinoNoRepertorio[];     // Lista de hinos na sequência
  criadoEm: string;              // Data de criação
  atualizadoEm: string;          // Data de atualização
}
```

## 🎵 Usando o Sistema

### 1️⃣ Dashboard
- Visão geral do sistema
- Resumo de estatísticas
- Próximo repertório agendado
- Últimos repertórios montados

### 2️⃣ Cadastrar Hino
- Adicione hinos comuns da sua igreja
- Defina tom, cantor, categoria
- Inclua a letra completa
- Edite ou delete hinos existentes

### 3️⃣ Hinos da Harpa
- Digite o número do hino da Harpa
- O nome é preenchido automaticamente (se cadastrado)
- Adicione tom, cantor e letra
- Compartilhe ou gere PDF

### 4️⃣ Montar Repertório
- Crie um novo repertório
- Adicione hinos da lista
- Organize a sequência com setas (cima/baixo)
- Altere tom ou cantor para este culto (sem afetar o cadastro)
- Gere PDF com ou sem letras completas
- Compartilhe no WhatsApp

### 5️⃣ Repertórios Salvos
- Veja todos os repertórios cadastrados
- Edite ou delete repertórios
- Duplique um repertório para reutilizar
- Gere PDF ou compartilhe novamente

### 6️⃣ Configurações
- Defina o nome da sua igreja
- Configure responsável
- Adicione texto de rodapé para PDFs
- Exporte backup de todos os dados
- Importe backup anterior
- Limpe todos os dados (ação permanente)

## 📱 Compatibilidade

- ✅ Computador (Windows, Mac, Linux)
- ✅ Tablet (iPad, Android)
- ✅ Celular (responsivo)

## 🔄 Backup e Restauração

### Exportar Backup
1. Vá para **Configurações**
2. Clique em **Exportar Backup**
3. Um arquivo JSON será baixado

### Importar Backup
1. Vá para **Configurações**
2. Clique em **Importar Backup**
3. Selecione o arquivo JSON
4. Confirme a importação

## ⚙️ Tecnologias Utilizadas

- **React 18** - Interface com componentes
- **TypeScript** - Tipagem segura
- **Tailwind CSS** - Estilização
- **Vite** - Build rápido
- **Dexie.js** - Gerenciador de IndexedDB
- **html2pdf.js** - Geração de PDFs
- **Lucide React** - Ícones

## 🎨 Design

- Interface moderna e limpa
- Paleta de cores profissional (índigo/roxo)
- Totalmente responsivo
- Acessível e fácil de usar
- Feedback visual para todas as ações

## 📝 Notas

- Os dados não são sincronizados entre computadores
- Cada navegador/dispositivo tem seu próprio banco de dados
- O WhatsApp Web abrirá para compartilhamento
- PDFs podem incluir ou não a letra completa dos hinos

## 🐛 Problemas Comuns

### PDFs não baixam
- Verifique permissões do navegador
- Tente outro navegador
- Verifique se pop-ups estão bloqueados

### Dados desaparecem após atualizar a página
- Isso não deveria acontecer - os dados são salvos automaticamente
- Tente limpar o cache do navegador (Ctrl+Shift+Delete)
- Verifique o Armazenamento do Navegador (DevTools > Application > IndexedDB)

### WhatsApp não abre
- Verifique se você tem WhatsApp Web aberto
- Ou instale o aplicativo WhatsApp
- Use o WhatsApp Desktop

## 📞 Suporte

Este é um projeto de código aberto. Para reportar bugs ou sugerir melhorias, você pode:
- Adicionar issues no repositório
- Fazer melhorias através de pull requests

## 📄 Licença

Este projeto é distribuído como está, sem garantias. Use livremente em sua igreja!

---

**Desenvolvido com ❤️ para igrejas**

Versão 1.0.0
