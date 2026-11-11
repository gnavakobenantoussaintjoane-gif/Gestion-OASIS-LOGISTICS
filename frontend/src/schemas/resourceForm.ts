import { z } from "zod";
import type { Field } from "../services/resources";
export function resourceFormSchema(fields: Field[]) {
  return z.object(
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.type === "checkbox"
          ? z.boolean()
          : f.type === "number"
            ? z.coerce
                .number()
                .int("Nombre entier requis")
                .min(f.min || 0)
                .max(f.max || 1e12)
            : f.required
              ? z.string().trim().min(1, "Champ requis")
              : z.string().optional(),
      ]),
    ),
  );
}
