"use client";
import { trimAccount } from "@/utils/formatting";
import { FC, useState, useRef, SetStateAction, useEffect } from "react";
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

  const onChange = (option: any) => {
    setValue(option.key);
    setInputValue(option ? option.key : "");
    field.onChange(option.key);
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

  useEffect(() => {
    // if the field is not set and there are accounts available, select the first account
    if (!field.value && accounts.length > 0) {
      field.onChange(accounts[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watching for 'field' would introduce infinite loop
  }, [accounts, field.value]);

  return (
    <Select
      options={accounts}
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
