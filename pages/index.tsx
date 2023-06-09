import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import monaco from "monaco-editor";
import { types } from "../util/p5types";
import Head from "next/head";
import Image from "next/image";

const prelude = `You are a creative coding assistant who is going to help me write p5js sketches.  Please respond only with the code that should be run, no explanations.  I will put the current code between [BEGIN] and [END] tokens, with the query of how i'd like you to modify the sketch below.  Be sure to only respond with the full representation of the modified code and no editorial or explanations.`;
const sketchBegin = "[BEGIN]";
const sketchEnd = "[END]";

const defaultScript = `function setup() {
  createCanvas(500, 500);
}

function draw() {
  background(0);
  fill(255);
  ellipse(250, 250, 100);
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

  const play = useCallback(() => {
    if (iframeRef.current && editorRef.current) {
      console.log("Value", editorRef.current.getValue());
      iframeRef.current.src =
        "/api/viewer?sketch=" +
        encodeURIComponent(editorRef.current.getValue());
    }
    setLastError(null);
  }, [editorRef]);

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
    if (e.key === "Enter" && editorRef.current) {
      const editor = editorRef.current;
      setLoading(true);
      const currentSketch = editorRef.current.getValue();
      const query = textareaRef.current?.value;
      let result = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          currentSketch,
        }),
      }).then((r) => r.text());
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
        <div className="PreviewContainer">
          <iframe
            title="preview"
            ref={iframeRef}
            width={500}
            height={500}
          ></iframe>
          <div id="controls">
            <div id="button-row">
              {/* <button
                disabled={loading}
                className="button"
                onClick={() => setQuestionModeAndClear(false)}
              >
                Alter
              </button>
              <button
                disabled={loading}
                className="button"
                onClick={() => setQuestionModeAndClear(true)}
              >
                Ask
              </button> */}
              <button disabled={loading} className="button" onClick={play}>
                Play
              </button>
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
