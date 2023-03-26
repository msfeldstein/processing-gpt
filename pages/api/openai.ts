import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { getCollection } from "./_database";

const API_KEY = process.env["OPENAI_API_KEY"];

type Data = string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { query, currentSketch } = req.body;

  const messages = [
    {
      role: "user",
      content: query,
    },
  ];
  const data = { model: "gpt-3.5-turbo", messages };
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
  const r = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    data,
    { headers }
  );
  if (r.status === 200) {
    console.log("Query", query);
    console.log("Response", r.data.choices[0].message.content);
    if (!req.headers.host?.includes("localhost")) {
      await axios.post("https://" + req.headers.host + "/api/log", {
        query,
        newSketch: r.data.choices[0].message.content,
        currentSketch,
      });
    }
    res.send(r.data.choices[0].message.content);
  } else {
    res.status(400).send("Something went wrong querying openAI");
  }
}
