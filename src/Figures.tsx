import type { FigureRow, FileReadRef } from "./api";
import { sensitivityMeta } from "./labels";

export function FigureTable({ figures }: { figures: FigureRow[] }) {
  if (figures.length === 0) return null;
  return (
    <div className="figure-table-wrap">
      <table className="figure-table">
        <thead>
          <tr>
            <th>Draft says</th>
            <th>File says</th>
            <th>Source</th>
            <th className="figure-mark-col" aria-label="Mark" />
          </tr>
        </thead>
        <tbody>
          {figures.map((figure, index) => (
            <tr
              key={`${figure.raw}-${index}`}
              className={`figure-${figure.status}`}
            >
              <td className="fig-draft">{figure.raw}</td>
              <td className="fig-says">
                {figure.source ? figure.source.raw : "No source found"}
              </td>
              <td className="fig-src">
                {figure.source ? (
                  <>
                    <span className="fig-path">{figure.source.path}</span>
                    <span className="fig-line">“{figure.source.line}”</span>
                  </>
                ) : (
                  <span className="fig-none">—</span>
                )}
              </td>
              <td className="figure-mark-col">
                <span
                  className="figure-mark"
                  title={
                    figure.status === "supported"
                      ? "Found in a file the agent read"
                      : figure.status === "contradicted"
                        ? "A different value for the same kind of figure is in the files"
                        : "No matching figure in any file read"
                  }
                >
                  {figure.status === "supported" ? "✓" : "✗"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilesRead({ files }: { files: FileReadRef[] }) {
  if (!files || files.length === 0) return null;
  return (
    <details className="files-read">
      <summary>Files read ({files.length})</summary>
      <ul className="files-read-list">
        {files.map((file) => {
          const meta = sensitivityMeta(file.sensitivity);
          return (
            <li key={file.path}>
              <span className="chip-dot" style={{ background: meta.dot }} />
              <span className="files-read-path">{file.path}</span>
              <span className="files-read-level">{meta.label}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
