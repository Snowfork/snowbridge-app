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
import { FormControl, FormItem, FormLabel, FormMessage } from "./ui/form";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { environment } from "@snowbridge/api";
import { formSchemaSwitch } from "@/utils/formSchema";
import { snowbridgeContextAtom } from "@/store/snowbridge";
import { parachainConfigs } from "@/utils/parachainConfigs";
import { useAtomValue } from "jotai";

interface Props {
  form: UseFormReturn<z.infer<typeof formSchemaSwitch>>;
  filteredLocations: environment.TransferLocation[];
  source: environment.TransferLocation;
  setFeeDisplay: (value: string) => void;
  setTokenSymbol: (value: string) => void;
}

export const LocationSelector: FC<Props> = ({
  form,
  filteredLocations,
  source,
  setFeeDisplay,
  setTokenSymbol,
}) => {
  const context = useAtomValue(snowbridgeContextAtom);

  useEffect(() => {
    if (!context || !source || source.destinationIds.length === 0) return;

    const newDestinationId = source.destinationIds.filter(
      (x) => x !== "ethereum",
    )[0];
    const selectedDestination = filteredLocations.find(
      (v) => v.id === newDestinationId,
    );
    const currentDestination = form.getValues("destination");

    if (currentDestination?.id !== newDestinationId && selectedDestination) {
      form.setValue("destination", selectedDestination);

      const newToken =
        selectedDestination.erc20tokensReceivable[0]?.address || "";
      if (form.getValues("token") !== newToken) {
        form.setValue("token", newToken);
        form.resetField("amount");
        setFeeDisplay("");
      }
    }

    if (source.id === "assethub" && selectedDestination?.id === "assethub") {
      const nonAssetHubDestination = filteredLocations.find(
        (v) => v.id !== "assethub",
      );
      if (nonAssetHubDestination) {
        form.setValue("destination", nonAssetHubDestination);
      }
    }

    if (source.id === "assethub") {
      const { nativeTokenMetadata } =
        parachainConfigs[selectedDestination?.name || ""];
      setTokenSymbol(nativeTokenMetadata.symbol);
    }
  }, [source, filteredLocations, form, context, setFeeDisplay, setTokenSymbol]);

  return (
    <div className="grid grid-cols-2 space-x-2">
      {/* Source Selector */}
      <FormItem>
        <FormLabel>Source</FormLabel>
        <FormControl>
          <Select
            onValueChange={(value) => {
              const selectedSource = filteredLocations.find(
                (location) => location.id === value,
              );
              if (selectedSource) {
                form.setValue("source", selectedSource);
              }
            }}
            value={form.watch("source").id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a source" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filteredLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>

      {/* Destination Selector */}
      <FormItem>
        <FormLabel>Destination</FormLabel>
        <FormControl>
          <Select
            onValueChange={(value) => {
              const selectedDestination = filteredLocations.find(
                (location) => location.id === value,
              );
              if (selectedDestination) {
                form.setValue("destination", selectedDestination);
              }
            }}
            value={form.watch("destination").id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {source.destinationIds.map((destinationId) => {
                  const availableDestination = filteredLocations.find(
                    (v) => v.id === destinationId,
                  );

                  if (!availableDestination) {
                    return null;
                  }

                  return (
                    <SelectItem
                      key={availableDestination.id}
                      value={availableDestination.id}
                    >
                      {availableDestination.name}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    </div>
  );
};
