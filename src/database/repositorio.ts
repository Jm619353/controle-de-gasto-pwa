import { db, type Configuracao } from './db';
import { calcularLinha, type RegistroCalculado } from '../domain/calculos';

const CONFIG_PADRAO: Configuracao = {
  id: 1,
  precoGasolina: 6.24,
  consumoKmLitro: 9,
  taxaDesgasteKm: 0.30,
};

export async function obterConfiguracao(): Promise<Configuracao> {
  const config = await db.configuracoes.get(1);
  return config ?? CONFIG_PADRAO;
}

export async function atualizarConfiguracao(
  dados: Omit<Configuracao, 'id'>
): Promise<void> {
  await db.configuracoes.put({ id: 1, ...dados });
}

export async function adicionarRegistro(entrada: {
  data: string;
  kmRodados: number;
  dinheiroGanho: number;
  precoGasolina?: number;
}): Promise<number | undefined> {
  const config = await obterConfiguracao();
  const precoAplicado = entrada.precoGasolina ?? config.precoGasolina;

  // Se o preço da gasolina mudou no lançamento, atualiza o padrão para os próximos dias
  if (precoAplicado !== config.precoGasolina) {
    await atualizarConfiguracao({
      precoGasolina: precoAplicado,
      consumoKmLitro: config.consumoKmLitro,
      taxaDesgasteKm: config.taxaDesgasteKm,
    });
  }

  return await db.registros.add({
    data: entrada.data,
    kmRodados: entrada.kmRodados,
    dinheiroGanho: entrada.dinheiroGanho,
    precoGasolinaAplicado: precoAplicado,
    consumoAplicado: config.consumoKmLitro,
    taxaDesgasteAplicada: config.taxaDesgasteKm,
  });
}

export async function listarRegistrosPorMes(
  anoMes: string
): Promise<RegistroCalculado[]> {
  const lista = await db.registros
    .where('data')
    .startsWith(anoMes)
    .reverse()
    .toArray();

  return lista.map(calcularLinha);
}

export async function listarRegistrosPorPeriodo(
  dataInicio: string,
  dataFim: string
): Promise<RegistroCalculado[]> {
  const lista = await db.registros
    .where('data')
    .between(dataInicio, dataFim, true, true)
    .reverse()
    .toArray();

  return lista.map(calcularLinha);
}

export async function excluirRegistro(id: number): Promise<void> {
  await db.registros.delete(id);
}

export async function exportarBackupJSON(): Promise<string> {
  const configuracoes = await db.configuracoes.toArray();
  const registros = await db.registros.toArray();

  return JSON.stringify(
    {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      configuracoes,
      registros,
    },
    null,
    2
  );
}

export async function importarBackupJSON(conteudoJson: string): Promise<void> {
  const dados = JSON.parse(conteudoJson);

  if (!Array.isArray(dados.registros) || !Array.isArray(dados.configuracoes)) {
    throw new Error('Arquivo de backup inválido.');
  }

  await db.transaction('rw', db.configuracoes, db.registros, async () => {
    await db.configuracoes.clear();
    await db.registros.clear();

    if (dados.configuracoes.length > 0) {
      await db.configuracoes.bulkAdd(dados.configuracoes);
    }
    if (dados.registros.length > 0) {
      await db.registros.bulkAdd(dados.registros);
    }
  });
}

export async function atualizarDataRegistro(
  id: number,
  novaData: string
): Promise<void> {
  await db.registros.update(id, { data: novaData });
}