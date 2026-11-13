import { Sucursal } from "../entities/Sucursal";

export interface ICheckinAuthValidator {
  validar(apiKey: string): Promise<Sucursal | null>;
}
