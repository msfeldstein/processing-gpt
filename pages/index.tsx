import { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import monaco from "monaco-editor";

const prelude = `You are a creative coding assistant who is going to help me write p5js sketches.  Please respond only with the code that should be run, no explanations.  I will put the current code between [BEGIN] and [END] tokens, with the query of how i'd like you to modify the sketch below.`;
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
    monaco: any /* Monaco */
  ) {
    editorRef.current = editor;
    play();
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
          // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify({
          query: [prelude, sketchBegin, currentSketch, sketchEnd, query].join(
            "\n\n"
          ),
        }),
      }).then((r) => r.text());
      result = result.replaceAll("[BEGIN]", "").replaceAll("[END]", "").trim();
      const editor = editorRef.current;
      if (editor) {
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
          options={{ minimap: { enabled: false }, automaticLayout: true }}
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
