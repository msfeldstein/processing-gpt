import { useRef, useState } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import monaco from "monaco-editor";
import { types } from "../util/p5types";

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

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [loading, setLoading] = useState(false);

  function handleEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) {
    editorRef.current = editor;
    play();
    monaco.languages.typescript.javascriptDefaults.addExtraLib(types);
  }

  function play() {
    if (iframeRef.current && editorRef.current) {
      console.log("Value", editorRef.current?.getValue());
      iframeRef.current.src =
        "/api/viewer?sketch=" +
        encodeURIComponent(editorRef.current!.getValue());
    }
  }

  async function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      setLoading(true);
      const currentSketch = editorRef.current?.getValue();
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
      const editor = editorRef.current;
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
    <div className="App">
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
          <div className="button" onClick={play}>
            Play
          </div>
          <div id="PromptContainer">
            <textarea
              rows={8}
              disabled={loading}
              ref={textareaRef}
              onKeyDown={onKeyDown}
              placeholder="What would you like to do to the sketch?"
            ></textarea>
          </div>
          <div>{loading && "Communing..."}</div>
        </div>
      </div>
    </div>
  );
}
