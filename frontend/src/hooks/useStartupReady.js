import { createContext, useContext, useLayoutEffect } from "react";

export const StartupContext = createContext(null);

export default function useStartupReady(ready) {
  const finish = useContext(StartupContext);
  useLayoutEffect(() => {
    if (ready) finish?.();
  }, [finish, ready]);
}
