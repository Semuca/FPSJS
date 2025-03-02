import { Objec } from '../objec';

export interface TileInfo {
  passable: boolean;
  layer: number;
}

export type TileInfoMap = Record<number, TileInfo>;

export interface TileData {
  tile: number;
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
