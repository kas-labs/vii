import { useForm, Field, FormApi } from "@tanstack/react-form";

export const form = new FormApi({ defaultValues: { name: "test", count: 0 } });
export const exports = { useForm, Field, FormApi };
