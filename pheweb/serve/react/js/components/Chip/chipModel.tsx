export interface ChipConfiguration {
  banner?: string;
}

export type ChipDataCell = string | number;

export interface ChipData {
  columns: string[];
  data: ChipDataCell[];
}
