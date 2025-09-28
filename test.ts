import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChefHat,
  Plus,
  X,
  RefreshCw,
  Save,
  Share2,
  Download,
  Trash2,
  Sparkles,
  ClipboardCopy,
  Upload,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --------------------------------------------
// Utility Types & Constants
// --------------------------------------------

type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten-free"
  | "dairy-free"
  | "keto"
  | "paleo"
  | "halal"
  | "kosher";

type Cuisine =
  | "American"
  | "Italian"
  | "Mexican"
  | "Indian"
  | "Chinese"
  | "Japanese"
  | "Thai"
  | "Mediterranean"
  | "French"
  | "Middle Eastern"
  | "Other";

type Recipe = {
  id: string;
  title: string;
  description: string;
  cuisine: Cuisine | "Fusion";
  servings: number;
  timeMinutes: number;
  dietary: DietaryTag[];
  ingredients: string[];
  steps: string[];
  tips?: string[];
  caloriesPerServing?: number;
};

const DEFAULT_TAGS: DietaryTag[] = [
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "vegan",
  "keto",
  "paleo",
  "halal",
  "kosher",
];

const FLAVOR_MAP: Record<Cuisine, string[]> = {
  American: ["smoky", "buttery", "peppery", "herbaceous"],
  Italian: ["garlicky", "herby", "umami", "tomato-forward"],
  Mexican: ["spicy", "citrusy", "smoky", "fresh"],
  Indian: ["aromatic", "spiced", "creamy", "tangy"],
  Chinese: ["savory", "gingery", "garlicky", "umami"],
  Japanese: ["umami", "clean", "miso", "sesame"],
  Thai: ["sweet-spicy", "coconut", "herbal", "tangy"],
  Mediterranean: ["lemony", "herby", "olive-forward", "bright"],
  French: ["buttery", "winey", "herbaceous", "delicate"],
  "Middle Eastern": ["warm-spiced", "tahini", "sumac", "herbal"],
  Other: ["balanced", "homey", "comforting", "fresh"],
};

const COOK_TECHNIQUES = [
  "sauté until fragrant",
  "roast until caramelized",
  "simmer gently",
  "sear on high heat",
  "braise until tender",
  "steam lightly",
  "grill for char",
  "stir-fry briskly",
] as const;

const TITLE_TEMPLATES = [
  "${cuisine} ${main} with ${accent}",
  "Weeknight ${main} ${style}",
  "One-Pan ${main} (${accent})",
  "Cozy ${cuisine} ${main}",
  "Bright ${accent} ${main}",
];

// --------------------------------------------
// Helpers
// --------------------------------------------

const titleCase = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function rand<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: readonly T[], n: number) {
  const copy = [...arr];
  const out: T[] = [];
  while (n-- > 0 && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function estCalories(ingredients: string[], servings: number) {
  // Rough heuristic improved: base per serving, adjust by density keywords
  const dense = [
    "cream",
    "cheese",
    "butter",
    "oil",
    "bacon",
    "nut",
    "peanut",
    "almond",
    "avocado",
    "coconut",
    "tahini",
  ];
  const lean = [
    "tomato",
    "spinach",
    "kale",
    "broccoli",
    "cabbage",
    "zucchini",
    "mushroom",
    "onion",
    "pepper",
    "herb",
    "lettuce",
  ];
  let perServing = 250; // base per serving
  for (const ing of ingredients) {
    const i = ing.toLowerCase();
    if (dense.some((k) => i.includes(k))) perServing += 35;
    if (lean.some((k) => i.includes(k))) perServing -= 8;
  }
  return Math.max(120, Math.round(perServing));
}

function constrainByDiet(ings: string[], dietary: DietaryTag[]): string[] {
  let out = ings.filter(Boolean);
  const removeIf = (substrs: string[]) =>
    (out = out.filter((x) => !substrs.some((s) => x.toLowerCase().includes(s))));
  if (dietary.includes("vegetarian") || dietary.includes("vegan"))
    removeIf(["chicken", "beef", "pork", "fish", "shrimp", "anchovy", "bacon", "salmon"]);
  if (dietary.includes("vegan")) removeIf(["cheese", "butter", "milk", "egg", "yogurt", "honey", "ghee"]);
  if (dietary.includes("gluten-free"))
    removeIf(["wheat", "pasta", "breadcrumbs", "farro", "barley", "bulgur", "soy sauce"]);
  if (dietary.includes("dairy-free")) removeIf(["cheese", "butte
