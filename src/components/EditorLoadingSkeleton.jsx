function EditorLoadingSkeleton() {
  return (
    <div className="editor-skeleton" role="status" aria-live="polite">
      <div className="editor-skeleton__header">
        <span className="editor-skeleton__chip" />
        <span className="editor-skeleton__button" />
      </div>
      <div className="editor-skeleton__surface">
        <span className="editor-skeleton__line editor-skeleton__line--w90" />
        <span className="editor-skeleton__line editor-skeleton__line--w70" />
        <span className="editor-skeleton__line editor-skeleton__line--w80" />
        <span className="editor-skeleton__line editor-skeleton__line--w45" />
      </div>
    </div>
  )
}

export default EditorLoadingSkeleton
