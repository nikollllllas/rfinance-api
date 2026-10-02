import { CategoryType } from '../../infrastructure/drizzle/schema';

// Criadas para todo usuário novo. Pertencem ao usuário: podem ser editadas e excluídas.
export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
}> = [
  { name: 'Salário', color: '#16A34A', icon: 'Wallet', type: 'GANHO' },
  { name: 'Alimentação', color: '#F97316', icon: 'UtensilsCrossed', type: 'GASTO' },
  { name: 'Moradia', color: '#2563EB', icon: 'Home', type: 'GASTO' },
  { name: 'Transporte', color: '#F59E0B', icon: 'Car', type: 'GASTO' },
  { name: 'Saúde', color: '#DC2626', icon: 'HeartPulse', type: 'GASTO' },
  { name: 'Compras', color: '#9333EA', icon: 'ShoppingBag', type: 'GASTO' },
  { name: 'Outros', color: '#6B7280', icon: 'Tag', type: 'AMBOS' },
];
