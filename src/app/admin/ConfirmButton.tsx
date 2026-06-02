"use client";

// A submit button that asks for confirmation before letting its form submit.
// Used for destructive admin actions (delete). The form's Server Action still
// runs the real auth + work; this is just a "did you mean it?" guard.
export function ConfirmButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
