import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// BE/data/climate 디렉토리에서 데이터 읽기
const DATA_DIR = path.join(process.cwd(), "..", "BE", "data", "climate");

function readJsonFile(filename: string) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
  }
  return null;
}

export async function GET() {
  const data = {
    temperature: readJsonFile("temperature.json"),
    co2: readJsonFile("co2.json"),
    arcticIce: readJsonFile("arctic_ice.json"),
    seaLevel: readJsonFile("sea_level.json"),
    enso: readJsonFile("enso.json"),
  };

  return NextResponse.json(data);
}
