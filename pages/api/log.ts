import type { NextApiRequest, NextApiResponse } from "next";
import { getCollection } from "./_database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  const { query, newSketch, currentSketch } = req.body;
  const collection = await getCollection("logs");
  await collection.insertOne({
    query: query,
    originalSketch: currentSketch,
    output: newSketch,
  });
  res.send("ok");
  console.log("Inserted");
}
