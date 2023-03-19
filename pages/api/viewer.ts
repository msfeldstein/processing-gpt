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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.6.0/p5.min.js" integrity="sha512-3RlxD1bW34eFKPwj9gUXEWtdSMC59QqIqHnD8O/NoTwSJhgxRizdcFVQhUMFyTp5RwLTDL0Lbcqtl8b7bFAzog==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <script>window.onerror = ${errorHandler.toString()}</script>
  <script>
  ` +
    sketch +
    `
  </script>
      <title>CreativeGPT</title>
    </head>
    <body>
    <main></main> 
    </body>
  </html>`;
  res.send(src);
}
