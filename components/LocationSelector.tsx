// SourceDestinationSelector.tsx
import { FC, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { formSchemaSwitch } from "@/utils/formSchema";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { ParaConfig } from "@/utils/parachainConfigs";
import { useAtomValue } from "jotai";

interface Props {
  form: UseFormReturn<z.infer<typeof formSchemaSwitch>>;
  parachainsInfo: ParaConfig[];
}

export const LocationSelector: FC<Props> = ({ form, parachainsInfo }) => {
  const context = useAtomValue(snowbridgeContextAtom);

  const sourceId = form.watch("sourceId");

  useEffect(() => {
    if (!context) return;

    const currentDestination = form.getValues("destinationId");

    if (sourceId === "assethub") {
      if (!parachainsInfo.some(({ id }) => id === currentDestination)) {
        form.resetField("destinationId", {
          defaultValue: parachainsInfo[0].id,
        });
      }
    } else {
      form.resetField("destinationId", {
        defaultValue: "assethub",
      });
    }
  }, [context, form, parachainsInfo, sourceId]);

  return (
    <div className="grid grid-cols-2 space-x-2">
      <FormField
        control={form.control}
        name="sourceId"
        render={({ field }) => (
          <FormItem {...field}>
            <FormLabel>Source</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[
                      { id: "assethub", name: "Asset Hub" },
                      ...parachainsInfo,
                    ].map(({ id, name }) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="destinationId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Destination</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sourceId !== "assethub" ? (
                      <SelectItem key={"assethub"} value={"assethub"}>
                        Asset Hub
                      </SelectItem>
                    ) : (
                      parachainsInfo.map(({ id, name }) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
