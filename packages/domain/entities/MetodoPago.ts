// Billetera digital: Yape, Plin u otra (el nombre va en nombreBanco).
export type TipoMetodoPago = "EFECTIVO" | "BILLETERA_DIGITAL" | "TARJETA" | "TRANSFERENCIA" | "DEPOSITO";

export interface MetodoPago {
  id: string;
  organizacionId: string;
  tipo: TipoMetodoPago;
  nombreBanco: string | null;
  logoUrl: string | null;
  activo: boolean;
  orden: number;
  telefono: string | null;
  numeroCuenta: string | null;
  beneficiario: string | null;
  qrUrl: string | null;
  createdAt: Date;
}

export interface DatosNuevoMetodoPago {
  organizacionId: string;
  tipo: TipoMetodoPago;
  nombreBanco: string | null;
  logoUrl: string | null;
  orden?: number;
  telefono?: string | null;
  numeroCuenta?: string | null;
  beneficiario?: string | null;
  qrUrl?: string | null;
}

export interface CambiosMetodoPago {
  nombreBanco?: string | null;
  logoUrl?: string | null;
  activo?: boolean;
  orden?: number;
  telefono?: string | null;
  numeroCuenta?: string | null;
  beneficiario?: string | null;
  qrUrl?: string | null;
}
