<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import CampoDataBR from './components/CampoDataBR.vue';
import CampoNumero from './components/CampoNumero.vue';
import type { Configuracao, TipoVeiculo, Veiculo } from './database/db';
import {
  obterConfiguracao,
  atualizarConfiguracao,
  listarVeiculos,
  salvarVeiculo,
  definirVeiculoPadrao,
  excluirVeiculo,
  adicionarRegistro,
  listarRegistrosPorMes,
  listarRegistrosPorPeriodo,
  atualizarDataRegistro,
  excluirRegistro,
  exportarBackupJSON,
  importarBackupJSON,
} from './database/repositorio';
import {
  calcularRegistro,
  consolidarPeriodo,
  type RegistroCalculado,
} from './domain/calculos';

type Aba = 'lancar' | 'historico' | 'relatorios' | 'ajustes';
type TipoPeriodo = '7d' | '15d' | '1m' | '6m' | '1a' | 'personalizado';

function obterDataLocal(diasDeslocamento = 0): string {
  const data = new Date();
  data.setDate(data.getDate() + diasDeslocamento);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO: string): string {
  if (!dataISO || !dataISO.includes('-')) return dataISO;
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function iconeTipoVeiculo(tipo?: TipoVeiculo): string {
  if (tipo === 'moto') return '🏍️';
  if (tipo === 'carro') return '🚗';
  return '🚘';
}

// Estado global
const abaAtiva = ref<Aba>('lancar');
const mesSelecionado = ref(obterDataLocal().slice(0, 7));
const mensagemFeedback = ref('');

// Configurações e Veículos
const config = ref<Configuracao>({
  consumoKmPorLitro: 9,
  reservaDesgastePorKm: 0.3,
  precoGasolinaPadrao: 6.24,
});
const veiculos = ref<Veiculo[]>([]);
const veiculoSelecionadoId = ref<number | undefined>(undefined);

// Formulário da Garagem (Ajustes)
const formVeiculo = ref<{
  id?: number;
  apelido: string;
  modelo: string;
  tipo: TipoVeiculo;
  consumoKmPorLitro: number | null;
  reservaDesgastePorKm: number | null;
  padrao: boolean;
}>({
  apelido: '',
  modelo: '',
  tipo: 'carro',
  consumoKmPorLitro: 9,
  reservaDesgastePorKm: 0.3,
  padrao: false,
});

// Formulário de lançamento
const dataForm = ref(obterDataLocal());
const kmForm = ref<number | null>(null);
const ganhoForm = ref<number | null>(null);
const gasolinaForm = ref<number | null>(6.24);

// Edição de data no Histórico
const editandoId = ref<number | null>(null);
const dataEdicaoISO = ref('');

// Listas de registros
const registrosMes = ref<RegistroCalculado[]>([]);
const registrosRelatorio = ref<RegistroCalculado[]>([]);

// Filtro de período e veículo na aba Relatórios
const periodoSelecionado = ref<TipoPeriodo>('7d');
const dataInicioRelatorio = ref(obterDataLocal(-6));
const dataFimRelatorio = ref(obterDataLocal());
const filtroVeiculoRelatorio = ref<string>('todos');

const veiculoAtivoLancamento = computed(() =>
  veiculos.value.find((v) => v.id === veiculoSelecionadoId.value)
);

const resumoMes = computed(() => consolidarPeriodo(registrosMes.value));

const registrosRelatorioFiltrados = computed(() => {
  if (filtroVeiculoRelatorio.value === 'todos') {
    return registrosRelatorio.value;
  }
  const idFiltro = Number(filtroVeiculoRelatorio.value);
  return registrosRelatorio.value.filter((r) => r.veiculoId === idFiltro);
});

const resumoRelatorio = computed(() =>
  consolidarPeriodo(registrosRelatorioFiltrados.value)
);

function exibirAviso(texto: string) {
  mensagemFeedback.value = texto;
  setTimeout(() => {
    mensagemFeedback.value = '';
  }, 3200);
}

async function carregarVeiculos() {
  veiculos.value = await listarVeiculos();
  const aindaExiste = veiculos.value.some(
    (v) => v.id === veiculoSelecionadoId.value
  );
  if (!aindaExiste) {
    const padrao = veiculos.value.find((v) => v.padrao) ?? veiculos.value[0];
    veiculoSelecionadoId.value = padrao?.id;
  }
}

async function carregarDados() {
  config.value = await obterConfiguracao();
  if (config.value.precoGasolinaPadrao) {
    gasolinaForm.value = config.value.precoGasolinaPadrao;
  }
  await carregarVeiculos();

  const brutosMes = await listarRegistrosPorMes(mesSelecionado.value);
  registrosMes.value = brutosMes.map((r) => calcularRegistro(r, config.value));

  await carregarRelatorio();
}

async function carregarRelatorio() {
  if (!dataInicioRelatorio.value || !dataFimRelatorio.value) return;
  const brutos = await listarRegistrosPorPeriodo(
    dataInicioRelatorio.value,
    dataFimRelatorio.value
  );
  registrosRelatorio.value = brutos.map((r) =>
    calcularRegistro(r, config.value)
  );
}

function selecionarAtalhoPeriodo(tipo: Exclude<TipoPeriodo, 'personalizado'>) {
  periodoSelecionado.value = tipo;
  dataFimRelatorio.value = obterDataLocal();

  const mapaDias: Record<Exclude<TipoPeriodo, 'personalizado'>, number> = {
    '7d': -6,
    '15d': -14,
    '1m': -29,
    '6m': -179,
    '1a': -364,
  };

  dataInicioRelatorio.value = obterDataLocal(mapaDias[tipo]);
}

watch(mesSelecionado, carregarDados);
watch([dataInicioRelatorio, dataFimRelatorio], carregarRelatorio);
onMounted(carregarDados);

// Ações da Garagem de Veículos
function aplicarPresetVeiculo(tipo: 'carro' | 'moto') {
  if (tipo === 'carro') {
    formVeiculo.value.tipo = 'carro';
    formVeiculo.value.consumoKmPorLitro = 9;
    formVeiculo.value.reservaDesgastePorKm = 0.3;
    if (!formVeiculo.value.apelido) formVeiculo.value.apelido = 'Carro';
  } else {
    formVeiculo.value.tipo = 'moto';
    formVeiculo.value.consumoKmPorLitro = 35;
    formVeiculo.value.reservaDesgastePorKm = 0.1;
    if (!formVeiculo.value.apelido) formVeiculo.value.apelido = 'Moto';
  }
}

function limparFormVeiculo() {
  formVeiculo.value = {
    id: undefined,
    apelido: '',
    modelo: '',
    tipo: 'carro',
    consumoKmPorLitro: 9,
    reservaDesgastePorKm: 0.3,
    padrao: false,
  };
}

function editarVeiculo(v: Veiculo) {
  formVeiculo.value = {
    id: v.id,
    apelido: v.apelido,
    modelo: v.modelo,
    tipo: v.tipo,
    consumoKmPorLitro: v.consumoKmPorLitro,
    reservaDesgastePorKm: v.reservaDesgastePorKm,
    padrao: v.padrao,
  };
}

async function salvarFormVeiculo() {
  if (!formVeiculo.value.apelido.trim()) {
    exibirAviso('Informe um apelido para o veículo (ex.: Moto do corre).');
    return;
  }
  if (
    !formVeiculo.value.consumoKmPorLitro ||
    formVeiculo.value.consumoKmPorLitro <= 0 ||
    formVeiculo.value.reservaDesgastePorKm === null ||
    formVeiculo.value.reservaDesgastePorKm < 0
  ) {
    exibirAviso('Informe valores válidos para consumo e desgaste.');
    return;
  }

  const estavaEditando = Boolean(formVeiculo.value.id);
  const idSalvo = await salvarVeiculo({
    id: formVeiculo.value.id,
    apelido: formVeiculo.value.apelido,
    modelo: formVeiculo.value.modelo || 'Não informado',
    tipo: formVeiculo.value.tipo,
    consumoKmPorLitro: formVeiculo.value.consumoKmPorLitro,
    reservaDesgastePorKm: formVeiculo.value.reservaDesgastePorKm,
    padrao: formVeiculo.value.padrao,
  });

  limparFormVeiculo();
  await carregarVeiculos();
  veiculoSelecionadoId.value = idSalvo;
  exibirAviso(
    estavaEditando ? 'Veículo atualizado!' : 'Veículo adicionado à garagem!'
  );
}

async function tornarPadrao(id?: number) {
  if (!id) return;
  await definirVeiculoPadrao(id);
  await carregarVeiculos();
  veiculoSelecionadoId.value = id;
  exibirAviso('Veículo padrão atualizado!');
}

async function removerVeiculo(id?: number) {
  if (!id) return;
  const removido = await excluirVeiculo(id);
  if (!removido) {
    exibirAviso('É necessário manter pelo menos um veículo cadastrado.');
    return;
  }
  if (formVeiculo.value.id === id) limparFormVeiculo();
  await carregarVeiculos();
  exibirAviso('Veículo removido da garagem.');
}

// Lançamento diário
async function salvarLancamento() {
  if (!dataForm.value) {
    exibirAviso('Informe uma data válida no formato dd/mm/aaaa.');
    return;
  }
  if (!kmForm.value || !ganhoForm.value || kmForm.value <= 0) {
    exibirAviso('Preencha os quilômetros e o valor ganho.');
    return;
  }
  if (!gasolinaForm.value || gasolinaForm.value <= 0) {
  exibirAviso('Informe o preço da gasolina.');
  return;
  }

  const veiculo = veiculoAtivoLancamento.value;

  await adicionarRegistro({
    data: dataForm.value,
    kmRodados: kmForm.value,
    dinheiroGanho: ganhoForm.value,
    precoGasolinaAplicado: gasolinaForm.value,
    veiculoId: veiculo?.id,
    veiculoApelido: veiculo?.apelido ?? 'Veículo Principal',
    veiculoModelo: veiculo?.modelo ?? '',
    consumoAplicado:
      veiculo?.consumoKmPorLitro ?? config.value.consumoKmPorLitro,
    reservaAplicada:
      veiculo?.reservaDesgastePorKm ?? config.value.reservaDesgastePorKm,
  });

  await atualizarConfiguracao({ precoGasolinaPadrao: gasolinaForm.value });

  mesSelecionado.value = dataForm.value.slice(0, 7);
  kmForm.value = null;
  ganhoForm.value = null;

  await carregarDados();
  exibirAviso('Dia registrado com sucesso!');
}

// Edição de data no Histórico
function iniciarEdicaoData(item: RegistroCalculado) {
  if (!item.id) return;
  editandoId.value = item.id;
  dataEdicaoISO.value = item.data;
}

function cancelarEdicaoData() {
  editandoId.value = null;
  dataEdicaoISO.value = '';
}

async function salvarEdicaoData(id?: number) {
  if (!id) return;
  if (!dataEdicaoISO.value) {
    exibirAviso('Informe uma data válida no formato dd/mm/aaaa.');
    return;
  }

  await atualizarDataRegistro(id, dataEdicaoISO.value);
  mesSelecionado.value = dataEdicaoISO.value.slice(0, 7);
  cancelarEdicaoData();
  await carregarDados();
  exibirAviso('Data alterada com sucesso!');
}

async function removerItem(id?: number) {
  if (!id) return;
  await excluirRegistro(id);
  await carregarDados();
  exibirAviso('Registro removido.');
}

// Backup JSON
async function baixarBackup() {
  const json = await exportarBackupJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-controle-diario-${obterDataLocal()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function restaurarBackup(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const arquivo = input.files?.[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = async () => {
    try {
      await importarBackupJSON(String(leitor.result));
      await carregarDados();
      exibirAviso('Backup restaurado com sucesso!');
    } catch {
      exibirAviso('Erro ao ler o arquivo de backup.');
    }
  };
  leitor.readAsText(arquivo);
}
</script>

<template>
  <div class="app-container">
    <!-- Cabeçalho com filtro mensal -->
    <header class="topo">
      <h1>Controle Diário</h1>
      <input type="month" v-model="mesSelecionado" class="seletor-mes" />
    </header>

    <!-- Cards de Resumo Mensal -->
    <section class="cards-resumo">
      <div class="card destaque">
        <span>Lucro Real</span>
        <strong>{{ formatarMoeda(resumoMes.totalLucroReal) }}</strong>
      </div>
      <div class="card">
        <span>Ganho Bruto</span>
        <strong>{{ formatarMoeda(resumoMes.totalGanhoBruto) }}</strong>
      </div>
      <div class="card">
        <span>Gasolina ({{ resumoMes.totalLitros.toFixed(1) }} L)</span>
        <strong class="negativo"
          >- {{ formatarMoeda(resumoMes.totalGasolina) }}</strong
        >
      </div>
      <div class="card">
        <span>Reserva Desgaste</span>
        <strong class="negativo"
          >- {{ formatarMoeda(resumoMes.totalDesgaste) }}</strong
        >
      </div>
    </section>

    <div v-if="mensagemFeedback" class="toast">{{ mensagemFeedback }}</div>

    <!-- Navegação -->
    <nav class="abas">
      <button
        :class="{ ativo: abaAtiva === 'lancar' }"
        @click="abaAtiva = 'lancar'"
      >
        Lançar
      </button>
      <button
        :class="{ ativo: abaAtiva === 'historico' }"
        @click="abaAtiva = 'historico'"
      >
        Histórico ({{ registrosMes.length }})
      </button>
      <button
        :class="{ ativo: abaAtiva === 'relatorios' }"
        @click="abaAtiva = 'relatorios'"
      >
        Relatórios
      </button>
      <button
        :class="{ ativo: abaAtiva === 'ajustes' }"
        @click="abaAtiva = 'ajustes'"
      >
        Ajustes
      </button>
    </nav>

    <!-- ABA 1: Lançar -->
    <main v-if="abaAtiva === 'lancar'" class="painel">
      <form @submit.prevent="salvarLancamento" class="formulario">
        <label>
          Veículo Utilizado
          <select v-model="veiculoSelecionadoId" class="select-padrao">
            <option v-for="v in veiculos" :key="v.id" :value="v.id">
              {{ iconeTipoVeiculo(v.tipo) }} {{ v.apelido }}
              {{ v.modelo ? `(${v.modelo})` : '' }} — {{ v.consumoKmPorLitro }} km/L
            </option>
          </select>
        </label>

        <label>
          Data
          <CampoDataBR v-model="dataForm" required />
        </label>

        <label>
       KM Rodados
       <CampoNumero v-model="kmForm" placeholder="Ex: 136.6" required />
     </label>

     <label>
       Dinheiro Ganho (R$)
       <CampoNumero v-model="ganhoForm" placeholder="Ex: 252.17" required />
     </label>

     <label>
       Preço da Gasolina Hoje (R$/L)
       <CampoNumero v-model="gasolinaForm" placeholder="Ex: 6.24" required />
     </label>

        <button type="submit" class="btn-principal">Salvar Dia</button>
      </form>
    </main>

    <!-- ABA 2: Histórico -->
    <main v-if="abaAtiva === 'historico'" class="painel">
      <p v-if="registrosMes.length === 0" class="vazio">
        Nenhum registro encontrado neste mês.
      </p>

      <div v-for="item in registrosMes" :key="item.id" class="item-historico">
        <div class="item-topo">
          <div class="item-titulo-grupo">
            <strong>{{ formatarDataBR(item.data) }} — {{ item.kmRodados }} km</strong>
            <span v-if="item.veiculoApelido" class="badge-veiculo">
              {{ item.veiculoApelido }}
              <template v-if="item.veiculoModelo"> • {{ item.veiculoModelo }}</template>
            </span>
          </div>
          <div class="acoes-item">
            <button @click="iniciarEdicaoData(item)" class="btn-editar">
              Editar data
            </button>
            <button @click="removerItem(item.id)" class="btn-excluir">
              Excluir
            </button>
          </div>
        </div>

        <div v-if="editandoId === item.id" class="edicao-data-box">
          <CampoDataBR v-model="dataEdicaoISO" />
          <div class="edicao-botoes">
            <button @click="salvarEdicaoData(item.id)" class="btn-salvar-mini">
              Salvar
            </button>
            <button @click="cancelarEdicaoData" class="btn-cancelar-mini">
              Cancelar
            </button>
          </div>
        </div>

        <div class="item-detalhes">
          <span>Bruto: {{ formatarMoeda(item.dinheiroGanho) }}</span>
          <span>
            Gasolina ({{ formatarMoeda(item.precoGasolinaAplicado) }}/L): -{{
              formatarMoeda(item.valorGasolina)
            }}
          </span>
          <span>Sem gasolina: {{ formatarMoeda(item.valorSemGasolina) }}</span>
          <span>Desgaste: -{{ formatarMoeda(item.reservaDesgaste) }}</span>
          <strong class="lucro-item"
            >Lucro: {{ formatarMoeda(item.lucroReal) }}</strong
          >
        </div>
      </div>
    </main>

    <!-- ABA 3: Relatórios por Período -->
    <main v-if="abaAtiva === 'relatorios'" class="painel">
      <div class="filtros-periodo">
        <button
          :class="{ ativo: periodoSelecionado === '7d' }"
          @click="selecionarAtalhoPeriodo('7d')"
        >
          7 dias
        </button>
        <button
          :class="{ ativo: periodoSelecionado === '15d' }"
          @click="selecionarAtalhoPeriodo('15d')"
        >
          15 dias
        </button>
        <button
          :class="{ ativo: periodoSelecionado === '1m' }"
          @click="selecionarAtalhoPeriodo('1m')"
        >
          1 mês
        </button>
        <button
          :class="{ ativo: periodoSelecionado === '6m' }"
          @click="selecionarAtalhoPeriodo('6m')"
        >
          6 meses
        </button>
        <button
          :class="{ ativo: periodoSelecionado === '1a' }"
          @click="selecionarAtalhoPeriodo('1a')"
        >
          1 ano
        </button>
        <button
          :class="{ ativo: periodoSelecionado === 'personalizado' }"
          @click="periodoSelecionado = 'personalizado'"
        >
          Data exata
        </button>
      </div>

      <div
        v-if="periodoSelecionado === 'personalizado'"
        class="datas-personalizadas"
      >
        <label>
          De
          <CampoDataBR v-model="dataInicioRelatorio" />
        </label>
        <label>
          Até
          <CampoDataBR v-model="dataFimRelatorio" />
        </label>
      </div>

      <div class="filtro-veiculo-relatorio">
        <select v-model="filtroVeiculoRelatorio" class="select-padrao">
          <option value="todos">Todos os veículos</option>
          <option v-for="v in veiculos" :key="v.id" :value="String(v.id)">
            {{ iconeTipoVeiculo(v.tipo) }} {{ v.apelido }}
            {{ v.modelo ? `(${v.modelo})` : '' }}
          </option>
        </select>
      </div>

      <div class="relatorio-cabecalho">
        <span>
          {{ formatarDataBR(dataInicioRelatorio) }} até
          {{ formatarDataBR(dataFimRelatorio) }}
        </span>
        <strong>{{ resumoRelatorio.diasTrabalhados }} dia(s)</strong>
      </div>

      <div class="relatorio-bloco">
        <div class="relatorio-linha">
          <span>Distância percorrida</span>
          <strong>{{ resumoRelatorio.totalKm.toFixed(1) }} km</strong>
        </div>
        <div class="relatorio-linha">
          <span>Faturamento bruto</span>
          <strong>{{ formatarMoeda(resumoRelatorio.totalGanhoBruto) }}</strong>
        </div>
        <div class="relatorio-linha">
          <span>Combustível ({{ resumoRelatorio.totalLitros.toFixed(1) }} L)</span>
          <strong class="negativo"
            >- {{ formatarMoeda(resumoRelatorio.totalGasolina) }}</strong
          >
        </div>
        <div class="relatorio-linha">
          <span>Valor sem gasolina</span>
          <strong>{{ formatarMoeda(resumoRelatorio.totalSemGasolina) }}</strong>
        </div>
        <div class="relatorio-linha">
          <span>Reserva de desgaste</span>
          <strong class="negativo"
            >- {{ formatarMoeda(resumoRelatorio.totalDesgaste) }}</strong
          >
        </div>
        <div class="relatorio-linha destaque-linha">
          <span>Lucro líquido no período</span>
          <strong>{{ formatarMoeda(resumoRelatorio.totalLucroReal) }}</strong>
        </div>
      </div>

      <div class="relatorio-bloco">
        <div class="relatorio-linha">
          <span>Média de lucro por dia trabalhado</span>
          <strong>{{ formatarMoeda(resumoRelatorio.mediaLucroPorDia) }}</strong>
        </div>
        <div class="relatorio-linha">
          <span>Lucro líquido por KM rodado</span>
          <strong>{{ formatarMoeda(resumoRelatorio.lucroPorKm) }}/km</strong>
        </div>
      </div>
    </main>

    <!-- ABA 4: Ajustes e Garagem -->
    <main v-if="abaAtiva === 'ajustes'" class="painel">
      <div class="secao-garagem">
        <h3>Meus Veículos</h3>

        <div class="lista-veiculos">
          <div
            v-for="v in veiculos"
            :key="v.id"
            class="card-veiculo"
            :class="{ 'veiculo-padrao': v.padrao }"
          >
            <div class="veiculo-info">
              <div class="veiculo-nome">
                <strong>{{ iconeTipoVeiculo(v.tipo) }} {{ v.apelido }}</strong>
                <span v-if="v.padrao" class="tag-padrao">Padrão</span>
              </div>
              <span class="veiculo-modelo">{{ v.modelo }}</span>
              <span class="veiculo-specs">
                {{ v.consumoKmPorLitro }} km/L • Desgaste:
                {{ formatarMoeda(v.reservaDesgastePorKm) }}/km
              </span>
            </div>

            <div class="veiculo-acoes">
              <button
                v-if="!v.padrao"
                type="button"
                @click="tornarPadrao(v.id)"
                class="btn-mini"
              >
                Usar padrão
              </button>
              <button
                type="button"
                @click="editarVeiculo(v)"
                class="btn-mini btn-mini-azul"
              >
                Editar
              </button>
              <button
                v-if="veiculos.length > 1"
                type="button"
                @click="removerVeiculo(v.id)"
                class="btn-excluir"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>

        <form @submit.prevent="salvarFormVeiculo" class="formulario form-veiculo">
          <h4>{{ formVeiculo.id ? 'Editar Veículo' : 'Adicionar Novo Veículo' }}</h4>

          <div class="presets-veiculo">
            <button
              type="button"
              class="btn-preset"
              @click="aplicarPresetVeiculo('carro')"
            >
              🚗 Padrão Carro (9 km/L • R$ 0,30)
            </button>
            <button
              type="button"
              class="btn-preset"
              @click="aplicarPresetVeiculo('moto')"
            >
              🏍️ Padrão Moto (35 km/L • R$ 0,10)
            </button>
          </div>

          <label>
            Apelido do Veículo
            <input
              type="text"
              placeholder="Ex: Moto do corre, Carro família"
              v-model="formVeiculo.apelido"
              required
            />
          </label>

          <label>
            Modelo
            <input
              type="text"
              placeholder="Ex: CG 160 Start, Onix 1.0"
              v-model="formVeiculo.modelo"
            />
          </label>

         <div class="linha-dupla">
         <label>
           Consumo (KM/L)
           <CampoNumero v-model="formVeiculo.consumoKmPorLitro" required />
         </label>

         <label>
           Desgaste (R$/km)
           <CampoNumero v-model="formVeiculo.reservaDesgastePorKm" required />
         </label>
       </div>

          <label class="checkbox-linha">
            <input type="checkbox" v-model="formVeiculo.padrao" />
            <span>Definir como veículo padrão ao abrir o app</span>
          </label>

          <div class="botoes-form-veiculo">
            <button type="submit" class="btn-principal">
              {{ formVeiculo.id ? 'Atualizar Veículo' : 'Cadastrar Veículo' }}
            </button>
            <button
              v-if="formVeiculo.id"
              type="button"
              class="btn-secundario"
              @click="limparFormVeiculo"
            >
              Cancelar edição
            </button>
          </div>
        </form>
      </div>

      <hr class="divisor" />

      <div class="backup-area">
        <h3>Backup dos Dados</h3>
        <p>
          Os registros ficam salvos apenas neste aparelho. Exporte regularmente
          para não perder seu histórico.
        </p>
        <button type="button" @click="baixarBackup" class="btn-secundario">
          Exportar Backup (.json)
        </button>

        <label class="btn-secundario upload-label">
          Importar Backup (.json)
          <input
            type="file"
            accept=".json"
            @change="restaurarBackup"
            hidden
          />
        </label>
      </div>
    </main>
  </div>
</template>