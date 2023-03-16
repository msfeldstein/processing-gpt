
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next'

const API_KEY = process.env["OPENAI_API_KEY"];

type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {

  const messages = [
    {
      role: "user",
      content: req.body.query,
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
  res.send(r.data.choices[0].message.content);
}
