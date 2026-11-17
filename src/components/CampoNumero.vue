<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: number | null | undefined;
  placeholder?: string;
  required?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
}>();

function sanitizarDecimal(bruto: string): string {
  const apenasPermitidos = bruto.replace(/[^0-9.,]/g, '');
  let resultado = '';
  let temSeparador = false;

  for (const char of apenasPermitidos) {
    if (char === '.' || char === ',') {
      if (!temSeparador) {
        if (resultado.length === 0) {
          resultado += '0';
        }
        resultado += char;
        temSeparador = true;
      }
    } else {
      resultado += char;
    }
  }

  return resultado;
}

function textoParaNumero(texto: string): number | null {
  if (!texto) return null;
  const normalizado = texto.replace(',', '.').replace(/\.$/, '');
  if (!normalizado) return null;
  const num = Number(normalizado);
  return Number.isNaN(num) ? null : num;
}

const texto = ref(
  props.modelValue !== null && props.modelValue !== undefined
    ? String(props.modelValue)
    : ''
);

watch(
  () => props.modelValue,
  (novoValor) => {
    if (novoValor === null || novoValor === undefined) {
      texto.value = '';
      return;
    }
    if (textoParaNumero(texto.value) !== novoValor) {
      texto.value = String(novoValor);
    }
  }
);

function aoDigitar(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const limpo = sanitizarDecimal(input.value);
  texto.value = limpo;
  input.value = limpo;
  emit('update:modelValue', textoParaNumero(limpo));
}
</script>

<template>
  <input
    type="text"
    inputmode="decimal"
    :value="texto"
    :placeholder="placeholder"
    :required="required"
    @input="aoDigitar"
  />
</template>