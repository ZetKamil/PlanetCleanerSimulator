import type { BaseBuildingEntity, Direction } from './BaseBuildingEntity';
import type { BuildingType } from './BuildingConfigs';
import { ConveyorBuilding, ConveyorMk2Building, SplitterBuilding, SmartSplitterBuilding, MergerBuilding, UndergroundBeltBuilding } from './ConveyorBuildings';
import { PackagerBuilding, SmelterBuilding, SiloBuilding, VacuumTurretBuilding, AwesomeSinkBuilding } from './ProductionBuildings';
import { SolarBuilding, GeothermalBuilding, PowerPylonBuilding } from './PowerBuildings';
import { DockBuilding, ShieldPylonBuilding } from './DefenseBuildings';
import { PipeBuilding, AcidPumpBuilding, AcidRefineryBuilding } from './FluidBuildings';

/**
 * Fabryka obiektów budynków (Factory Pattern - OCP).
 */
export class BuildingFactory {
    public static create(
        type: BuildingType,
        gridX: number,
        gridY: number,
        direction: Direction = 'E',
        tileSize: number = 32,
    ): BaseBuildingEntity {
        switch (type) {
            case 'conveyor':
                return new ConveyorBuilding(gridX, gridY, direction, tileSize);
            case 'conveyor_mk2':
                return new ConveyorMk2Building(gridX, gridY, direction, tileSize);
            case 'splitter':
                return new SplitterBuilding(gridX, gridY, direction, tileSize);
            case 'smart_splitter':
                return new SmartSplitterBuilding(gridX, gridY, direction, tileSize);
            case 'merger':
                return new MergerBuilding(gridX, gridY, direction, tileSize);
            case 'underground_belt':
                return new UndergroundBeltBuilding(gridX, gridY, direction, tileSize);
            case 'power_pylon':
                return new PowerPylonBuilding(gridX, gridY, direction, tileSize);
            case 'vacuum_turret':
                return new VacuumTurretBuilding(gridX, gridY, direction, tileSize);
            case 'packager':
                return new PackagerBuilding(gridX, gridY, direction, tileSize);
            case 'smelter':
                return new SmelterBuilding(gridX, gridY, direction, tileSize);
            case 'silo':
                return new SiloBuilding(gridX, gridY, direction, tileSize);
            case 'awesome_sink':
                return new AwesomeSinkBuilding(gridX, gridY, direction, tileSize);
            case 'dock':
                return new DockBuilding(gridX, gridY, direction, tileSize);
            case 'solar':
                return new SolarBuilding(gridX, gridY, direction, tileSize);
            case 'geothermal':
                return new GeothermalBuilding(gridX, gridY, direction, tileSize);
            case 'shield_pylon':
                return new ShieldPylonBuilding(gridX, gridY, direction, tileSize);
            case 'pipe':
                return new PipeBuilding(gridX, gridY, direction, tileSize);
            case 'acid_pump':
                return new AcidPumpBuilding(gridX, gridY, direction, tileSize);
            case 'acid_refinery':
                return new AcidRefineryBuilding(gridX, gridY, direction, tileSize);
        }
    }
}

