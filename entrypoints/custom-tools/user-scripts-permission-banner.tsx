import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { UserScriptsPermissionState } from "./use-user-scripts-permission";

const USER_SCRIPTS_WARNING_BUTTON_CLASS_NAME =
  "h-10 rounded-none border-2 border-white bg-transparent px-4 font-mono text-[14px] font-bold uppercase tracking-[0.06em] text-white hover:bg-white hover:text-[#b91c1c]";

export const UserScriptsPermissionBanner = ({
  permissionState,
  message,
  onGrantPermission,
  firefoxBuild,
}: {
  permissionState: UserScriptsPermissionState;
  message: string;
  onGrantPermission: () => void;
  firefoxBuild: boolean;
}) => (
  <section className="mx-4 mt-4 border-2 border-white bg-[#b91c1c] px-4 py-4 text-white">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold uppercase tracking-[0.08em] text-white">User Scripts Permission Required</div>
        <div className="mt-2 text-[14px] font-bold uppercase leading-6 tracking-[0.05em] text-white">
          {permissionState === "checking" ? "Checking User Scripts Permission" : message}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onGrantPermission}
        disabled={permissionState === "checking" || permissionState === "requesting"}
        aria-label={firefoxBuild ? "Grant Firefox user scripts permission" : "Open Chrome extensions settings"}
        className={cn(
          USER_SCRIPTS_WARNING_BUTTON_CLASS_NAME,
          permissionState === "checking" || permissionState === "requesting" ? "opacity-70" : ""
        )}
      >
        {permissionState === "requesting" ? "[REQUESTING…]" : firefoxBuild ? "[ENABLE USER SCRIPTS]" : "[OPEN EXTENSIONS]"}
      </Button>
    </div>
  </section>
);
