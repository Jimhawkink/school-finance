export type School = {
  id: string;
  name: string;
  district: string;
  county: string;
  school_type: string;
  principal_name: string;
  bom_chairperson: string;
};

export type FinancialYear = {
  id: string;
  school_id: string;
  year_label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_locked: boolean;
};

export type IncomeStatementRow = {
  id?: string;
  school_id: string;
  year_id: string;
  category: 'receipt' | 'payment';
  vote_head: string;
  description: string;
  amount: number;
  note_ref?: number;
  sort_order: number;
};

export type BudgetLine = {
  id?: string;
  school_id: string;
  year_id: string;
  section: string;
  vote_head: string;
  original_budget: number;
  adjustments: number;
  actual: number;
  sort_order: number;
};

export type NoteRow = {
  id?: string;
  school_id: string;
  year_id: string;
  note_number: number;
  row_label: string;
  current_amount: number;
  previous_amount: number;
  extra_col?: string;
  sort_order: number;
};

export type AgeingRow = {
  id?: string;
  school_id: string;
  year_id: string;
  type: 'receivable' | 'payable';
  age_band: string;
  current_fy: number;
  comparative_fy: number;
};

export type CashFlowRow = {
  id?: string;
  school_id: string;
  year_id: string;
  activity_type: 'operating_receipt' | 'operating_payment' | 'investing' | 'financing';
  description: string;
  amount: number;
  sort_order: number;
};

export type BalanceSheetRow = {
  id?: string;
  school_id: string;
  year_id: string;
  section: 'asset' | 'liability' | 'equity';
  sub_section: string;
  description: string;
  amount: number;
  note_ref?: number;
  sort_order: number;
};
