import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { getCollection } from "./_database";

const API_KEY = process.env["OPENAI_API_KEY"];

const prelude = `You are a creative coding assistant who is going to help me write threejs sketches.  
You need to set up the rest of the threejs scene and camera, and anything i ask you to put in the scene.
Use es module imports from the "three" library which is available to you already.  You can also import from the "three/addons" libraries.  
"three/examples" is not available to us so absolutely do not use it or try to import from it.
Make sure to install things like OrbitCamera or other examples from the "three/addons" directory.
For example, importing OrbitCamera would look like \`import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\`
Please also include lots of fairly verbose comments so that i understand the code I'm reading.
Please respond only with the code that should be run, no explanations.
I will put the current code between [BEGIN] and [END] tokens, with the query of how i'd like you to modify the sketch below.
Be sure to only respond with the full representation of the modified code and no editorial or explanations.`;
const sketchBegin = "[BEGIN]";
const sketchEnd = "[END]";

type Data = string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { query, currentSketch } = req.body;
  const fullQuery = [
    prelude,
    sketchBegin,
    currentSketch,
    sketchEnd,
    query,
  ].join("\n\n");
  const messages = [
    {
      role: "user",
      content: fullQuery,
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
    // if (!req.headers.host?.includes("localhost")) {
    //   await axios.post("https://" + req.headers.host + "/api/log", {
    //     query,
    //     newSketch: r.data.choices[0].message.content,
    //     currentSketch,
    //   });
    // }
    res.send(r.data.choices[0].message.content);
  } else {
    res.status(400).send("Something went wrong querying openAI");
  }
}
