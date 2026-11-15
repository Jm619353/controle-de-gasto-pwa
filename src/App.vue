<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import CampoDataBR from './components/CampoDataBR.vue';
import {
 obterConfiguracao,
  atualizarConfiguracao,
  adicionarRegistro,
  listarRegistrosPorMes,
  listarRegistrosPorPeriodo,
  atualizarDataRegistro,
  excluirRegistro,
  exportarBackupJSON,
  importarBackupJSON,
} from './database/repositorio';
import { calcularResumo, type RegistroCalculado } from './domain/calculos';

const editandoId = ref<number | null>(null);
const dataEdicaoTextoBR = ref('');
const dataEdicaoISO = ref('');

function aplicarMascaraDataBR(valorBruto: string): string {
  const digitos = valorBruto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length > 4) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
  }
  if (digitos.length > 2) {
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }
  return digitos;
}

function converterBRParaISO(textoBR: string): string {
  const digitos = textoBR.replace(/\D/g, '');
  if (digitos.length !== 8) return '';

  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4, 8));
  const dataObj = new Date(ano, mes - 1, dia);

  const valida =
    dataObj.getFullYear() === ano &&
    dataObj.getMonth() === mes - 1 &&
    dataObj.getDate() === dia;

  if (!valida) return '';
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function iniciarEdicaoData(item: RegistroCalculado) {
  if (!item.id) return;
  editandoId.value = item.id;
  dataEdicaoISO.value = item.data;
  dataEdicaoTextoBR.value = formatarDataBR(item.data);
}

function cancelarEdicaoData() {
  editandoId.value = null;
  dataEdicaoTextoBR.value = '';
  dataEdicaoISO.value = '';
}

function aoDigitarDataEdicao(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const formatado = aplicarMascaraDataBR(input.value);
  dataEdicaoTextoBR.value = formatado;
  input.value = formatado;
  dataEdicaoISO.value = converterBRParaISO(formatado);
}

function aoEscolherDataEdicaoCalendario(evento: Event) {
  const valorISO = (evento.target as HTMLInputElement).value;
  if (valorISO) {
    dataEdicaoISO.value = valorISO;
    dataEdicaoTextoBR.value = formatarDataBR(valorISO);
  }
}

async function salvarEdicaoData(id?: number) {
  if (!id) return;
  if (!dataEdicaoISO.value) {
    exibirAviso('Informe uma data válida no formato dd/mm/aaaa.');
    return;
  }

  await atualizarDataRegistro(id, dataEdicaoISO.value);
  // Atualiza o filtro do topo para acompanhar o mês da nova data
  mesSelecionado.value = dataEdicaoISO.value.slice(0, 7);
  cancelarEdicaoData();
  await carregarDados();
  exibirAviso('Data alterada com sucesso!');
}

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function obterDataLocal(): string {
  return formatarDataISO(new Date());
}

function subtrairDias(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return formatarDataISO(data);
}

type Aba = 'lancar' | 'historico' | 'relatorios' | 'ajustes';
type PresetsPeriodo = '7d' | '15d' | '30d' | '6m' | '1a' | 'custom';

const abaAtiva = ref<Aba>('lancar');
const mesSelecionado = ref(obterDataLocal().slice(0, 7));
const registros = ref<RegistroCalculado[]>([]);
const mensagem = ref('');

// Campos do formulário diário
const dataForm = ref(obterDataLocal());
const kmForm = ref<number | null>(null);
const ganhoForm = ref<number | null>(null);
const gasolinaForm = ref<number>(6.24);

// Campos de configuração
const precoGasolina = ref(6.24);
const consumoKmLitro = ref(9);
const taxaDesgasteKm = ref(0.30);

// Estados da aba Relatórios
const presetAtivo = ref<PresetsPeriodo>('7d');
const relatorioInicio = ref(subtrairDias(6));
const relatorioFim = ref(obterDataLocal());
const registrosRelatorio = ref<RegistroCalculado[]>([]);

const resumo = computed(() => calcularResumo(registros.value));
const resumoRelatorio = computed(() => calcularResumo(registrosRelatorio.value));

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

function exibirAviso(texto: string) {
  mensagem.value = texto;
  setTimeout(() => {
    mensagem.value = '';
  }, 3000);
}

async function carregarDados() {
  const config = await obterConfiguracao();
  precoGasolina.value = config.precoGasolina;
  gasolinaForm.value = config.precoGasolina;
  consumoKmLitro.value = config.consumoKmLitro;
  taxaDesgasteKm.value = config.taxaDesgasteKm;

  registros.value = await listarRegistrosPorMes(mesSelecionado.value);
  await carregarRelatorio();
}

async function carregarRelatorio() {
  if (!relatorioInicio.value || !relatorioFim.value) return;
  const inicio =
    relatorioInicio.value <= relatorioFim.value
      ? relatorioInicio.value
      : relatorioFim.value;
  const fim =
    relatorioInicio.value <= relatorioFim.value
      ? relatorioFim.value
      : relatorioInicio.value;

  registrosRelatorio.value = await listarRegistrosPorPeriodo(inicio, fim);
}

function aplicarPreset(preset: PresetsPeriodo) {
  presetAtivo.value = preset;
  const hoje = new Date();
  relatorioFim.value = formatarDataISO(hoje);

  if (preset === '7d') {
    relatorioInicio.value = subtrairDias(6);
  } else if (preset === '15d') {
    relatorioInicio.value = subtrairDias(14);
  } else if (preset === '30d') {
    relatorioInicio.value = subtrairDias(29);
  } else if (preset === '6m') {
    const seisMeses = new Date(hoje.getFullYear(), hoje.getMonth() - 6, hoje.getDate());
    relatorioInicio.value = formatarDataISO(seisMeses);
  } else if (preset === '1a') {
    const umAno = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
    relatorioInicio.value = formatarDataISO(umAno);
  }
}

async function salvarLancamento() {
  if (!dataForm.value) {
    exibirAviso('Informe uma data válida no formato dd/mm/aaaa.');
    return;
  }

  if (!kmForm.value || !ganhoForm.value || kmForm.value <= 0) {
    exibirAviso('Preencha os quilômetros e o valor ganho.');
    return;
  }

  await adicionarRegistro({
    data: dataForm.value,
    kmRodados: Number(kmForm.value),
    dinheiroGanho: Number(ganhoForm.value),
    precoGasolina: Number(gasolinaForm.value),
  });

  kmForm.value = null;
  ganhoForm.value = null;
  mesSelecionado.value = dataForm.value.slice(0, 7);
  await carregarDados();
  exibirAviso('Dia registrado com sucesso!');
}

async function removerItem(id?: number) {
  if (!id) return;
  await excluirRegistro(id);
  await carregarDados();
  exibirAviso('Registro excluído.');
}

async function salvarAjustes() {
  await atualizarConfiguracao({
    precoGasolina: Number(precoGasolina.value),
    consumoKmLitro: Number(consumoKmLitro.value),
    taxaDesgasteKm: Number(taxaDesgasteKm.value),
  });
  gasolinaForm.value = Number(precoGasolina.value);
  exibirAviso('Parâmetros atualizados!');
}

async function baixarBackup() {
  const json = await exportarBackupJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-gastos-${obterDataLocal()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function restaurarBackup(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const arquivo = input.files?.[0];
  if (!arquivo) return;

  try {
    const conteudo = await arquivo.text();
    await importarBackupJSON(conteudo);
    await carregarDados();
    exibirAviso('Backup restaurado com sucesso!');
  } catch {
    exibirAviso('Erro: arquivo de backup inválido.');
  } finally {
    input.value = '';
  }
}

watch(mesSelecionado, carregarDados);
watch([relatorioInicio, relatorioFim], carregarRelatorio);
onMounted(carregarDados);
</script>

<template>
  <div class="app-container">
    <header class="topo">
      <h1>Controle Diário</h1>
      <input type="month" v-model="mesSelecionado" class="seletor-mes" />
    </header>

    <div v-if="mensagem" class="aviso">{{ mensagem }}</div>

    <!-- Cards de Resumo do Mês -->
    <section class="grid-resumo">
      <div class="card destaque">
        <span>Lucro Real</span>
        <strong>{{ formatarMoeda(resumo.totalLucroReal) }}</strong>
      </div>
      <div class="card">
        <span>Ganho Bruto</span>
        <strong>{{ formatarMoeda(resumo.totalGanhoBruto) }}</strong>
      </div>
      <div class="card">
        <span>Gasolina ({{ resumo.totalLitros.toFixed(1) }} L)</span>
        <strong class="negativo">- {{ formatarMoeda(resumo.totalGasolina) }}</strong>
      </div>
      <div class="card">
        <span>Reserva Desgaste</span>
        <strong class="negativo">- {{ formatarMoeda(resumo.totalDesgaste) }}</strong>
      </div>
    </section>

    <!-- Navegação por Abas -->
    <nav class="abas">
      <button :class="{ ativo: abaAtiva === 'lancar' }" @click="abaAtiva = 'lancar'">
        Lançar
      </button>
      <button :class="{ ativo: abaAtiva === 'historico' }" @click="abaAtiva = 'historico'">
        Histórico ({{ registros.length }})
      </button>
      <button :class="{ ativo: abaAtiva === 'relatorios' }" @click="abaAtiva = 'relatorios'">
        Relatórios
      </button>
      <button :class="{ ativo: abaAtiva === 'ajustes' }" @click="abaAtiva = 'ajustes'">
        Ajustes
      </button>
    </nav>

    <!-- ABA 1: Novo Lançamento -->
    <main v-if="abaAtiva === 'lancar'" class="painel">
      <form @submit.prevent="salvarLancamento" class="formulario">
        <label>
       Data
       <CampoDataBR v-model="dataForm" required />
     </label>

        <label>
          KM Rodados
          <input
            type="number"
            step="0.1"
            inputmode="decimal"
            placeholder="Ex: 136.6"
            v-model.number="kmForm"
            required
          />
        </label>

        <label>
          Dinheiro Ganho (R$)
          <input
            type="number"
            step="0.01"
            inputmode="decimal"
            placeholder="Ex: 252.17"
            v-model.number="ganhoForm"
            required
          />
        </label>

        <label>
          Preço da Gasolina Hoje (R$/L)
          <input
            type="number"
            step="0.01"
            inputmode="decimal"
            v-model.number="gasolinaForm"
            required
          />
        </label>

        <button type="submit" class="btn-primario">Salvar Dia</button>
      </form>
    </main>

    <!-- ABA 2: Histórico -->
    <main v-else-if="abaAtiva === 'historico'" class="painel">
      <p v-if="registros.length === 0" class="vazio">
        Nenhum registro encontrado para este mês.
      </p>

      <div v-for="item in registros" :key="item.id" class="item-historico">
        <div class="item-topo">
          <strong>{{ formatarDataBR(item.data) }} — {{ item.kmRodados }} km</strong>
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
          <div class="campo-data-wrapper">
            <input
              type="text"
              inputmode="numeric"
              maxlength="10"
              placeholder="dd/mm/aaaa"
              :value="dataEdicaoTextoBR"
              @input="aoDigitarDataEdicao"
            />
            <span class="icone-calendario" aria-hidden="true">📅</span>
            <input
              type="date"
              :value="dataEdicaoISO"
              @change="aoEscolherDataEdicaoCalendario"
              class="input-date-oculto"
              aria-label="Selecionar nova data"
            />
          </div>
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
            Gasolina ({{ formatarMoeda(item.precoGasolinaAplicado) }}/L): -{{ formatarMoeda(item.valorGasolina) }}
          </span>
          <span>Sem gasolina: {{ formatarMoeda(item.valorSemGasolina) }}</span>
          <span>Desgaste: -{{ formatarMoeda(item.reservaDesgaste) }}</span>
          <strong class="lucro-item">Lucro: {{ formatarMoeda(item.lucroReal) }}</strong>
        </div>
      </div>
    </main>

    <!-- ABA 3: Relatórios por Período -->
    <main v-else-if="abaAtiva === 'relatorios'" class="painel">
      <div class="presets-grid">
        <button
          type="button"
          :class="{ ativo: presetAtivo === '7d' }"
          @click="aplicarPreset('7d')"
        >
          7 dias
        </button>
        <button
          type="button"
          :class="{ ativo: presetAtivo === '15d' }"
          @click="aplicarPreset('15d')"
        >
          15 dias
        </button>
        <button
          type="button"
          :class="{ ativo: presetAtivo === '30d' }"
          @click="aplicarPreset('30d')"
        >
          1 mês
        </button>
        <button
          type="button"
          :class="{ ativo: presetAtivo === '6m' }"
          @click="aplicarPreset('6m')"
        >
          6 meses
        </button>
        <button
          type="button"
          :class="{ ativo: presetAtivo === '1a' }"
          @click="aplicarPreset('1a')"
        >
          1 ano
        </button>
        <button
          type="button"
          :class="{ ativo: presetAtivo === 'custom' }"
          @click="presetAtivo = 'custom'"
        >
          Data exata
        </button>
      </div>

      <div class="datas-custom">
        <label>
          De
          <input
            type="date"
            v-model="relatorioInicio"
            @input="presetAtivo = 'custom'"
          />
        </label>
        <label>
          Até
          <input
            type="date"
            v-model="relatorioFim"
            @input="presetAtivo = 'custom'"
          />
        </label>
      </div>

      <div class="relatorio-bloco">
        <div class="relatorio-cabecalho">
          <span>
            {{ formatarDataBR(relatorioInicio) }} até {{ formatarDataBR(relatorioFim) }}
          </span>
          <strong>{{ resumoRelatorio.diasTrabalhados }} dia(s)</strong>
        </div>

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
          <strong class="negativo">- {{ formatarMoeda(resumoRelatorio.totalGasolina) }}</strong>
        </div>
        <div class="relatorio-linha">
          <span>Faturamento bruto</span>
          <strong>{{ formatarMoeda(resumoRelatorio.totalGanhoBruto) }}</strong>
        </div>
        <div class="relatorio-linha">
          <span>Combustível ({{ resumoRelatorio.totalLitros.toFixed(1) }} L)</span>
          <strong class="negativo">- {{ formatarMoeda(resumoRelatorio.totalGasolina) }}</strong>
        </div>
        <div class="relatorio-linha">
          <span>Valor sem gasolina</span>
          <strong>{{ formatarMoeda(resumoRelatorio.totalSemGasolina) }}</strong>
        </div>
        <div class="relatorio-linha">
          <span>Reserva de desgaste</span>
          <strong class="negativo">- {{ formatarMoeda(resumoRelatorio.totalDesgaste) }}</strong>
        </div>
        <div class="relatorio-linha total">
          <span>Lucro líquido no período</span>
          <strong class="lucro-item">{{ formatarMoeda(resumoRelatorio.totalLucroReal) }}</strong>
        </div>

        <div class="relatorio-medias">
          <div class="card">
            <span>Média Lucro / Dia</span>
            <strong>{{ formatarMoeda(resumoRelatorio.mediaLucroDia) }}</strong>
          </div>
          <div class="card">
            <span>Lucro Líquido / KM</span>
            <strong>{{ formatarMoeda(resumoRelatorio.lucroPorKm) }}</strong>
          </div>
        </div>
      </div>
    </main>

    <!-- ABA 4: Ajustes e Backup -->
    <main v-else class="painel">
      <form @submit.prevent="salvarAjustes" class="formulario">
        <label>
          Preço Padrão da Gasolina (R$/L)
          <input type="number" step="0.01" inputmode="decimal" v-model.number="precoGasolina" />
        </label>

        <label>
          Consumo do Veículo (km/L)
          <input type="number" step="0.1" inputmode="decimal" v-model.number="consumoKmLitro" />
        </label>

        <label>
          Reserva de Desgaste (R$/km)
          <input type="number" step="0.01" inputmode="decimal" v-model.number="taxaDesgasteKm" />
        </label>

        <button type="submit" class="btn-primario">Atualizar Parâmetros</button>
      </form>

      <hr class="divisor" />

      <div class="backup-area">
        <h3>Backup (Celular / PC)</h3>
        <button @click="baixarBackup" class="btn-secundario">Exportar Dados (.json)</button>
        <label class="btn-secundario upload-label">
          Importar Backup (.json)
          <input type="file" accept=".json" @change="restaurarBackup" hidden />
        </label>
      </div>
    </main>
  </div>
</template>