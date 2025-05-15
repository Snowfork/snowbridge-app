"use client";
import { trimAccount } from "@/utils/formatting";
import { FC, useState, useRef, SetStateAction } from "react";
import Select, { components } from "react-select";

const Input = (props: any) => <components.Input {...props} isHidden={false} />;

import { AccountInfo } from "@/utils/types";

type SelectAccountProps = {
  field: any;
  accounts: AccountInfo[];
  disabled?: boolean;
  destination?: string;
};

export const EditableSelectAccount: FC<SelectAccountProps> = ({
  accounts,
  field,
  destination,
}) => {
  const [value, setValue] = useState();
  const [inputValue, setInputValue] = useState("");

  let displayAccounts = accounts.map((account) => {
    return { label: account.key, value: account.key };
  });

  const options = useRef(displayAccounts).current;

  const onChange = (option: any) => {
    setValue(option.value);
    setInputValue(option ? option.label : "");
    field.onChange(option.value);
  };

  const onInputChange = (
    inputValue: SetStateAction<string>,
    { action }: any,
  ) => {
    if (action === "input-change") {
      setInputValue(inputValue);
      field.onChange(inputValue);
    }
  };

  return (
    <Select
      options={options}
      isClearable={true}
      value={value}
      inputValue={inputValue}
      onInputChange={onInputChange}
      onChange={onChange}
      controlShouldRenderValue={false}
      components={{
        Input,
      }}
    ></Select>
  );
};
