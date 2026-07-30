// Tipos compartilhados por /admin/inscritos e /admin/credenciamento. Vivem em
// arquivo próprio, e não no index da tela de inscritos, para o credenciamento
// não importar de quem o importa (ciclo).

export type Status = "PENDING" | "PAID" | "CANCELED";

export interface Registration {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: Status;
  sleep_at_monastery: number;
  pernoite_granted: number;
  is_staff: number;
  date_of_birth: string | null;
  allergy_medication_details: string | null;
  dietary_restriction_details: string | null;
  city: string | null;
  /** Baixa do credenciamento. NULL = ainda não credenciado. UTC do SQLite. */
  checked_in_at: string | null;
  /** E-mail do admin que deu a baixa. */
  checked_in_by: string | null;
}

export interface Tshirt {
  name: string;
  email: string | null;
  status: Status;
}
