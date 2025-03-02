import { Objec } from '../objec';

export interface DialogStep {
  type: 'DialogStep';
  text: string;
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

export interface TileInfo {
  passable: boolean;
  layer: number;
}

export type TileInfoMap = Record<number, TileInfo>;

export interface TileData {
  tile: number;
  on_step?: EventStep[];
  on_interact?: EventStep[];
}

export type TileDataMap = Record<number, Record<number, TileData>>;

export interface Tile {
  objec: Objec;
  data: TileData;
}

export type TileMap = Record<number, Record<number, Tile>>;

export function serialize_tilemap(tilemap: TileMap) {
  return Object.fromEntries(
    Object.entries(tilemap).map(([key, entry]) => [
      key,
      Object.fromEntries(Object.entries(entry).map(([key, entry]) => [key, entry.data])),
    ]),
  );
}
