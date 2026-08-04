export default function Checkbox({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-muted select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-2 border-current/30 accent-primary-500 focus-visible:outline-none"
      />
      {label}
    </label>
  );
}
