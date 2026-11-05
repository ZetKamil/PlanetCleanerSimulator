/**
 * BuildingEntity.ts - Centralny moduł infrastruktury budowlanej
 * Re-eksportuje modułowe klasy polimorficzne z podkatalogu ./buildings/
 */

export * from './buildings/BaseBuildingEntity';
export * from './buildings/BuildingConfigs';
export * from './buildings/ConveyorBuildings';
export * from './buildings/ProductionBuildings';
export * from './buildings/PowerBuildings';
export * from './buildings/DefenseBuildings';
export * from './buildings/FluidBuildings';
export * from './buildings/BuildingFactory';

import { BaseBuildingEntity } from './buildings/BaseBuildingEntity';
// Alias dla zgodności wstecznej
export type BuildingEntity = BaseBuildingEntity;
