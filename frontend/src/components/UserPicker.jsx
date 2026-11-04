// Checkbox list of farmers. 'selected' is an array of user ids.
export default function UserPicker({ farmers, selected, onChange }) {
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (farmers.length === 0) return <p className="muted">No farmers have signed up yet.</p>;

  return (
    <div className="picker">
      {farmers.map((f) => (
        <label key={f._id}>
          <input type="checkbox" checked={selected.includes(f._id)} onChange={() => toggle(f._id)} />
          {f.name} ({f.email})
        </label>
      ))}
    </div>
  );
}