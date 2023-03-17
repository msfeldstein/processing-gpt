import type { NextApiRequest, NextApiResponse } from "next";
import { getCollection } from "./_database";

type Data = {
  name: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { query, response, currentSketch } = req.body;
  console.log("Query", query);
  console.log("Response", response);
  const collection = await getCollection("logs");
  await collection.insertOne({
    query: query,
    originalSketch: currentSketch,
    output: response,
  });
  console.log("Inserted");
}
