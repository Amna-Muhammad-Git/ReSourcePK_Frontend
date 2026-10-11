import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function FormField({ label, error, type, ...props }) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const id = props.id || generatedId;
  const password = type === "password";
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span
        className={
          password ? "field-control field-control--password" : "field-control"
        }
      >
        <input
          id={id}
          aria-invalid={Boolean(error)}
          type={password && visible ? "text" : type}
          {...props}
        />
        {password && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setVisible(!visible)}
            aria-label={
              visible
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        )}
      </span>
      {Boolean(error) && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
