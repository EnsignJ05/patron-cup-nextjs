type AdminFieldProps = {
  label: string;
  value?: string;
  placeholder?: string;
  mono?: boolean;
  focused?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/**
 * A labeled, read-only-looking field display -- for rendering form-like admin layouts where
 * the actual input is a real form control. For a real editable field, use children to pass
 * the real <input>/<select>; the value/placeholder props are for static display states.
 */
export default function AdminField({ label, value, placeholder, mono, focused, style, children }: AdminFieldProps) {
  return (
    <div style={style}>
      <label className="ad-lab">{label}</label>
      <div className={`ad-in${mono ? ' mono' : ''}${focused ? ' focus' : ''}`}>
        {children || (value ? <span>{value}</span> : <span className="ph">{placeholder}</span>)}
      </div>
    </div>
  );
}
