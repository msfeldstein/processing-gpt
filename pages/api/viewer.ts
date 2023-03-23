import type { NextApiRequest, NextApiResponse } from "next";

const errorHandler = (msg: any, url: any, line: any) => {
  window.parent.postMessage({ p5Error: msg, line });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  const sketch = req.query.sketch;
  const src =
    `<!doctype html>
  <html lang="en">
    <head>
    <style>body, html {margin: 0; overflow: hidden;}</style>
      <!-- Required meta tags -->
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

  <script>window.onerror = ${errorHandler.toString()}</script>
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.150.1/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.150.1/examples/jsm/"
    }
  }
</script>
  <style>
  body, html {
    margin: 0;
    height: 100%;
  }
    canvas {
      width: 100%;
      height: 100%;
    }
  </style>
      <title>CreativeGPT</title>
    </head>
    <body>
    </body>
    <script type="module">
    ` +
    sketch +
    `
    </script>
  </html>`;
  res.send(src);
}
