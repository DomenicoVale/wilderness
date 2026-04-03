import * as React from "react";
import {
  checkUserScriptsAvailability,
  getMissingCustomToolPermissionMessage,
  isFirefoxBuild,
  requestCustomToolPermission,
} from "../../lib/custom-tools/permissions";

export type UserScriptsPermissionState = "checking" | "granted" | "missing" | "requesting";

export const useUserScriptsPermission = () => {
  const firefoxBuild = isFirefoxBuild();
  const [permissionState, setPermissionState] = React.useState<UserScriptsPermissionState>("checking");
  const [missingPermissionMessage, setMissingPermissionMessage] = React.useState(getMissingCustomToolPermissionMessage());

  React.useEffect(() => {
    let cancelled = false;

    const syncPermissionState = async () => {
      const availability = await checkUserScriptsAvailability();
      if (cancelled) {
        return;
      }

      setPermissionState(availability.ok ? "granted" : "missing");
      if (!availability.ok && availability.error) {
        setMissingPermissionMessage(availability.error);
      }
    };

    void syncPermissionState();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestPermission = async () => {
    setPermissionState("requesting");
    if (firefoxBuild) {
      await requestCustomToolPermission();
    }

    const availability = await checkUserScriptsAvailability();
    setPermissionState(availability.ok ? "granted" : "missing");
    if (!availability.ok && availability.error) {
      setMissingPermissionMessage(availability.error);
    }

    return availability.ok;
  };

  return {
    firefoxBuild,
    permissionState,
    missingPermissionMessage,
    requestPermission,
    showPermissionWarning: permissionState !== "granted",
  };
};
