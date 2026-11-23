import { useEffect, useMemo, useState } from "react";
import { fetchFileContent, fetchFiles } from "../api";
import type { FileDetail, FileSummary } from "../api";
import { SENSITIVITY_ORDER, sensitivityMeta } from "../labels";
import { LevelChip } from "../LevelChip";

function SensitivityChip({ id }: { id: string }) {
  return <LevelChip id={id} />;
}

function folderOf(path: string) {
  const parts = path.split("/");
  return parts.length > 2 ? parts[1] : "root";
}

function fileName(path: string) {
  return path.split("/").slice(-1)[0];
}

function FileRow({ file }: { file: FileSummary }) {
  const [detail, setDetail] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function toggle() {
    if (!open && !detail) {
      setLoading(true);
      setError(null);
      try {
        setDetail(await fetchFileContent(file.path));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load file");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setOpen(!open);
  }

  return (
    <li className="file-row">
      <button
        type="button"
        className="file-row-head"
        onClick={toggle}
        aria-expanded={open}
      >
        <span className="file-path">{fileName(file.path)}</span>
        <span className="file-title">{file.title}</span>
        <SensitivityChip id={file.sensitivity} />
        <span className={`chevron ${open ? "chevron-open" : ""}`} aria-hidden>
          ›
        </span>
      </button>
      {open && (
        <div className="file-body">
          {loading && <p className="file-note">Loading…</p>}
          {error && <p className="file-note file-error">{error}</p>}
          {detail && (
            <>
              <p className="file-location">{detail.path}</p>
              <pre className="file-content">{detail.content}</pre>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export function FilesPage() {
  const [files, setFiles] = useState<FileSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles()
      .then(setFiles)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load files"),
      );
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    files?.forEach((f) => {
      map.set(f.sensitivity, (map.get(f.sensitivity) ?? 0) + 1);
    });
    return map;
  }, [files]);

  const visible = useMemo(() => {
    if (!files) return null;
    const filtered = filter ? files.filter((f) => f.sensitivity === filter) : files;
    const groups = new Map<string, FileSummary[]>();
    for (const f of filtered) {
      const key = folderOf(f.path);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [files, filter]);

  if (error) {
    return <div className="state-banner state-error">{error}</div>;
  }
  if (!visible) {
    return <div className="state-banner">Loading files…</div>;
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Files</h2>
          <p className="page-sub">
            {files?.length ?? 0} files from the Lumen Studio starter kit, stored
            in the <code>files</code> table. Click a file to read its stored
            text.
          </p>
        </div>
        <div className="filter-row" role="group" aria-label="Filter by sensitivity">
          {SENSITIVITY_ORDER.map((id) => {
            const meta = sensitivityMeta(id);
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                className={`filter-chip ${active ? "filter-active" : ""}`}
                style={{ ["--chip" as string]: meta.dot }}
                onClick={() => setFilter(active ? null : id)}
              >
                <span className="chip-dot" style={{ background: meta.dot }} />
                {meta.label}
                <span className="filter-count">{counts.get(id) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>
      {visible.map(([folder, groupFiles]) => (
        <div className="file-group" key={folder}>
          <h3 className="folder-name">
            {folder}
            <span className="folder-count">{groupFiles.length}</span>
          </h3>
          <ul className="file-list">
            {groupFiles.map((f) => (
              <FileRow key={f.path} file={f} />
            ))}
          </ul>
        </div>
      ))}
      {visible.length === 0 && (
        <div className="state-banner">No files match this filter.</div>
      )}
    </section>
  );
}
