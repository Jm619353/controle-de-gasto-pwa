import type { Configuracao, RegistroDiario } from '../database/db';

export interface RegistroCalculado extends RegistroDiario {
  litrosGastos: number;
  valorGasolina: number;
  valorSemGasolina: number;
  reservaDesgaste: number;
  lucroReal: number;
  consumoUsado: number;
  reservaUsada: number;
}

export interface ResumoPeriodo {
  diasTrabalhados: number;
  totalKm: number;
  totalGanhoBruto: number;
  totalLitros: number;
  totalGasolina: number;
  totalSemGasolina: number;
  totalDesgaste: number;
  totalLucroReal: number;
  mediaLucroPorDia: number;
  lucroPorKm: number;
}

export function calcularRegistro(
  registro: RegistroDiario,
  configFallback: Configuracao
): RegistroCalculado {
  const consumoUsado =
    registro.consumoAplicado && registro.consumoAplicado > 0
      ? registro.consumoAplicado
      : configFallback.consumoKmPorLitro || 9;

  const reservaUsada =
    registro.reservaAplicada !== undefined && registro.reservaAplicada >= 0
      ? registro.reservaAplicada
      : configFallback.reservaDesgastePorKm ?? 0.3;

  const litrosGastos = registro.kmRodados / consumoUsado;
  const valorGasolina = litrosGastos * registro.precoGasolinaAplicado;
  const valorSemGasolina = registro.dinheiroGanho - valorGasolina;
  const reservaDesgaste = registro.kmRodados * reservaUsada;
  const lucroReal = valorSemGasolina - reservaDesgaste;

  return {
    ...registro,
    litrosGastos,
    valorGasolina,
    valorSemGasolina,
    reservaDesgaste,
    lucroReal,
    consumoUsado,
    reservaUsada,
  };
}

export function consolidarPeriodo(
  registros: RegistroCalculado[]
): ResumoPeriodo {
  const diasUnicos = new Set(registros.map((r) => r.data)).size;

  const totais = registros.reduce(
    (acc, item) => {
      acc.totalKm += item.kmRodados;
      acc.totalGanhoBruto += item.dinheiroGanho;
      acc.totalLitros += item.litrosGastos;
      acc.totalGasolina += item.valorGasolina;
      acc.totalSemGasolina += item.valorSemGasolina;
      acc.totalDesgaste += item.reservaDesgaste;
      acc.totalLucroReal += item.lucroReal;
      return acc;
    },
    {
      totalKm: 0,
      totalGanhoBruto: 0,
      totalLitros: 0,
      totalGasolina: 0,
      totalSemGasolina: 0,
      totalDesgaste: 0,
      totalLucroReal: 0,
    }
  );

  return {
    diasTrabalhados: diasUnicos,
    ...totais,
    mediaLucroPorDia: diasUnicos > 0 ? totais.totalLucroReal / diasUnicos : 0,
    lucroPorKm: totais.totalKm > 0 ? totais.totalLucroReal / totais.totalKm : 0,
  };
}