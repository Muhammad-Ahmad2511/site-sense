export default function SectionToolbar({ onExpandAll, onCollapseAll }) {
  return (
    <div className="mb-4 flex justify-end gap-2">
      <button
        type="button"
        onClick={onExpandAll}
        className="min-h-[36px] rounded-lg glass-input px-3 text-xs font-medium hover:border-accent-2"
      >
        Expand all
      </button>
      <button
        type="button"
        onClick={onCollapseAll}
        className="min-h-[36px] rounded-lg glass-input px-3 text-xs font-medium hover:border-accent-2"
      >
        Collapse all
      </button>
    </div>
  );
}
