import { NumericInput } from "@blueprintjs/core";
import { useState } from "react";

let ROAM_EXTENSION_API: RoamExtensionAPI;

const KEY_MAX_LENGTH = "MAX LENGTH";
const MAX_LENGTH = 50;

export function initConfig(roamExtensionAPI: RoamExtensionAPI) {
  ROAM_EXTENSION_API = roamExtensionAPI;

  roamExtensionAPI.settings.panel.create({
    tabTitle: "Roam Recents",
    settings: [
      {
        id: KEY_MAX_LENGTH,
        name: "max length",
        description: "max length for recent log entries2",
        action: {
          type: "reactComponent",
          component: function NumberInput() {
            return (
              <NumericInput
                allowNumericCharactersOnly
                defaultValue={maxLength()}
                min={1}
                max={Number.MAX_SAFE_INTEGER}
                onValueChange={(n) => {
                  ROAM_EXTENSION_API.settings.set(
                    KEY_MAX_LENGTH,
                    n
                  );
                }}
              />
            );
          },
        },
      },
    ],
  });
}

export function maxLength() {
  return (
    (ROAM_EXTENSION_API.settings.get(KEY_MAX_LENGTH) as number) || MAX_LENGTH
  );
}
