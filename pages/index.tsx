import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import monaco from "monaco-editor";
import { types } from "../util/p5types";
import Head from "next/head";
import Image from "next/image";

const preludeExplore = `"Given the following p5.js sketch, generate a subtly changed creative variation.  Give me a one sentence description of what you're doing followed by a code block with the complete code in it.  Please base it off the given sketch and explore a unique but subtly different direction with it.  Make sure to just write the description, and then the pure source code wrapped in \`\`\`\n\nPlease keep it mellow and calm, nothing too crazy.  Also add lots of comments explaining the code.\n\n`;
const preludeGenerate = `You are a creative coding assistant who is going to help me write p5js sketches.  Please respond only with the code that should be run, no explanations.  I will put the current code between [BEGIN] and [END] tokens, with the query of how i'd like you to modify the sketch below.  Be sure to only respond with the full representation of the modified code and no editorial or explanations.\n\n`;

const defaultScript = `
function setup() {
  createCanvas(600, 600);
}

function draw() {
  background(0);
  fill(255);
  noStroke();
  // draw a horizontal, centered line about 50px wide every 5px from the top to the bottom of the screen
  for (let i = 0; i <= height; i += 5) {
    rectMode(CENTER);
    rect(width / 2, i, 250, 1);
  }
}
`;

const placeholder = `What would you like to do to the sketch?

Examples:
- Make the circle blue
- Add a bunch of particles that orbit around the circle
- Add comments to the code
- Pull all the constant numbers out to named variables so I can tweak them`;

const questionPlaceholder = `Ask a question about the sketch

Examples:
- Why isn't the ball following my cursor
- What does line 32 mean?
- Explain the attractParticle() function`;

function Communing() {
  return <div id="Communing">Communing...</div>;
}

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [questionMode, setQuestionMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLoadedFromHash, setHasLoadedFromHash] = useState(false);
  const [hasEditor, setHasEditor] = useState(false);
  const [sketches, setSketches] = useState<string[]>([]);
  const [infos, setInfos] = useState<string[]>([]);

  const play = useCallback(() => {
    if (iframeRef.current && editorRef.current) {
      console.log("Value", editorRef.current.getValue());
      iframeRef.current.src =
        "/api/viewer?sketch=" +
        encodeURIComponent(editorRef.current.getValue());
    }
    setLastError(null);
  }, [editorRef]);

  const choose = useCallback(
    (i: number) => {
      const editor = editorRef.current;
      if (editor) {
        // Need to do this instead of calling setValue so you can cmd+z it
        editor.pushUndoStop();
        editor.executeEdits("update-from-gpt", [
          {
            range: editor.getModel()!.getFullModelRange(),
            text: sketches[i],
          },
        ]);
        editor.pushUndoStop();
        play();
      }
    },
    [play, sketches]
  );

  const fetchExploration = async () => {
    const editor = editorRef.current;
    const query = preludeExplore + editor?.getValue();
    console.log({ query });
    let result = await fetch("/api/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    }).then((r) => r.text());
    let [info, sketch] = result.split("```");
    console.log({ result, info, sketch });
    sketch = sketch.replace("javascript", "");
    console.log({ info, sketch });
    return [info, sketch];
  };

  const explore = useCallback(async () => {
    const editor = editorRef.current;
    setLoading(true);
    const newSketches = [];
    const newInfos = [];
    for (var i = 0; i < 3; i++) {
      console.log("Querying", i);
      let [info, sketch] = await fetchExploration();
      newSketches.push(sketch);
      newInfos.push(info);
    }

    setSketches(newSketches);
    setInfos(newInfos);
    setLoading(false);
  }, []);

  useEffect(() => {
    console.log("HASH", window.location.hash, editorRef.current);
    if (
      !hasLoadedFromHash &&
      window.location.hash &&
      window.location.hash.indexOf("#sketch=") === 0 &&
      editorRef.current &&
      hasEditor
    ) {
      editorRef.current.setValue(
        decodeURIComponent(window.location.hash.substring(8))
          .replaceAll("[BEGIN]", "")
          .replaceAll("[END]", "")
      );
      setHasLoadedFromHash(true);
    }
    play();
  }, [editorRef, hasLoadedFromHash, play, hasEditor]);

  useEffect(() => {
    const onMessage = function (msg: MessageEvent) {
      if (msg.data.p5Error) {
        setLastError(msg.data.p5Error);
        console.log("GOT MESSAGE", msg);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  });

  function askForHelp() {
    textareaRef.current!.value = `I'm getting the following error.  Can you fix it and add comments directly above the changes with what you did? \n\n ${lastError}`;
    setLastError(null);
  }

  function setQuestionModeAndClear(newQuestionMode: boolean) {
    if (newQuestionMode === questionMode) return;
    setQuestionMode(newQuestionMode);
    textareaRef.current!.value = "";
  }

  function handleEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) {
    editorRef.current = editor;
    setHasEditor(true);
    play();
    editor.addAction({
      id: "run-sketch",
      label: "Run Sketch",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: play,
    });
    monaco.languages.typescript.javascriptDefaults.addExtraLib(types);
  }

  async function onKeyDown(e: React.KeyboardEvent) {
    if (sketches.length > 0) {
      setSketches([]);
      setInfos([]);
    }
    if (e.key === "Enter" && editorRef.current) {
      const editor = editorRef.current;
      setLoading(true);
      const query =
        preludeGenerate +
        "[BEGIN]\n" +
        editorRef.current.getValue() +
        "\n[END]\n\n" +
        textareaRef.current?.value;
      let result = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
        }),
      }).then((r) => r.text());
      const [info, sketch] = result.split("```");
      console.log({ info, sketch });
      result = result.replaceAll("[BEGIN]", "").replaceAll("[END]", "").trim();
      if (editor) {
        // Need to do this instead of calling setValue so you can cmd+z it
        editor.pushUndoStop();
        editor.executeEdits("update-from-gpt", [
          {
            range: editor.getModel()!.getFullModelRange(),
            text: result,
          },
        ]);
        editor.pushUndoStop();
      }
      setLoading(false);
      play();
    }
  }

  return (
    <>
      <div className="MobileBanner">
        <div>
          <Image src="/icon-no-bg.png" alt="logo" width={320} height={320} />
        </div>
        <div>
          P5ai is a p5js editor with an AI assistant, but sadly only works on
          desktop
        </div>
      </div>
      {/* <div id="Header">Header</div> */}
      <div className="App">
        <Head>
          <title>P5ai</title>
          <link rel="icon" type="image/png" href="/icon-no-bg.png" />
        </Head>

        <div className="EditorContainer">
          <Editor
            theme="vs-dark"
            onMount={handleEditorDidMount}
            defaultLanguage="javascript"
            defaultValue={defaultScript}
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              language: "javascript",
            }}
          />
        </div>
        <div id="controls">
          <div id="button-row">
            <button disabled={loading} className="button" onClick={play}>
              Play
            </button>
            <button disabled={loading} className="button" onClick={explore}>
              Explore
            </button>
          </div>
          <div className="PreviewContainer">
            <iframe
              title="preview"
              ref={iframeRef}
              width={600}
              height={600}
            ></iframe>

            <div className="ExplorationsContainer">
              {sketches.map((sketch, i) => {
                return (
                  <div key={`frame${i}`} onClick={() => choose(i)}>
                    <div className="ExplorationInfo">{infos[i]}</div>
                    <div className="iframeContainer">
                      <iframe
                        src={"/api/viewer?sketch=" + encodeURIComponent(sketch)}
                        width={600}
                        height={600}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="PromptContainer">
              <textarea
                rows={9}
                disabled={loading}
                ref={textareaRef}
                onKeyDown={onKeyDown}
                placeholder={questionMode ? questionPlaceholder : placeholder}
              ></textarea>
            </div>
            {lastError && (
              <div className="ErrorBox">
                {lastError}
                <div>
                  <div className="button" onClick={askForHelp}>
                    Ask for help
                  </div>
                </div>
              </div>
            )}
            {loading && <Communing />}
            {loading && <div>Communing...</div>}
          </div>
        </div>
      </div>
    </>
  );
}
