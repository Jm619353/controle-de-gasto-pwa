import Dexie, { type EntityTable } from 'dexie';

export type TipoVeiculo = 'carro' | 'moto' | 'outro';

export interface Veiculo {
  id?: number;
  apelido: string;
  modelo: string;
  tipo: TipoVeiculo;
  consumoKmPorLitro: number;
  reservaDesgastePorKm: number;
  padrao: boolean;
}

export interface Configuracao {
  id?: number;
  consumoKmPorLitro: number;
  reservaDesgastePorKm: number;
  precoGasolinaPadrao?: number;
}

export interface RegistroDiario {
  id?: number;
  data: string; // Formato YYYY-MM-DD
  kmRodados: number;
  dinheiroGanho: number;
  precoGasolinaAplicado: number;
  // Snapshot do veículo usado no dia (opcional para compatibilidade com registros v1)
  veiculoId?: number;
  veiculoApelido?: string;
  veiculoModelo?: string;
  consumoAplicado?: number;
  reservaAplicada?: number;
}

class ControleDiarioDB extends Dexie {
  configuracoes!: EntityTable<Configuracao, 'id'>;
  registros!: EntityTable<RegistroDiario, 'id'>;
  veiculos!: EntityTable<Veiculo, 'id'>;

  constructor() {
    super('ControleDiarioDB');

    this.version(1).stores({
      configuracoes: '++id',
      registros: '++id, data',
    });

    this.version(2)
      .stores({
        configuracoes: '++id',
        registros: '++id, data, veiculoId',
        veiculos: '++id, padrao',
      })
      .upgrade(async (tx) => {
        const configs = await tx.table('configuracoes').toArray();
        const veiculosExistentes = await tx.table('veiculos').count();

        if (veiculosExistentes === 0) {
          const cfg = configs[0];
          await tx.table('veiculos').add({
            apelido: 'Veículo Principal',
            modelo: 'Padrão',
            tipo: 'carro',
            consumoKmPorLitro: cfg?.consumoKmPorLitro ?? 9,
            reservaDesgastePorKm: cfg?.reservaDesgastePorKm ?? 0.3,
            padrao: true,
          });
        }
      });
  }
}

export const db = new ControleDiarioDB();