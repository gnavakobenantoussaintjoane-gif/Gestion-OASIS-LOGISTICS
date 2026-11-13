import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { render, screen } from "@testing-library/react";
import Brand, { OtlLogo } from "../src/components/Brand";

describe("Identité officielle OTL", () => {
  it("affiche l’image originale avec texte alternatif et ratio 2:1", () => {
    render(<Brand />);
    const image = screen.getByRole("img", {
      name: "OTL — OASIS TRANSPORT LOGISTICS",
    });
    expect(image.getAttribute("src")).toBe("/branding/otl-logo.jpg");
    expect(
      Number(image.getAttribute("width")) /
        Number(image.getAttribute("height")),
    ).toBe(2);
  });
  it("peut rendre le logo décoratif sans répéter son nom au lecteur d’écran", () => {
    const { container } = render(<OtlLogo decorative />);
    expect(container.querySelector("img")?.alt).toBe("");
  });
  it("livre au navigateur exactement le même fichier que la source commune aux exports", () => {
    const original = readFileSync("../shared/branding/otl-logo.jpg");
    const publicCopy = readFileSync("public/branding/otl-logo.jpg");
    expect(original.equals(publicCopy)).toBe(true);
    expect(createHash("sha256").update(original).digest("hex")).toBe(
      "023e725000d830e9f7df5994e795aede89baf599543f7256efd0b46f9a73c671",
    );
  });
  it("embarque aussi le logo intact dans le vrai GLB", () => {
    const bytes = readFileSync("public/models/truck.glb");
    const original = readFileSync("../shared/branding/otl-logo.jpg");
    expect(bytes.includes(original)).toBe(true);
  });
});
