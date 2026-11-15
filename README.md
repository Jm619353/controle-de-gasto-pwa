# Controle Diário — PWA de Gestão de Ganhos e Despesas

Aplicação web progressiva (*Progressive Web App*) **mobile-first** desenvolvida para motoristas e trabalhadores autônomos acompanharem faturamento diário, gastos com combustível, reserva de desgaste do veículo e lucro líquido real — funcionando **100% offline** e instalável na tela inicial do celular ou computador.

## Funcionalidades

- **Lançamento Diário Inteligente:** Registro de data (com máscara brasileira `dd/mm/aaaa` e seletor de calendário nativo), quilometragem rodada, faturamento bruto e preço vigente da gasolina no dia.
- **Cálculos Automáticos:**
  - Consumo estimado em litros (`KM / consumo médio`).
  - Custo total de combustível baseado no preço pago na data do lançamento (preservando o histórico mesmo quando o combustível oscila).
  - Saldo intermediário (*valor sem gasolina*).
  - Reserva financeira para manutenção e desgaste (`R$/km`).
  - Lucro líquido real por dia e acumulado.
- **Relatórios por Janela de Tempo:** Filtros rápidos para **7 dias**, **15 dias**, **1 mês**, **6 meses**, **1 ano** ou **período personalizado**, exibindo totais consolidados, média de lucro por dia e lucro líquido por quilômetro rodado.
- **Histórico Editável:** Consulta mensal com possibilidade de corrigir datas de lançamentos anteriores ou excluir registros.
- **Privacidade e Backup Local:** Todos os dados ficam salvos localmente no dispositivo via **IndexedDB**, com exportação e importação em arquivo `.json` para transferência entre celular e computador.
- **Modo Offline (PWA):** Service Worker configurado para carregamento instantâneo e operação sem conexão com a internet.

## Tecnologias Utilizadas

- **Vue 3** (Composition API + `<script setup>`)
- **TypeScript**
- **Vite** + **vite-plugin-pwa**
- **Dexie.js** (abstração para IndexedDB)
- **CSS3** (layout responsivo mobile-first em tema escuro)

## Estrutura do Projeto

```text
├── public/
│   ├── icon-192.png          # Ícone PWA (192x192)
│   └── icon-512.png          # Ícone PWA (512x512)
└── src/
    ├── components/
    │   └── CampoDataBR.vue   # Input de data híbrido (teclado dd/mm/aaaa + calendário)
    ├── database/
    │   ├── db.ts             # Definição do schema IndexedDB com Dexie
    │   └── repositorio.ts    # Operações CRUD, filtros por período e backup JSON
    ├── domain/
    │   └── calculos.ts       # Regras de negócio, cálculos diários e consolidação de relatórios
    ├── App.vue               # Interface principal e navegação por abas
    ├── main.ts               # Ponto de entrada da aplicação
    └── style.css             # Estilização global

**Sim, subir para o GitHub é o caminho mais prático**, pois conecta diretamente com a Vercel: toda melhoria que você enviar para o repositório no futuro atualiza o aplicativo no ar automaticamente, sem precisar refazer o deploy manual. *(Tecnicamente também é possível publicar direto do PC usando a Vercel CLI, mas usar o GitHub já deixa o projeto versionado e com atualização contínua.)*

---

### 1. Subir o projeto para o GitHub

1. **Crie o repositório no GitHub:**
* Acesse [github.com/new](https://github.com/new), dê um nome ao projeto (ex.: `controle-diario-pwa`), escolha **Public** ou **Private** e clique em **Create repository** *(não marque a opção de adicionar README ou `.gitignore` agora, pois o seu projeto já tem os dois)*.


2. **Envie os arquivos pelo terminal do VS Code:**
* Cole o conteúdo do `README.md` (mais abaixo) no arquivo `README.md` da raiz do seu projeto e salve (`Ctrl + S`).
* No terminal integrado do VS Code, execute os comandos abaixo (substituindo a URL pela do repositório que você acabou de criar):



```powershell
git init
git add .
git commit -m "feat: versao inicial do PWA de controle diario"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/controle-diario-pwa.git
git push -u origin main

```

*(O arquivo `.gitignore` criado pelo Vite já ignora automaticamente as pastas `node_modules` e `dist`, enviando apenas o código-fonte e os ícones de `public/`.)*

---

### 2. Colocar no ar pela Vercel

1. Acesse [vercel.com](https://vercel.com) e entre usando sua conta do **GitHub** (**Continue with GitHub**).
2. No painel inicial, clique em **Add New...** → **Project**.
3. Localize o repositório `controle-diario-pwa` na lista e clique em **Import**.
4. Na tela de configuração, a Vercel já detecta o **Vite** automaticamente com os parâmetros corretos:
* **Framework Preset:** `Vite`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`


5. Clique em **Deploy** e aguarde cerca de 30 segundos. Ao finalizar, a Vercel gera um link HTTPS definitivo (ex.: `[https://controle-diario-pwa.vercel.app](https://controle-diario-pwa.vercel.app)`).

---

### 3. Instalar no celular

Com o link HTTPS da Vercel aberto no navegador do celular:

* **Android (Google Chrome):** Toque no menu **`⋮`** no canto superior direito → **Instalar aplicativo** (ou **Adicionar à tela inicial**).
* **iPhone (Safari):** Toque no ícone de **Compartilhar** → **Adicionar à Tela de Início**.

---

### Sugestão de `README.md` para o repositório

Copie o bloco abaixo e cole dentro do arquivo **`README.md`** na raiz do projeto antes de fazer o `git commit`:

```markdown
# Controle Diário — PWA de Gestão de Ganhos e Despesas

Aplicação web progressiva (*Progressive Web App*) **mobile-first** desenvolvida para motoristas e trabalhadores autônomos acompanharem faturamento diário, gastos com combustível, reserva de desgaste do veículo e lucro líquido real — funcionando **100% offline** e instalável na tela inicial do celular ou computador.

## Funcionalidades

- **Lançamento Diário Inteligente:** Registro de data (com máscara brasileira `dd/mm/aaaa` e seletor de calendário nativo), quilometragem rodada, faturamento bruto e preço vigente da gasolina no dia.
- **Cálculos Automáticos:**
  - Consumo estimado em litros (`KM / consumo médio`).
  - Custo total de combustível baseado no preço pago na data do lançamento (preservando o histórico mesmo quando o combustível oscila).
  - Saldo intermediário (*valor sem gasolina*).
  - Reserva financeira para manutenção e desgaste (`R$/km`).
  - Lucro líquido real por dia e acumulado.
- **Relatórios por Janela de Tempo:** Filtros rápidos para **7 dias**, **15 dias**, **1 mês**, **6 meses**, **1 ano** ou **período personalizado**, exibindo totais consolidados, média de lucro por dia e lucro líquido por quilômetro rodado.
- **Histórico Editável:** Consulta mensal com possibilidade de corrigir datas de lançamentos anteriores ou excluir registros.
- **Privacidade e Backup Local:** Todos os dados ficam salvos localmente no dispositivo via **IndexedDB**, com exportação e importação em arquivo `.json` para transferência entre celular e computador.
- **Modo Offline (PWA):** Service Worker configurado para carregamento instantâneo e operação sem conexão com a internet.

## Tecnologias Utilizadas

- **Vue 3** (Composition API + `<script setup>`)
- **TypeScript**
- **Vite** + **vite-plugin-pwa**
- **Dexie.js** (abstração para IndexedDB)
- **CSS3** (layout responsivo mobile-first em tema escuro)

## Estrutura do Projeto

```text
├── public/
│   ├── icon-192.png          # Ícone PWA (192x192)
│   └── icon-512.png          # Ícone PWA (512x512)
└── src/
    ├── components/
    │   └── CampoDataBR.vue   # Input de data híbrido (teclado dd/mm/aaaa + calendário)
    ├── database/
    │   ├── db.ts             # Definição do schema IndexedDB com Dexie
    │   └── repositorio.ts    # Operações CRUD, filtros por período e backup JSON
    ├── domain/
    │   └── calculos.ts       # Regras de negócio, cálculos diários e consolidação de relatórios
    ├── App.vue               # Interface principal e navegação por abas
    ├── main.ts               # Ponto de entrada da aplicação
    └── style.css             # Estilização global

```

## Como Executar Localmente

1. **Instale as dependências:**
```bash
npm install

```


2. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev

```


3. **Para testar a versão final de produção (com PWA e Service Worker ativos):**
```bash
npm run build
npm run preview

```