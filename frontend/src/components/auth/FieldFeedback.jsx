export default function FieldFeedback({ id, error, hint }) {
  return <p id={id} className={`auth-form__feedback ${error ? "auth-form__field-error" : "auth-form__hint"}`}>{error || hint || ""}</p>;
}
