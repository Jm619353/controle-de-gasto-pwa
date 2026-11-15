# Controle Diário — PWA de Gestão de Ganhos e Despesas

Aplicação web progressiva (*Progressive Web App*) **mobile-first** desenvolvida para motoristas e trabalhadores autônomos acompanharem faturamento diário, gastos com combustível, reserva de desgaste do veículo e lucro líquido real — funcionando **100% offline** e instalável na tela inicial do celular ou computador.

## Acesso ao Aplicativo

- **Link de Produção:** https://controle-de-gasto-pwa.vercel.app

### Instalação como Aplicativo (PWA)

- **Android (Google Chrome):** Abra o link acima, toque no menu **`⋮`** no canto superior direito e selecione **Instalar aplicativo** (ou **Adicionar à tela inicial**).
- **iOS (Safari):** Abra o link acima, toque no ícone de **Compartilhar** e selecione **Adicionar à Tela de Início**.
- **Desktop (Chrome / Edge):** Clique no ícone de instalação na barra de endereços do navegador.

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

1. **Clone o repositório e instale as dependências:**
```bash
git clone [https://github.com/Jm619353/controle-de-gasto-pwa.git](https://github.com/Jm619353/controle-de-gasto-pwa.git)
cd controle-de-gasto-pwa
npm install

```


2. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev

```


3. **Para gerar e testar a versão final de produção (com PWA e Service Worker ativos):**
```bash
npm run build
npm run preview

```



## Deploy na Vercel

Este projeto está configurado para hospedagem estática com HTTPS (requisito obrigatório para o funcionamento do Service Worker e instalação do PWA):

1. Acesse [vercel.com](https://vercel.com) e entre com sua conta do GitHub.
2. No painel inicial, clique em **Add New... → Project** e importe o repositório `controle-de-gasto-pwa`.
3. Confirme as configurações detectadas automaticamente para o Vite:
* **Framework Preset:** `Vite`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`


4. Clique em **Deploy**. A partir desse momento, cada novo `git push` na branch `main` atualizará a aplicação automaticamente.
