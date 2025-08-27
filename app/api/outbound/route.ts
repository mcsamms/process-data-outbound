import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "cleaned_outbound_data.json",
  );
  const raw = await fs.readFile(filePath, "utf8");
  const json = JSON.parse(raw);
  return Response.json(json);
}
