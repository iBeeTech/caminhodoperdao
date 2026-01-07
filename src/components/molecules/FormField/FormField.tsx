import React from "react";
import { ErrorText, Field, Label } from "./FormField.styles";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, error, children }) => {
  return (
    <Field>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </Field>
  );
};

export default FormField;
