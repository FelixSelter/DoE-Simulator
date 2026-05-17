import { numRegex } from "@/util/Util";
import { Input } from "@heroui/input";
import { useEffect, useState } from "react";

export enum NumberInputError {
  CANNOT_PARSE = "CANNOT_PARSE",
  TO_SMALL = "TO_SMALL",
  TO_BIG = "TO_BIG",
}

interface Props {
  label?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  isInvalid?: boolean;
  errorMessage?: string;
  onChange?: (value: number | NumberInputError) => void;
  value?: number;
  ariaLabel?: string;
  numDecimalPlaces?: number;
  startContent?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
  className?: string;
}

export default function NumberInput({
  label,
  min = -Infinity,
  max = Infinity,
  defaultValue = 0,
  isInvalid = false,
  errorMessage,
  onChange,
  value,
  ariaLabel,
  numDecimalPlaces,
  startContent,
  ref,
  className,
}: Props) {
  const [textValue, setTextValue] = useState(defaultValue.toString());
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setTextValue(value?.toString() ?? defaultValue.toString());
    setInvalid(false);
  }, [value, defaultValue]);

  return (
    <Input
      className={className}
      startContent={startContent}
      label={label}
      aria-label={ariaLabel}
      isInvalid={invalid || isInvalid}
      errorMessage={errorMessage}
      value={textValue}
      ref={ref}
      onValueChange={(val) => {
        setInvalid(true);
        if (!numRegex.test(val)) {
          setTextValue(val);
          return onChange?.(NumberInputError.CANNOT_PARSE);
        }
        let num = Number(val);
        if (numDecimalPlaces !== undefined) {
          const shift = Math.pow(10, numDecimalPlaces);
          num = Math.round(num * shift) / shift;
        }
        setTextValue(num.toString());

        if (num < min) onChange?.(NumberInputError.TO_SMALL);
        else if (num > max) onChange?.(NumberInputError.TO_BIG);
        else {
          setInvalid(false);
          onChange?.(num);
        }
      }}
    />
  );
}
