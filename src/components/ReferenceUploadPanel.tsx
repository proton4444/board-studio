/*
Plan:
1. Accept image files from disk through a hidden multi-file input triggered by a visible button.
2. Convert each file to a data URL, persist it as a per-board reference image record, and expose per-file status rows.
3. Keep the implementation local-first because Atlas Cloud currently exposes only URL-based uploads, not direct file uploads.
*/
import { useRef, useState, type ChangeEvent } from "react";
import { saveReferenceImage } from "../lib/storage";
import { createId, nowIso } from "../lib/utils";
import type { ReferenceImage } from "../schemas/media";

type ReferenceUploadPanelProps = {
  boardId: string;
  onUploadComplete: () => void;
};

type UploadItemStatus = "pending" | "succeeded" | "failed";

type UploadItem = {
  id: string;
  name: string;
  status: UploadItemStatus;
  errorMessage?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result.length > 0) {
        resolve(reader.result);
        return;
      }

      reject(new Error(`Unable to read ${file.name}.`));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error(`Unable to read ${file.name}.`));
    };

    reader.readAsDataURL(file);
  });
}

function ReferenceUploadPanel({ boardId, onUploadComplete }: ReferenceUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  function updateUpload(uploadId: string, nextValue: Partial<UploadItem>) {
    setUploads((current) =>
      current.map((item) => (item.id === uploadId ? { ...item, ...nextValue } : item)),
    );
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length === 0) {
      return;
    }

    const pendingUploads = files.map((file) => ({
      id: createId("reference_upload"),
      name: file.name,
      status: "pending" as const,
    }));

    setUploads((current) => [...pendingUploads, ...current]);
    event.currentTarget.value = "";

    for (const [index, file] of files.entries()) {
      const uploadId = pendingUploads[index].id;

      try {
        const dataUrl = await readFileAsDataUrl(file);

        // Atlas Cloud's `uploadMedia` helper currently accepts only a URL string.
        // A browser-only blob URL would be unreachable from Atlas Cloud, so the MVP
        // persists a data URL locally until a true file upload path is available.
        const referenceImage: ReferenceImage = {
          id: createId("reference"),
          boardId,
          type: "image",
          url: dataUrl,
          name: file.name,
          createdAt: nowIso(),
          mimeType: file.type || undefined,
          meta: {
            source: "upload",
            storage: "data-url",
          },
        };

        saveReferenceImage(referenceImage);
        updateUpload(uploadId, { status: "succeeded" });
        onUploadComplete();
      } catch (error) {
        updateUpload(uploadId, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }
  }

  return (
    <section className="panel reference-upload-panel">
      <div className="panel__heading">
        <div>
          <p className="panel__eyebrow">References</p>
          <h2>Upload images</h2>
        </div>
      </div>
      <input
        accept="image/*"
        className="reference-upload-panel__input"
        multiple
        onChange={handleFileSelection}
        ref={inputRef}
        type="file"
      />
      <p className="reference-upload-panel__copy">
        Add visual references from disk and keep them with this board across refreshes.
      </p>
      <button className="button button--ghost" onClick={() => inputRef.current?.click()} type="button">
        Upload references
      </button>
      {uploads.length > 0 ? (
        <div className="reference-upload-panel__list">
          {uploads.map((item) => (
            <div className="reference-upload-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                {item.errorMessage ? <p>{item.errorMessage}</p> : null}
              </div>
              <span className={`status-pill status-pill--${item.status}`}>{item.status}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ReferenceUploadPanel;
