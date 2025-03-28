import { Objec } from '../objec';

export interface DialogStep {
  type: 'DialogStep';
  text: string;
  portrait?: number;
}

export interface ChoiceStep {
  type: 'ChoiceStep';
}

export interface MoveStep {
  type: 'MoveStep';
}

export interface PauseStep {
  type: 'PauseStep';
  wait: number;
}

export interface GetItemStep {
  type: 'GetItemStep';
}

export interface IfHasItemStep {
  type: 'IfHasItemStep';
}

export interface RemoveItemStep {
  type: 'RemoveItemStep';
}

export type EventStep =
  | DialogStep
  | ChoiceStep
  | MoveStep
  | PauseStep
  | GetItemStep
  | IfHasItemStep
  | RemoveItemStep;

export interface TileData {
  tile: number;
  on_step?: EventStep[];
  on_interact?: EventStep[];
}

export type TileDataMap = Record<number, Record<number, TileData>>;

export interface MapData {
  tiles: Record<number, Record<number, TileData>>;
  layers: Record<number, number>;
}

export interface Tile {
  objec: Objec;
  data: TileData;
}

export interface TileMap {
  tiles: Record<number, Record<number, Tile>>;
  layers: Record<number, number>;
}

export function serialize_tilemap(tilemap: TileMap) {
  return {
    tiles: Object.fromEntries(
      Object.entries(tilemap.tiles).map(([key, entry]) => [
        key,
        Object.fromEntries(Object.entries(entry).map(([key, entry]) => [key, entry.data])),
      ]),
    ),
    layers: tilemap.layers,
  };
}
