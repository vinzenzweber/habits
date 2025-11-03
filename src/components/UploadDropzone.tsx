"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useFormStatus } from "react-dom";

type UploadDropzoneProps = {
  action: (formData: FormData) => Promise<void>;
};

function PendingIndicator() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-300">
      Uploading…
    </p>
  );
}

export function UploadDropzone({ action }: UploadDropzoneProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setSelectedCount(0);
  };

  const formAction = useCallback(
    async (formData: FormData) => {
      await action(formData);
      resetInput();
    },
    [action]
  );

  const handleFileSelection = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    setSelectedCount(files.length);
    const submitter = submitRef.current ?? undefined;
    formRef.current?.requestSubmit(submitter);
  }, []);

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.currentTarget.files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer?.files;
    if (!dropped || dropped.length === 0) {
      return;
    }
    if (inputRef.current) {
      const dataTransfer = new DataTransfer();
      Array.from(dropped).forEach((file) => dataTransfer.items.add(file));
      inputRef.current.files = dataTransfer.files;
    }
    handleFileSelection(dropped);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  return (
    <form ref={formRef} action={formAction} className="w-full">
      <input
        ref={inputRef}
        id="upload-videos"
        name="videos"
        type="file"
        accept="video/mp4,video/x-m4v,video/*"
        multiple
        hidden
        onChange={onInputChange}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={openFileDialog}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFileDialog();
          }
        }}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
          isDragging
            ? "border-emerald-400 bg-emerald-400/10"
            : "border-slate-700 bg-slate-900/60 hover:border-emerald-400/60"
        }`}
      >
        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Drop videos here
        </span>
        <p className="text-sm text-slate-300">
          or click to browse files. Multiple uploads are supported.
        </p>
        {selectedCount > 0 ? (
          <p className="text-xs text-slate-400">
            {selectedCount} file{selectedCount === 1 ? "" : "s"} ready to upload…
          </p>
        ) : null}
        <PendingIndicator />
      </div>
      <button ref={submitRef} type="submit" className="hidden">
        Upload
      </button>
    </form>
  );
}
