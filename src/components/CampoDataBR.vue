<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  modelValue: string; // Formato ISO 'YYYY-MM-DD' ou ''
  required?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();


function isoParaBR(iso: string): string {
  if (!iso || !iso.includes('-')) return '';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
}

function brParaISO(textoBR: string): string {
  const partes = textoBR.split('/');
  if (partes.length !== 3) return '';

  const [diaStr, mesStr, anoStr] = partes;
  if (!diaStr || !mesStr || !anoStr) return '';
  if (diaStr.length !== 2 || mesStr.length !== 2 || anoStr.length !== 4) return '';

  const dia = Number(diaStr);
  const mes = Number(mesStr);
  const ano = Number(anoStr);
  const dataObj = new Date(ano, mes - 1, dia);

  const valida =
    dataObj.getFullYear() === ano &&
    dataObj.getMonth() === mes - 1 &&
    dataObj.getDate() === dia;

  if (!valida) return '';
  return `${anoStr}-${mesStr}-${diaStr}`;
}

function obterHojeISO(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

const textoBR = ref(isoParaBR(props.modelValue));

watch(
  () => props.modelValue,
  (novoISO) => {
    if (novoISO && novoISO !== brParaISO(textoBR.value)) {
      textoBR.value = isoParaBR(novoISO);
    }
  }
);

function processarEdicao(
  valorAnterior: string,
  valorBruto: string,
  cursorBruto: number,
  apagando: boolean
): { formatado: string; novoCursor: number } {
  // Caso 1: Sem barras (digitando do zero, colando '14112026' ou após selecionar tudo)
  if (!valorBruto.includes('/')) {
    const digitos = valorBruto.replace(/\D/g, '').slice(0, 8);
    if (digitos.length === 0) return { formatado: '', novoCursor: 0 };
    if (digitos.length === 1) return { formatado: digitos, novoCursor: 1 };
    if (digitos.length === 2) {
      if (!apagando && valorAnterior.length < 2) {
        return { formatado: `${digitos}/`, novoCursor: 3 };
      }
      return { formatado: digitos, novoCursor: 2 };
    }
    if (digitos.length === 3) {
      return { formatado: `${digitos.slice(0, 2)}/${digitos[2]}`, novoCursor: 4 };
    }
    if (digitos.length === 4) {
      if (!apagando && valorAnterior.length < 5) {
        return { formatado: `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/`, novoCursor: 6 };
      }
      return { formatado: `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}`, novoCursor: 5 };
    }

    const formatado = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4, 8)}`;
    const digitosAntes = valorBruto.slice(0, cursorBruto).replace(/\D/g, '').length;
    let novoCursor = digitosAntes;
    if (digitosAntes > 4) novoCursor += 2;
    else if (digitosAntes > 2) novoCursor += 1;

    return { formatado, novoCursor: Math.min(novoCursor, formatado.length) };
  }

  // Caso 2: Barras já existem — preserva dia, mês e ano isolados
  const partes = valorBruto.split('/');
  const ddBruto = partes[0] ?? '';
  const mmBruto = partes[1] ?? '';
  const aaaaBruto = partes.slice(2).join('');
  let temSegundaBarra = partes.length >= 3;

  const dd = ddBruto.replace(/\D/g, '').slice(0, 2);
  const mm = mmBruto.replace(/\D/g, '').slice(0, 2);
  const aaaa = aaaaBruto.replace(/\D/g, '').slice(0, 4);

  const primeiraBarra = valorBruto.indexOf('/');
  const segundaBarra = valorBruto.indexOf('/', primeiraBarra + 1);

  if (!temSegundaBarra && mm.length === 2 && !apagando && cursorBruto >= primeiraBarra + 1 + mmBruto.length) {
    temSegundaBarra = true;
  }

  const formatado = temSegundaBarra ? `${dd}/${mm}/${aaaa}` : `${dd}/${mm}`;
  let novoCursor = 0;

  if (primeiraBarra === -1 || cursorBruto <= primeiraBarra) {
    // Cursor no bloco do DIA
    const digitosDiaAntes = valorBruto.slice(0, cursorBruto).replace(/\D/g, '').length;
    novoCursor = Math.min(digitosDiaAntes, dd.length);
    if (!apagando && dd.length === 2 && novoCursor === 2 && ddBruto.length >= 2) {
      novoCursor = 3; // Pula automaticamente para depois da primeira '/'
    }
  } else if (segundaBarra === -1 || cursorBruto <= segundaBarra) {
    // Cursor no bloco do MÊS
    const trechoMes = valorBruto.slice(primeiraBarra + 1, cursorBruto);
    const digitosMesAntes = trechoMes.replace(/\D/g, '').length;
    novoCursor = dd.length + 1 + Math.min(digitosMesAntes, mm.length);
    if (!apagando && mm.length === 2 && digitosMesAntes >= 2 && temSegundaBarra) {
      novoCursor = dd.length + 1 + mm.length + 1; // Pula automaticamente para depois da segunda '/'
    }
  } else {
    // Cursor no bloco do ANO
    const trechoAno = valorBruto.slice(segundaBarra + 1, cursorBruto);
    const digitosAnoAntes = trechoAno.replace(/\D/g, '').length;
    novoCursor = dd.length + 1 + mm.length + 1 + Math.min(digitosAnoAntes, aaaa.length);
  }

  return { formatado, novoCursor: Math.min(novoCursor, formatado.length) };
}

async function aoDigitar(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const inputEvent = evento as InputEvent;
  const apagando = inputEvent.inputType?.startsWith('delete') ?? false;
  const cursorAtual = input.selectionStart ?? input.value.length;

  const { formatado, novoCursor } = processarEdicao(
    textoBR.value,
    input.value,
    cursorAtual,
    apagando
  );

  textoBR.value = formatado;
  input.value = formatado;
  emit('update:modelValue', brParaISO(formatado));

  await nextTick();
  input.setSelectionRange(novoCursor, novoCursor);
}

async function aoPressionarTecla(evento: KeyboardEvent) {
  if (evento.key !== 'Backspace') return;
  const input = evento.target as HTMLInputElement;
  const inicio = input.selectionStart ?? 0;
  const fim = input.selectionEnd ?? 0;

  // Se o cursor estiver logo depois de uma '/' no meio da data, apaga o dígito anterior sem quebrar a barra
  if (inicio === fim && inicio > 0 && textoBR.value[inicio - 1] === '/' && inicio < textoBR.value.length) {
    evento.preventDefault();
    const novoTexto = textoBR.value.slice(0, inicio - 2) + textoBR.value.slice(inicio - 1);
    const novoCursor = Math.max(0, inicio - 2);

    textoBR.value = novoTexto;
    input.value = novoTexto;
    emit('update:modelValue', brParaISO(novoTexto));

    await nextTick();
    input.setSelectionRange(novoCursor, novoCursor);
  }
}

function aoEscolherCalendario(evento: Event) {
  const valorISO = (evento.target as HTMLInputElement).value;
  if (valorISO) {
    textoBR.value = isoParaBR(valorISO);
    emit('update:modelValue', valorISO);
  }
}

function abrirSeletorNativo(evento: Event) {
  const input = evento.target as HTMLInputElement;
  try {
    input.showPicker?.();
  } catch {
    // No celular (Android/iOS), o toque no input[type="date"] já abre o calendário nativo automaticamente
  }
}
</script>

<template>
  <div class="campo-data-wrapper">
    <input
      ref="inputTextoRef"
      type="text"
      inputmode="numeric"
      maxlength="10"
      placeholder="dd/mm/aaaa"
      :value="textoBR"
      :required="required"
      @input="aoDigitar"
      @keydown="aoPressionarTecla"
    />
    <span class="icone-calendario" aria-hidden="true">📅</span>
    <input
      type="date"
      :value="modelValue || obterHojeISO()"
      @change="aoEscolherCalendario"
      @click="abrirSeletorNativo"
      class="input-date-oculto"
      aria-label="Abrir calendário"
    />
  </div>
</template>

<style scoped>
.campo-data-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.campo-data-wrapper input[type='text'] {
  width: 100%;
  background: #222222;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 12px 44px 12px 12px;
  border-radius: 8px;
  font-size: 1rem;
}

.icone-calendario {
  position: absolute;
  right: 12px;
  pointer-events: none;
  font-size: 1.1rem;
}

.input-date-oculto {
  position: absolute;
  right: 0;
  top: 0;
  width: 44px;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}
</style>