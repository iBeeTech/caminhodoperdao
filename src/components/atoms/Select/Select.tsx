import React from "react";
import { StyledSelect } from "./Select.styles";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ children, ...rest }, ref) => {
  return (
    <StyledSelect ref={ref} {...rest}>
      {children}
    </StyledSelect>
  );
});

Select.displayName = "Select";

export default Select;
