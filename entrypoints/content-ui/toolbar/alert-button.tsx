import * as React from "react";
import { Button } from "../../../components/ui/button";

export const triggerSampleAlert = () => {
  window.alert("Wilderness: sample action triggered.");
};

export const AlertButton = () => {
  return (
    <Button
      size="sm"
      onClick={triggerSampleAlert}
      aria-label="Show sample alert"
    >
      Try alert
    </Button>
  );
};
