"use client";

import { createContext, useContext } from "react";

/** Field errors from the last server action, keyed by input name. */
export const FormErrorsContext = createContext<Record<string, string>>({});

export const useFieldError = (name: string): string | undefined => useContext(FormErrorsContext)[name];
