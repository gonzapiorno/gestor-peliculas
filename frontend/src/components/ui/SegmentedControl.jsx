import "./SegmentedControl.css";

export default function SegmentedControl({ label, value, options, onChange }) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}{option.count != null && <> <span>{option.count}</span></>}
        </button>
      ))}
    </div>
  );
}
