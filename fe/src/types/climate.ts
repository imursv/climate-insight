// 기후 데이터 타입 정의

export interface TemperatureData {
  type: "global_temperature";
  source: string;
  latest: {
    year: number;
    anomaly: number;
  };
  annual_data: Array<{
    year: number;
    anomaly: number;
  }>;
}

export interface CO2Data {
  type: "co2_level";
  source: string;
  latest_daily: {
    date: string;
    co2_ppm: number;
  };
  monthly_data: Array<{
    year: number;
    month: number;
    co2_ppm: number;
  }>;
}

export interface ArcticIceData {
  type: "arctic_sea_ice";
  source: string;
  latest: {
    date: string;
    extent: number;
  };
  daily_data: Array<{
    date: string;
    extent: number;
  }>;
  monthly_averages: Array<{
    year: number;
    month: number;
    extent: number;
  }>;
  annual_minimum: Array<{
    year: number;
    minimum_extent: number;
  }>;
}

export interface SeaLevelData {
  type: "sea_level";
  source: string;
  trend_mm_per_year: number;
  latest: {
    year: number;
    anomaly_mm: number;
  };
  annual_data: Array<{
    year: number;
    anomaly_mm: number;
  }>;
}

export interface ENSOData {
  type: "enso_oni";
  source: string;
  latest: {
    year: number;
    avg_oni: number;
    status: string;
  };
  annual_data: Array<{
    year: number;
    avg_oni: number;
    status: string;
  }>;
}

export interface ClimateData {
  temperature: TemperatureData | null;
  co2: CO2Data | null;
  arcticIce: ArcticIceData | null;
  seaLevel: SeaLevelData | null;
  enso: ENSOData | null;
}
