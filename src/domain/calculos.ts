import type { RegistroDiario } from '../database/db';

export interface RegistroCalculado extends RegistroDiario {
  litrosGastos: number;
  valorGasolina: number;
  valorSemGasolina: number;
  reservaDesgaste: number;
  lucroReal: number;
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
  mediaLucroDia: number;
  lucroPorKm: number;
}

export function calcularLinha(registro: RegistroDiario): RegistroCalculado {
  const litrosGastos =
    registro.consumoAplicado > 0
      ? registro.kmRodados / registro.consumoAplicado
      : 0;

  const valorGasolina = litrosGastos * registro.precoGasolinaAplicado;
  const valorSemGasolina = registro.dinheiroGanho - valorGasolina;
  const reservaDesgaste = registro.kmRodados * registro.taxaDesgasteAplicada;
  const lucroReal = registro.dinheiroGanho - valorGasolina - reservaDesgaste;

  return {
    ...registro,
    litrosGastos,
    valorGasolina,
    valorSemGasolina,
    reservaDesgaste,
    lucroReal,
  };
}

export function calcularResumo(registros: RegistroCalculado[]): ResumoPeriodo {
  const totais = registros.reduce(
    (acc, item) => ({
      totalKm: acc.totalKm + item.kmRodados,
      totalGanhoBruto: acc.totalGanhoBruto + item.dinheiroGanho,
      totalLitros: acc.totalLitros + item.litrosGastos,
      totalGasolina: acc.totalGasolina + item.valorGasolina,
      totalSemGasolina: acc.totalSemGasolina + item.valorSemGasolina,
      totalDesgaste: acc.totalDesgaste + item.reservaDesgaste,
      totalLucroReal: acc.totalLucroReal + item.lucroReal,
    }),
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

  const diasTrabalhados = registros.length;
  const mediaLucroDia =
    diasTrabalhados > 0 ? totais.totalLucroReal / diasTrabalhados : 0;
  const lucroPorKm =
    totais.totalKm > 0 ? totais.totalLucroReal / totais.totalKm : 0;

  return {
    diasTrabalhados,
    ...totais,
    mediaLucroDia,
    lucroPorKm,
  };
}