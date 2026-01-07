import React, { useId } from "react";
import { ErrorText, Field, Label, RequiredMark } from "./FormField.styles";

type SupportedFieldElement = React.ReactElement<
  React.InputHTMLAttributes<HTMLInputElement> |
  React.SelectHTMLAttributes<HTMLSelectElement> |
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>;

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: SupportedFieldElement;
}

const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, error, required = false, children }) => {
  const generatedId = useId();
  const childProps = children.props as Record<string, unknown>;
  const rawId = htmlFor ?? (typeof childProps.id === "string" ? childProps.id : undefined);
  const controlId = rawId ?? generatedId;
  const controlIdString = String(controlId);
  const errorId = error ? `${controlIdString}-error` : undefined;

  const enhancedChild = React.isValidElement(children)
    ? (() => {
        const describedBy = [childProps["aria-describedby"], errorId]
          .filter(Boolean)
          .join(" ") || undefined;
        const requiredValue =
          typeof childProps.required === "boolean"
            ? childProps.required
            : required
              ? true
              : undefined;

        return React.cloneElement(children, {
          id: controlIdString,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
          required: requiredValue,
        });
      })()
    : children;

  return (
    <Field>
      <Label htmlFor={controlIdString}>
        {label}
        {required && <RequiredMark aria-hidden="true">*</RequiredMark>}
      </Label>
      {enhancedChild}
      {error && (
        <ErrorText id={errorId} role="alert" aria-live="assertive">
          {error}
        </ErrorText>
      )}
    </Field>
  );
};

export default FormField;
