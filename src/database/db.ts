import Dexie, { type EntityTable } from 'dexie';

export interface Configuracao {
  id: number; // Registro único (sempre id = 1)
  precoGasolina: number;
  consumoKmLitro: number;
  taxaDesgasteKm: number;
}

export interface RegistroDiario {
  id?: number;
  data: string; // Formato 'YYYY-MM-DD' facilita ordenar e filtrar por mês
  kmRodados: number;
  dinheiroGanho: number;
  // Salva os parâmetros vigentes no dia para não alterar o histórico no futuro
  precoGasolinaAplicado: number;
  consumoAplicado: number;
  taxaDesgasteAplicada: number;
}

class ControleGastosDB extends Dexie {
  configuracoes!: EntityTable<Configuracao, 'id'>;
  registros!: EntityTable<RegistroDiario, 'id'>;

  constructor() {
    super('ControleGastosPWA');

    this.version(1).stores({
      configuracoes: 'id',
      registros: '++id, data', // '++id' é auto-incremento; 'data' cria índice de busca
    });

    // Valores padrão extraídos da planilha Excel
    this.on('populate', () => {
      this.configuracoes.add({
        id: 1,
        precoGasolina: 6.24,  // Célula J2
        consumoKmLitro: 9,    // Fórmula =B2/9
        taxaDesgasteKm: 0.30, // Fórmula =B2*0.3
      });
    });
  }
}

export const db = new ControleGastosDB();