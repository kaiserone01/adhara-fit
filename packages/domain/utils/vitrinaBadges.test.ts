import { describe, expect, test } from "vitest";
import { itemDePrueba } from "../entities/vitrinaItemDePrueba";
import { descuentoMostrado, precioVigenteUSD } from "./vitrinaBadges";

describe("precioVigenteUSD", () => {
  test("la oferta activa manda", () => {
    expect(precioVigenteUSD(itemDePrueba({ precioUSD: 20, ofertaUSD: 15 }))).toBe(15);
  });
  test("con la oferta apagada se usa el precio", () => {
    expect(precioVigenteUSD(itemDePrueba({ precioUSD: 20, ofertaUSD: 15, mostrarOferta: false }))).toBe(20);
  });
  test("sin oferta se usa el precio", () => {
    expect(precioVigenteUSD(itemDePrueba({ precioUSD: 20 }))).toBe(20);
  });
  test("con el precio oculto y sin oferta no hay precio vigente (no se filtra el monto)", () => {
    expect(precioVigenteUSD(itemDePrueba({ precioUSD: 20, mostrarPrecio: false }))).toBeNull();
  });
  test("sin ningún monto no hay precio vigente", () => {
    expect(precioVigenteUSD(itemDePrueba())).toBeNull();
  });
});

describe("descuentoMostrado", () => {
  test("usa el manual si existe", () => {
    expect(descuentoMostrado(itemDePrueba({ descuentoPct: 30, precioUSD: 20, ofertaUSD: 15 }))).toBe(30);
  });
  test("si no, lo calcula de precio y oferta", () => {
    expect(descuentoMostrado(itemDePrueba({ precioUSD: 20, ofertaUSD: 15 }))).toBe(25);
  });
  test("apagado no se muestra", () => {
    expect(descuentoMostrado(itemDePrueba({ descuentoPct: 30, mostrarDescuento: false }))).toBeNull();
  });
  test("sin datos o con oferta igual al precio no hay descuento", () => {
    expect(descuentoMostrado(itemDePrueba())).toBeNull();
    expect(descuentoMostrado(itemDePrueba({ precioUSD: 20, ofertaUSD: 20 }))).toBeNull();
  });
});
