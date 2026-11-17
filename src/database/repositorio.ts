import {
  db,
  type Configuracao,
  type RegistroDiario,
  type Veiculo,
} from './db';

export async function obterConfiguracao(): Promise<Configuracao> {
  const configs = await db.configuracoes.toArray();
  if (configs.length > 0) {
    return configs[0];
  }

  const padrao: Configuracao = {
    consumoKmPorLitro: 9,
    reservaDesgastePorKm: 0.3,
    precoGasolinaPadrao: 6.24,
  };
  const id = await db.configuracoes.add(padrao);
  return { ...padrao, id };
}

export async function atualizarConfiguracao(
  dados: Partial<Configuracao>
): Promise<void> {
  const atual = await obterConfiguracao();
  if (atual.id) {
    await db.configuracoes.update(atual.id, dados);
  }
}

export async function listarVeiculos(): Promise<Veiculo[]> {
  const lista = await db.veiculos.toArray();
  if (lista.length > 0) {
    return lista.sort((a, b) => Number(b.padrao) - Number(a.padrao));
  }

  // Garante pelo menos um veículo inicial em instalações novas
  const cfg = await obterConfiguracao();
  const inicial: Veiculo = {
    apelido: 'Veículo Principal',
    modelo: 'Carro Padrão',
    tipo: 'carro',
    consumoKmPorLitro: cfg.consumoKmPorLitro,
    reservaDesgastePorKm: cfg.reservaDesgastePorKm,
    padrao: true,
  };
  const id = await db.veiculos.add(inicial);
  return [{ ...inicial, id }];
}

export async function salvarVeiculo(veiculo: Veiculo): Promise<number> {
  const todos = await db.veiculos.toArray();
  const deveSerPadrao = veiculo.padrao || todos.length === 0;

  if (deveSerPadrao) {
    for (const v of todos) {
      if (v.id && v.padrao) {
        await db.veiculos.update(v.id, { padrao: false });
      }
    }
  }

  const dadosLimpos: Veiculo = {
    apelido: veiculo.apelido.trim(),
    modelo: veiculo.modelo.trim(),
    tipo: veiculo.tipo,
    consumoKmPorLitro: Number(veiculo.consumoKmPorLitro),
    reservaDesgastePorKm: Number(veiculo.reservaDesgastePorKm),
    padrao: deveSerPadrao,
  };

  if (veiculo.id) {
    await db.veiculos.update(veiculo.id, dadosLimpos);
    return veiculo.id;
  }

  const novoId = await db.veiculos.add(dadosLimpos);
  return Number(novoId);
}

export async function definirVeiculoPadrao(id: number): Promise<void> {
  const todos = await db.veiculos.toArray();
  for (const v of todos) {
    if (v.id) {
      await db.veiculos.update(v.id, { padrao: v.id === id });
    }
  }
}

export async function excluirVeiculo(id: number): Promise<boolean> {
  const todos = await db.veiculos.toArray();
  if (todos.length <= 1) {
    return false; // Mantém sempre ao menos 1 veículo cadastrado
  }

  const alvo = todos.find((v) => v.id === id);
  await db.veiculos.delete(id);

  if (alvo?.padrao) {
    const restante = todos.find((v) => v.id !== id);
    if (restante?.id) {
      await db.veiculos.update(restante.id, { padrao: true });
    }
  }
  return true;
}

export async function adicionarRegistro(
  registro: Omit<RegistroDiario, 'id'>
): Promise<number> {
  const novoId = await db.registros.add(registro);
  return Number(novoId);
}

export async function listarRegistrosPorMes(
  anoMes: string
): Promise<RegistroDiario[]> {
  return await db.registros
    .where('data')
    .startsWith(anoMes)
    .reverse()
    .sortBy('data');
}

export async function listarRegistrosPorPeriodo(
  dataInicio: string,
  dataFim: string
): Promise<RegistroDiario[]> {
  return await db.registros
    .where('data')
    .between(dataInicio, dataFim, true, true)
    .reverse()
    .sortBy('data');
}

export async function atualizarDataRegistro(
  id: number,
  novaData: string
): Promise<void> {
  await db.registros.update(id, { data: novaData });
}

export async function excluirRegistro(id: number): Promise<void> {
  await db.registros.delete(id);
}

export async function exportarBackupJSON(): Promise<string> {
  const configuracoes = await db.configuracoes.toArray();
  const veiculos = await db.veiculos.toArray();
  const registros = await db.registros.toArray();
  return JSON.stringify(
    {
      versao: 2,
      exportadoEm: new Date().toISOString(),
      configuracoes,
      veiculos,
      registros,
    },
    null,
    2
  );
}

export async function importarBackupJSON(conteudoJson: string): Promise<void> {
  const dados = JSON.parse(conteudoJson);
  if (!Array.isArray(dados.registros)) {
    throw new Error('Arquivo de backup inválido.');
  }

  await db.transaction(
    'rw',
    db.configuracoes,
    db.veiculos,
    db.registros,
    async () => {
      await db.registros.clear();
      await db.registros.bulkAdd(dados.registros);

      if (Array.isArray(dados.configuracoes) && dados.configuracoes.length > 0) {
        await db.configuracoes.clear();
        await db.configuracoes.bulkAdd(dados.configuracoes);
      }

      if (Array.isArray(dados.veiculos) && dados.veiculos.length > 0) {
        await db.veiculos.clear();
        await db.veiculos.bulkAdd(dados.veiculos);
      }
    }
  );
}